import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const token = process.env.ASAAS_WEBHOOK_TOKEN;
  if (token && req.headers.get("asaas-access-token") !== token) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const event = body.event as string;
  const payment = body.payment;

  if (!payment?.id) {
    return NextResponse.json({ received: true });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { asaasPaymentId: payment.id },
    include: { tenant: true },
  });

  if (!invoice) {
    return NextResponse.json({ received: true });
  }

  if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    await prisma.tenant.update({
      where: { id: invoice.tenantId },
      data: { blocked: false },
    });

    await prisma.subscription.updateMany({
      where: { tenantId: invoice.tenantId },
      data: { status: "ACTIVE" },
    });

    await logAudit({
      action: "PAYMENT_RECEIVED",
      tenantId: invoice.tenantId,
      entity: "Invoice",
      entityId: invoice.id,
      metadata: { event, asaasPaymentId: payment.id },
    });
  }

  if (event === "PAYMENT_OVERDUE") {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "OVERDUE" } });
    await prisma.tenant.update({ where: { id: invoice.tenantId }, data: { blocked: true } });
  }

  return NextResponse.json({ received: true });
}
