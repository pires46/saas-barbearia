import { NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { parsePlanFeatureFlags } from "@saas-barbearia/shared";

export async function GET() {
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { price: "asc" },
  });

  return NextResponse.json(
    plans.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      description: p.description,
      maxBarbers: p.maxBarbers,
      maxClients: p.maxClients,
      trialDays: p.trialDays,
      flags: parsePlanFeatureFlags(p.featureFlags, p.slug),
    }))
  );
}
