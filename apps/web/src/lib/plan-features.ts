import {
  parsePlanFeatureFlags,
  planIncludesFeature,
  type PlanFeatureKey,
  type PlanFeatureFlags,
} from "@saas-barbearia/shared";

export type PlanWithFlags = {
  id: string;
  name: string;
  slug: string;
  price: number;
  maxBarbers: number;
  maxClients: number;
  trialDays: number;
  featureFlags: string;
  features?: string;
};

export function getPlanFlags(plan: Pick<PlanWithFlags, "featureFlags" | "slug">): PlanFeatureFlags {
  return parsePlanFeatureFlags(plan.featureFlags, plan.slug);
}

export function tenantHasFeature(
  plan: Pick<PlanWithFlags, "featureFlags" | "slug"> | null | undefined,
  key: PlanFeatureKey
): boolean {
  if (!plan) return key === "dashboard" || key === "agenda" || key === "clientes";
  return planIncludesFeature(getPlanFlags(plan), key);
}

export function normalizeTrialDays(days: number): 7 | 15 | 30 {
  if (days <= 7) return 7;
  if (days <= 15) return 15;
  return 30;
}
