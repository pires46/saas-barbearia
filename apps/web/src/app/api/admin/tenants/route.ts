import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireAuth } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

async function requireSuperAdmin() {
  const { error, session } = await requireAuth();
  if (error) return { error, session: null };
  if (session!.role !== "SUPER_ADMIN") {
    return {
      error: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
      session: null,
    };
  }
  return { error: null, session };
}

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const search = req.nextUrl.searchParams.get("search") || "";
  const filter = req.nextUrl.searchParams.get("filter") || "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { slug: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (filter === "blocked") where.blocked = true;
  if (filter === "active") where.blocked = false;
  if (filter === "inactive") where.active = false;

  const tenants = await prisma.tenant.findMany({
    where,
    include: {
      plan: true,
      subscriptions: {
        where: { status: "ACTIVE" },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { clients: true, employees: true, appointments: true, users: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tenants);
}

export async function POST(req: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const body = await req.json();
  const { name, slug, email, phone, planId, adminName, adminPassword } = body;

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug já em uso" }, { status: 400 });
  }

  const tenant = await prisma.tenant.create({
    data: { name, slug, email, phone, planId },
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

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  const trialDays = plan?.trialDays ?? 14;
  const trialEnd = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      planId,
      status: "TRIAL",
      paymentMethod: "PIX",
      nextBillingDate: trialEnd,
    },
  });

  if (!adminPassword) {
    return NextResponse.json({ error: "Senha do administrador é obrigatória" }, { status: 400 });
  }

  const password = adminPassword;
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      password: hashed,
      name: adminName || name,
      role: "TENANT_ADMIN",
      tenantId: tenant.id,
    },
  });

  return NextResponse.json(tenant, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const body = await req.json();
  const { id, planId, blocked, active, ...rest } = body;

  const data: Record<string, unknown> = { ...rest };
  if (planId !== undefined) data.planId = planId;
  if (blocked !== undefined) data.blocked = blocked;
  if (active !== undefined) data.active = active;

  const tenant = await prisma.tenant.update({ where: { id }, data });
  return NextResponse.json(tenant);
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  await prisma.tenant.update({ where: { id }, data: { active: false, blocked: true } });
  return NextResponse.json({ success: true });
}
