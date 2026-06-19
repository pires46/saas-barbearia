import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const type = req.nextUrl.searchParams.get("type");
  const month = req.nextUrl.searchParams.get("month");

  if (type === "report") {
    const now = month ? new Date(month) : new Date();
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);

    const income = await prisma.financialEntry.aggregate({
      where: { tenantId, type: "INCOME", date: { gte: mStart, lte: mEnd } },
      _sum: { amount: true },
    });

    const expenses = await prisma.financialEntry.aggregate({
      where: { tenantId, type: "EXPENSE", date: { gte: mStart, lte: mEnd } },
      _sum: { amount: true },
    });

    const salesRevenue = await prisma.sale.aggregate({
      where: { tenantId, createdAt: { gte: mStart, lte: mEnd }, status: "COMPLETED" },
      _sum: { total: true },
    });

    const totalIncome = (income._sum.amount || 0) + (salesRevenue._sum.total || 0);
    const totalExpenses = expenses._sum.amount || 0;

    const monthlyComparison = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const s = startOfMonth(d);
      const e = endOfMonth(d);
      const [inc, exp, sal] = await Promise.all([
        prisma.financialEntry.aggregate({
          where: { tenantId, type: "INCOME", date: { gte: s, lte: e } },
          _sum: { amount: true },
        }),
        prisma.financialEntry.aggregate({
          where: { tenantId, type: "EXPENSE", date: { gte: s, lte: e } },
          _sum: { amount: true },
        }),
        prisma.sale.aggregate({
          where: { tenantId, createdAt: { gte: s, lte: e }, status: "COMPLETED" },
          _sum: { total: true },
        }),
      ]);
      const totalInc = (inc._sum.amount || 0) + (sal._sum.total || 0);
      monthlyComparison.push({
        month: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        income: totalInc,
        expenses: exp._sum.amount || 0,
        profit: totalInc - (exp._sum.amount || 0),
      });
    }

    return NextResponse.json({
      grossProfit: totalIncome,
      netProfit: totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
      monthlyComparison,
    });
  }

  const entries = await prisma.financialEntry.findMany({
    where: { tenantId },
    orderBy: { date: "desc" },
    take: 100,
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();
  const entry = await prisma.financialEntry.create({
    data: {
      tenantId,
      type: body.type,
      category: body.category,
      description: body.description,
      amount: body.amount,
      date: body.date ? new Date(body.date) : new Date(),
      paymentMethod: body.paymentMethod,
      recurring: body.recurring || false,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireTenant();
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  await prisma.financialEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
