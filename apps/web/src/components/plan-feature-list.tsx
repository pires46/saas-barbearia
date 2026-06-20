"use client";

import {
  PLAN_FEATURE_DEFS,
  featureListForDisplay,
  parsePlanFeatureFlags,
  type PlanFeatureFlags,
} from "@saas-barbearia/shared";
import { Check, Lock } from "lucide-react";

export function PlanFeatureList({
  flags,
  slug,
  compact,
}: {
  flags?: PlanFeatureFlags;
  slug?: string;
  compact?: boolean;
}) {
  const parsed = flags ?? parsePlanFeatureFlags("{}", slug);
  const items = featureListForDisplay(parsed);

  return (
    <ul className={compact ? "space-y-1.5" : "space-y-2"}>
      {items.map(({ key, label, included }) => (
        <li key={key} className="flex items-center gap-2 text-sm">
          {included ? (
            <Check className="h-4 w-4 shrink-0 text-green-500" />
          ) : (
            <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className={included ? "" : "text-muted-foreground line-through decoration-muted-foreground/50"}>
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function planFeatureLabel(key: string): string {
  if (key in PLAN_FEATURE_DEFS) {
    return PLAN_FEATURE_DEFS[key as keyof typeof PLAN_FEATURE_DEFS].label;
  }
  return key;
}
