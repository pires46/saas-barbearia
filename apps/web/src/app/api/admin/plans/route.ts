import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireAuth } from "@/lib/api-auth";
import {
  PLAN_FEATURE_KEYS,
  TRIAL_DAY_OPTIONS,
  serializePlanFeatureFlags,
  featureListForDisplay,
  parsePlanFeatureFlags,
  type PlanFeatureFlags,
  type PlanFeatureKey,
} from "@saas-barbearia/shared";
import { normalizeTrialDays } from "@/lib/plan-features";

async function requireSuperAdmin() {
  const { error, session } = await requireAuth();
  if (error) return { error, session: null };
  if (session!.role !== "SUPER_ADMIN") {
    return {
      error: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
      session: null,
    };
  }
  return { error: null, session };
}

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const plans = await prisma.plan.findMany({ orderBy: { price: "asc" } });
  const counts = await prisma.tenant.groupBy({
    by: ["planId"],
    _count: { planId: true },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.planId, c._count.planId]));

  return NextResponse.json({
    plans: plans.map((p) => ({
      ...p,
      tenantCount: countMap[p.id] || 0,
      flags: parsePlanFeatureFlags(p.featureFlags, p.slug),
    })),
    trialOptions: TRIAL_DAY_OPTIONS,
    featureKeys: PLAN_FEATURE_KEYS.filter((k) => k !== "dashboard"),
  });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const body = await req.json();
  const { id, name, description, price, maxBarbers, maxClients, trialDays, flags, active } = body;

  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const existing = await prisma.plan.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (price !== undefined) data.price = Number(price);
  if (maxBarbers !== undefined) data.maxBarbers = Number(maxBarbers);
  if (maxClients !== undefined) data.maxClients = Number(maxClients);
  if (active !== undefined) data.active = Boolean(active);

  if (trialDays !== undefined) {
    const normalized = normalizeTrialDays(Number(trialDays));
    if (!TRIAL_DAY_OPTIONS.includes(normalized)) {
      return NextResponse.json({ error: "Trial deve ser 7, 15 ou 30 dias" }, { status: 400 });
    }
    data.trialDays = normalized;
  }

  if (flags !== undefined) {
    const current = parsePlanFeatureFlags(existing.featureFlags, existing.slug);
    const merged: PlanFeatureFlags = { ...current };
    for (const key of PLAN_FEATURE_KEYS) {
      if (flags[key] !== undefined) merged[key as PlanFeatureKey] = Boolean(flags[key]);
    }
    merged.dashboard = true;
    data.featureFlags = serializePlanFeatureFlags(merged);
    data.features = JSON.stringify(
      featureListForDisplay(merged)
        .filter((f) => f.included)
        .map((f) => f.label)
    );
  }

  const plan = await prisma.plan.update({ where: { id }, data });
  return NextResponse.json({
    ...plan,
    flags: parsePlanFeatureFlags(plan.featureFlags, plan.slug),
  });
}
