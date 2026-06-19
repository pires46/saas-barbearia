import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/api-auth";
import { getAIPredictions, getAIPromotions } from "@/lib/services";
import { prisma } from "@saas-barbearia/database";

export async function GET() {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const [predictions, promotions, barberRanking] = await Promise.all([
    getAIPredictions(tenantId),
    getAIPromotions(tenantId),
    prisma.employee.findMany({
      where: { tenantId, active: true, role: "BARBER" },
      orderBy: { rating: "desc" },
      select: { id: true, name: true, rating: true, totalReviews: true },
    }),
  ]);

  return NextResponse.json({ predictions, promotions, barberRanking });
}
