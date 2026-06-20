"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getRouteFeatureKey } from "@saas-barbearia/shared";
import { usePlanFeatures } from "@/hooks/use-plan-features";

/** Bloqueia rotas sem recurso no plano e redireciona para assinatura */
export function PlanRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { data, loading, hasFeature } = usePlanFeatures();

  useEffect(() => {
    if (loading || !data) return;

    const feature = getRouteFeatureKey(pathname);
    if (!feature || feature === "dashboard") return;

    if (!hasFeature(feature)) {
      router.replace(`/assinatura?locked=${feature}`);
    }
  }, [pathname, loading, data, hasFeature, router]);

  return null;
}
