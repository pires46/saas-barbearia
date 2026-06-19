import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const { name, phone, email } = body;

  if (!name || !phone) {
    return NextResponse.json({ error: "Nome e telefone são obrigatórios" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.blocked || !tenant.active) {
    return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  }

  let client = await prisma.client.findFirst({
    where: { tenantId: tenant.id, phone },
  });

  if (!client) {
    client = await prisma.client.create({
      data: { tenantId: tenant.id, name, phone, email },
    });
  } else if (client.name !== name) {
    client = await prisma.client.update({
      where: { id: client.id },
      data: { name, ...(email ? { email } : {}) },
    });
  }

  return NextResponse.json({
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    client,
  });
}
