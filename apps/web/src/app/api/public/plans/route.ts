import { NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";

export async function GET() {
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { price: "asc" },
    select: { id: true, name: true, slug: true, price: true, description: true, maxBarbers: true },
  });
  return NextResponse.json(plans);
}
