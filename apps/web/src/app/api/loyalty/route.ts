import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";

export async function GET() {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const [program, transactions, topClients] = await Promise.all([
    prisma.loyaltyProgram.findUnique({ where: { tenantId } }),
    prisma.loyaltyTransaction.findMany({
      where: { tenantId },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.client.findMany({
      where: { tenantId, active: true },
      orderBy: { loyaltyPoints: "desc" },
      take: 10,
      select: { id: true, name: true, loyaltyPoints: true, visitCount: true },
    }),
  ]);

  return NextResponse.json({ program, transactions, topClients });
}

export async function POST(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();

  if (body.type === "redeem") {
    const client = await prisma.client.findFirst({ where: { id: body.clientId, tenantId } });
    if (!client || client.loyaltyPoints < body.points) {
      return NextResponse.json({ error: "Pontos insuficientes" }, { status: 400 });
    }

    await prisma.client.update({
      where: { id: body.clientId },
      data: { loyaltyPoints: { decrement: body.points } },
    });

    const transaction = await prisma.loyaltyTransaction.create({
      data: {
        tenantId,
        clientId: body.clientId,
        type: "REDEEM",
        points: -body.points,
        description: body.description || "Resgate de pontos",
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  }

  const program = await prisma.loyaltyProgram.update({
    where: { tenantId },
    data: body,
  });

  return NextResponse.json(program);
}
