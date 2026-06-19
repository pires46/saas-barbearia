import { NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { verifyCronSecret } from "@/lib/cron-auth";
import { logAudit } from "@/lib/audit";
import { isAsaasConfigured, createAsaasCustomer, createAsaasPayment } from "@/lib/asaas";
import { sendInvoiceEmail } from "@/lib/email";

export async function GET(req: Request) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const now = new Date();
  let blocked = 0;
  let invoicesCreated = 0;
  let markedOverdue = 0;

  const overdueInvoices = await prisma.invoice.findMany({
    where: { status: "PENDING", dueDate: { lt: now } },
    include: { tenant: true },
  });

  for (const invoice of overdueInvoices) {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "OVERDUE" } });
    await prisma.tenant.update({ where: { id: invoice.tenantId }, data: { blocked: true } });
    await prisma.subscription.updateMany({
      where: { tenantId: invoice.tenantId, status: "ACTIVE" },
      data: { status: "PAST_DUE" },
    });
    markedOverdue++;
    blocked++;
  }

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIAL"] },
      nextBillingDate: { lte: now },
    },
    include: { tenant: true, plan: true },
  });

  for (const sub of subscriptions) {
    const existing = await prisma.invoice.findFirst({
      where: {
        tenantId: sub.tenantId,
        status: { in: ["PENDING", "OVERDUE"] },
        dueDate: { gte: now },
      },
    });
    if (existing) continue;

    const dueDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    let asaasPaymentId: string | undefined;
    let paymentUrl: string | undefined;
    let pixCode: string | undefined;

    if (isAsaasConfigured()) {
      try {
        let customerId = sub.tenant.asaasCustomerId;
        if (!customerId) {
          const customer = await createAsaasCustomer({
            name: sub.tenant.name,
            email: sub.tenant.email,
            phone: sub.tenant.phone || undefined,
            externalReference: sub.tenant.id,
          });
          customerId = customer.id;
          await prisma.tenant.update({
            where: { id: sub.tenantId },
            data: { asaasCustomerId: customerId },
          });
        }

        if (!customerId) continue;

        const payment = await createAsaasPayment({
          customerId,
          value: sub.plan.price,
          dueDate: dueDate.toISOString().slice(0, 10),
          description: `Assinatura ${sub.plan.name} — ${sub.tenant.name}`,
          externalReference: sub.id,
        });

        asaasPaymentId = payment.id;
        paymentUrl = payment.invoiceUrl || payment.bankSlipUrl;
        pixCode = payment.pixQrCode || payment.pixCopiaECola;
      } catch (err) {
        console.error("[billing cron asaas]", err);
      }
    }

    const invoice = await prisma.invoice.create({
      data: {
        tenantId: sub.tenantId,
        subscriptionId: sub.id,
        amount: sub.plan.price,
        status: "PENDING",
        dueDate,
        asaasPaymentId,
        paymentUrl,
        pixCode,
      },
    });

    if (sub.tenant.email) {
      await sendInvoiceEmail(sub.tenant.email, sub.tenant.name, sub.plan.price, paymentUrl);
    }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        nextBillingDate: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
        status: sub.status === "TRIAL" ? "ACTIVE" : sub.status,
      },
    });

    invoicesCreated++;
    await logAudit({
      action: "INVOICE_CREATED",
      tenantId: sub.tenantId,
      entity: "Invoice",
      entityId: invoice.id,
      metadata: { amount: sub.plan.price },
    });
  }

  return NextResponse.json({ ok: true, markedOverdue, blocked, invoicesCreated });
}

export async function POST(req: Request) {
  return GET(req);
}
