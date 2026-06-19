import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";

export async function GET() {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const sales = await prisma.sale.findMany({
    where: { tenantId },
    include: {
      client: { select: { name: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(sales);
}

export async function POST(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();
  const { clientId, items, paymentMethod, discount, notes, appointmentId } = body;

  const subtotal = items.reduce(
    (sum: number, item: { unitPrice: number; quantity: number }) =>
      sum + item.unitPrice * item.quantity,
    0
  );
  const total = subtotal - (discount || 0);

  const sale = await prisma.sale.create({
    data: {
      tenantId,
      clientId,
      appointmentId,
      subtotal,
      discount: discount || 0,
      total,
      paymentMethod,
      notes,
      items: {
        create: items.map(
          (item: {
            serviceId?: string;
            productId?: string;
            employeeId?: string;
            name: string;
            quantity: number;
            unitPrice: number;
            commission?: number;
          }) => ({
            serviceId: item.serviceId,
            productId: item.productId,
            employeeId: item.employeeId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.unitPrice * item.quantity,
            commission: item.commission || 0,
          })
        ),
      },
    },
    include: { items: true, client: true },
  });

  for (const item of items) {
    if (item.productId) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
      await prisma.inventoryMovement.create({
        data: {
          tenantId,
          productId: item.productId,
          type: "OUT",
          quantity: item.quantity,
          reason: `Venda #${sale.id.slice(-6)}`,
        },
      });
    }
  }

  if (clientId) {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        totalSpent: { increment: total },
        loyaltyPoints: { increment: Math.floor(total) },
      },
    });

    const program = await prisma.loyaltyProgram.findUnique({ where: { tenantId } });
    if (program?.cashbackPercent) {
      await prisma.loyaltyTransaction.create({
        data: {
          tenantId,
          clientId,
          type: "CASHBACK",
          points: Math.floor(total * (program.cashbackPercent / 100)),
          description: `Cashback ${program.cashbackPercent}% - Venda #${sale.id.slice(-6)}`,
        },
      });
    }
  }

  await prisma.financialEntry.create({
    data: {
      tenantId,
      type: "INCOME",
      category: "Vendas",
      description: `Venda #${sale.id.slice(-6)}`,
      amount: total,
      paymentMethod,
      saleId: sale.id,
    },
  });

  return NextResponse.json(sale, { status: 201 });
}
