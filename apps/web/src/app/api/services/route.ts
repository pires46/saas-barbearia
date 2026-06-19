import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";

export async function GET() {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const services = await prisma.service.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();
  const service = await prisma.service.create({
    data: { tenantId, ...body },
  });
  return NextResponse.json(service, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;

  const body = await req.json();
  const { id, ...data } = body;
  const service = await prisma.service.update({ where: { id }, data });
  return NextResponse.json(service);
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireTenant();
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  await prisma.service.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
