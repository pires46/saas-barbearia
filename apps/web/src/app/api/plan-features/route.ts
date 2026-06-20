import { NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";
import { getPlanFlags } from "@/lib/plan-features";
import { PLAN_FEATURE_DEFS, type PlanFeatureKey } from "@saas-barbearia/shared";

export async function GET() {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      plan: true,
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!tenant?.plan) {
    return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
  }

  const flags = getPlanFlags(tenant.plan);
  const subscription = tenant.subscriptions[0];

  const nav: { key: PlanFeatureKey; label: string; href: string; enabled: boolean }[] = (
    Object.keys(PLAN_FEATURE_DEFS) as PlanFeatureKey[]
  ).map((key) => ({
    key,
    label: PLAN_FEATURE_DEFS[key].label,
    href: PLAN_FEATURE_DEFS[key].route,
    enabled: flags[key],
  }));

  return NextResponse.json({
    plan: {
      id: tenant.plan.id,
      name: tenant.plan.name,
      slug: tenant.plan.slug,
      price: tenant.plan.price,
      maxBarbers: tenant.plan.maxBarbers,
      maxClients: tenant.plan.maxClients,
      trialDays: tenant.plan.trialDays,
    },
    flags,
    nav,
    subscription: subscription
      ? {
          status: subscription.status,
          nextBillingDate: subscription.nextBillingDate,
          trialEndsAt: subscription.status === "TRIAL" ? subscription.nextBillingDate : null,
        }
      : null,
  });
}
