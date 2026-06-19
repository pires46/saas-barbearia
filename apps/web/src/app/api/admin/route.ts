import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;
  if (session!.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const [tenants, plans, stats, mrrData] = await Promise.all([
    prisma.tenant.findMany({
      include: {
        plan: true,
        subscriptions: { where: { status: "ACTIVE" }, take: 1 },
        _count: { select: { clients: true, employees: true, appointments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findMany({ orderBy: { price: "asc" } }),
    Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { blocked: true } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.invoice.aggregate({
        where: { status: "PAID", paidAt: { gte: new Date(new Date().setDate(1)) } },
        _sum: { amount: true },
      }),
    ]),
    prisma.subscription.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      include: { plan: true },
    }),
  ]);

  const mrr = mrrData.reduce((sum, s) => sum + s.plan.price, 0);
  const trialCount = mrrData.filter((s) => s.status === "TRIAL").length;

  return NextResponse.json({
    tenants,
    plans,
    stats: {
      totalTenants: stats[0],
      blockedTenants: stats[1],
      activeSubscriptions: stats[2],
      monthlyRevenue: stats[3]._sum.amount || 0,
      mrr,
      trialCount,
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

  if (body.type === "tenant") {
    const tenant = await prisma.tenant.create({
      data: {
        name: body.name,
        slug: body.slug,
        email: body.email,
        phone: body.phone,
        planId: body.planId,
      },
    });

    await prisma.tenantSettings.create({ data: { tenantId: tenant.id } });
    await prisma.loyaltyProgram.create({ data: { tenantId: tenant.id } });

    for (let d = 0; d < 7; d++) {
      await prisma.businessHour.create({
        data: {
          tenantId: tenant.id,
          dayOfWeek: d,
          openTime: "09:00",
          closeTime: "19:00",
          closed: d === 0,
        },
      });
    }

    return NextResponse.json(tenant, { status: 201 });
  }

  if (body.type === "block") {
    const tenant = await prisma.tenant.update({
      where: { id: body.tenantId },
      data: { blocked: body.blocked },
    });
    return NextResponse.json(tenant);
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

  if (body.type === "invoice") {
    const invoice = await prisma.invoice.update({
      where: { id: body.id },
      data: { status: "PAID", paidAt: new Date() },
    });
    return NextResponse.json(invoice);
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}
