import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";
import { isAsaasConfigured, createAsaasCustomer, createAsaasPayment } from "@/lib/asaas";
import { logAudit } from "@/lib/audit";
import { parsePlanFeatureFlags } from "@saas-barbearia/shared";

export async function GET() {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const [tenant, subscription, invoices, plans] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, include: { plan: true } }),
    prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { plan: true },
    }),
    prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.plan.findMany({ where: { active: true }, orderBy: { price: "asc" } }),
  ]);

  const plansWithFlags = plans.map((p) => ({
    ...p,
    flags: parsePlanFeatureFlags(p.featureFlags, p.slug),
  }));

  return NextResponse.json({
    tenant,
    subscription,
    invoices,
    plans: plansWithFlags,
    asaasConfigured: isAsaasConfigured(),
    blocked: tenant?.blocked,
  });
}

export async function POST(req: NextRequest) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();

  if (body.type === "change-plan") {
    const plan = await prisma.plan.findUnique({ where: { id: body.planId } });
    if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });

    await prisma.tenant.update({ where: { id: tenantId }, data: { planId: plan.id } });
    await prisma.subscription.updateMany({
      where: { tenantId, status: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] } },
      data: { planId: plan.id },
    });

    await logAudit({
      action: "PLAN_CHANGED",
      userId: session?.id,
      tenantId,
      metadata: { planId: plan.id, planName: plan.name },
    });

    return NextResponse.json({ success: true, plan });
  }

  if (body.type === "pay-invoice") {
    const invoice = await prisma.invoice.findFirst({
      where: { id: body.invoiceId, tenantId },
      include: { tenant: true },
    });
    if (!invoice) return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });

    if (invoice.paymentUrl) {
      return NextResponse.json({ paymentUrl: invoice.paymentUrl, pixCode: invoice.pixCode });
    }

    if (!isAsaasConfigured()) {
      return NextResponse.json({ error: "Gateway de pagamento não configurado" }, { status: 503 });
    }

    let customerId = invoice.tenant.asaasCustomerId;
    if (!customerId) {
      const customer = await createAsaasCustomer({
        name: invoice.tenant.name,
        email: invoice.tenant.email,
        phone: invoice.tenant.phone || undefined,
        externalReference: invoice.tenant.id,
      });
      customerId = customer.id;
      await prisma.tenant.update({ where: { id: tenantId }, data: { asaasCustomerId: customerId } });
    }

    if (!customerId) {
      return NextResponse.json({ error: "Erro ao criar cliente no gateway" }, { status: 500 });
    }

    const payment = await createAsaasPayment({
      customerId,
      value: invoice.amount,
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      description: `Fatura BarberSaaS — ${invoice.tenant.name}`,
      externalReference: invoice.id,
    });

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        asaasPaymentId: payment.id,
        paymentUrl: payment.invoiceUrl || payment.bankSlipUrl,
        pixCode: payment.pixQrCode || payment.pixCopiaECola,
      },
    });

    return NextResponse.json({
      paymentUrl: updated.paymentUrl,
      pixCode: updated.pixCode,
    });
  }

  if (body.type === "complete-onboarding") {
    await prisma.tenant.update({ where: { id: tenantId }, data: { onboardingDone: true } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}
