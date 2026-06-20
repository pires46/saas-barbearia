"use client";

import { useEffect, useState } from "react";
import type { PlanFeatureFlags, PlanFeatureKey } from "@saas-barbearia/shared";

type PlanFeaturesData = {
  plan: { id: string; name: string; slug: string; price: number; trialDays: number };
  flags: PlanFeatureFlags;
  nav: { key: PlanFeatureKey; label: string; href: string; enabled: boolean }[];
  subscription: { status: string; trialEndsAt: string | null } | null;
};

export function usePlanFeatures() {
  const [data, setData] = useState<PlanFeaturesData | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    return fetch("/api/plan-features")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  const hasFeature = (key: PlanFeatureKey) => data?.flags[key] === true;

  return { data, loading, hasFeature, reload };
}
