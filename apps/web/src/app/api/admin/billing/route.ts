import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;
  if (session!.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const invoices = await prisma.invoice.findMany({
    include: {
      tenant: { select: { name: true, slug: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const subscriptions = await prisma.subscription.findMany({
    include: {
      tenant: { select: { name: true, slug: true } },
      plan: { select: { name: true, price: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const stats = {
    pending: await prisma.invoice.count({ where: { status: "PENDING" } }),
    overdue: await prisma.invoice.count({ where: { status: "OVERDUE" } }),
    paid: await prisma.invoice.aggregate({
      where: { status: "PAID", paidAt: { gte: new Date(new Date().setDate(1)) } },
      _sum: { amount: true },
    }),
  };

  return NextResponse.json({
    invoices,
    subscriptions,
    stats: {
      pending: stats.pending,
      overdue: stats.overdue,
      monthlyPaid: stats.paid._sum.amount || 0,
    },
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;
  if (session!.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json();

  if (body.type === "invoice") {
    const invoice = await prisma.invoice.create({
      data: {
        tenantId: body.tenantId,
        amount: body.amount,
        dueDate: new Date(body.dueDate),
        status: "PENDING",
      },
    });
    return NextResponse.json(invoice, { status: 201 });
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;
  if (session!.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json();
  const invoice = await prisma.invoice.update({
    where: { id: body.id },
    data: {
      status: body.status,
      paidAt: body.status === "PAID" ? new Date() : null,
    },
  });

  if (body.status === "OVERDUE") {
    await prisma.tenant.update({
      where: { id: invoice.tenantId },
      data: { blocked: true },
    });
  }

  return NextResponse.json(invoice);
}
