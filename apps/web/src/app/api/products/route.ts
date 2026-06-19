import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";

export async function GET() {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const products = await prisma.product.findMany({
    where: { tenantId },
    include: {
      movements: { take: 5, orderBy: { createdAt: "desc" } },
    },
    orderBy: { name: "asc" },
  });

  const lowStock = products.filter((p) => p.stock <= p.minStock);

  return NextResponse.json({ products, lowStock });
}

export async function POST(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();

  if (body.type === "movement") {
    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });

    const newStock =
      body.movementType === "IN"
        ? product.stock + body.quantity
        : product.stock - body.quantity;

    await prisma.product.update({
      where: { id: body.productId },
      data: { stock: Math.max(0, newStock) },
    });

    const movement = await prisma.inventoryMovement.create({
      data: {
        tenantId,
        productId: body.productId,
        type: body.movementType,
        quantity: body.quantity,
        reason: body.reason,
      },
    });

    return NextResponse.json(movement, { status: 201 });
  }

  const product = await prisma.product.create({
    data: { tenantId, ...body },
  });
  return NextResponse.json(product, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireTenant();
  if (error) return error;

  const body = await req.json();
  const { id, ...data } = body;
  const product = await prisma.product.update({ where: { id }, data });
  return NextResponse.json(product);
}
