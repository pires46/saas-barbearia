import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";
import { subDays } from "date-fns";

export async function GET(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const filter = req.nextUrl.searchParams.get("filter");
  const search = req.nextUrl.searchParams.get("search");

  let where: Record<string, unknown> = { tenantId, active: true };

  if (search) {
    where = {
      ...where,
      OR: [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ],
    };
  }

  if (filter === "vip") where.vip = true;
  if (filter === "inactive") {
    where.lastVisit = { lt: subDays(new Date(), 60) };
  }
  if (filter === "birthday") {
    const now = new Date();
    const clients = await prisma.client.findMany({
      where: { tenantId, active: true },
      include: {
        appointments: {
          take: 5,
          orderBy: { startTime: "desc" },
          include: { service: true, employee: true },
        },
        sales: { take: 5, orderBy: { createdAt: "desc" } },
      },
      orderBy: { name: "asc" },
    });
    const birthdayClients = clients.filter((c) => {
      if (!c.birthDate) return false;
      return c.birthDate.getMonth() === now.getMonth();
    });
    return NextResponse.json(birthdayClients);
  }

  const clients = await prisma.client.findMany({
    where,
    include: {
      appointments: {
        take: 5,
        orderBy: { startTime: "desc" },
        include: { service: true, employee: true },
      },
      sales: { take: 5, orderBy: { createdAt: "desc" } },
    },
    orderBy: filter === "ranking" ? { totalSpent: "desc" } : { name: "asc" },
    take: filter === "ranking" ? 10 : undefined,
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();
  const client = await prisma.client.create({
    data: {
      tenantId,
      name: body.name,
      phone: body.phone,
      email: body.email,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      photo: body.photo,
      notes: body.notes,
      vip: body.vip || false,
    },
  });

  return NextResponse.json(client, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();
  const { id, ...data } = body;
  if (data.birthDate) data.birthDate = new Date(data.birthDate);

  const client = await prisma.client.update({ where: { id }, data });
  return NextResponse.json(client);
}

export async function DELETE(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  await prisma.client.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
