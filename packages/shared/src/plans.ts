/** Recursos do painel mapeados por rota */
export const PLAN_FEATURE_DEFS = {
  dashboard: { label: "Dashboard", route: "/dashboard", group: "core" },
  agenda: { label: "Agenda", route: "/agenda", group: "core" },
  clientes: { label: "Clientes", route: "/clientes", group: "core" },
  servicos: { label: "Serviços", route: "/servicos", group: "core" },
  funcionarios: { label: "Funcionários", route: "/funcionarios", group: "core" },
  financeiro: { label: "Financeiro", route: "/financeiro", group: "pro" },
  estoque: { label: "Estoque", route: "/estoque", group: "pro" },
  vendas: { label: "Vendas", route: "/vendas", group: "pro" },
  whatsapp: { label: "WhatsApp", route: "/whatsapp", group: "pro" },
  fidelidade: { label: "Fidelidade", route: "/fidelidade", group: "pro" },
  ia: { label: "IA & Insights", route: "/ia", group: "premium" },
} as const;

export type PlanFeatureKey = keyof typeof PLAN_FEATURE_DEFS;

export const PLAN_FEATURE_KEYS = Object.keys(PLAN_FEATURE_DEFS) as PlanFeatureKey[];

export type PlanFeatureFlags = Record<PlanFeatureKey, boolean>;

export const TRIAL_DAY_OPTIONS = [7, 15, 30] as const;
export type TrialDays = (typeof TRIAL_DAY_OPTIONS)[number];

/** Flags padrão por slug — usado no seed e fallback */
export const DEFAULT_PLAN_CONFIG: Record<
  string,
  { trialDays: TrialDays; flags: PlanFeatureFlags; maxBarbers: number; maxClients: number }
> = {
  basico: {
    trialDays: 7,
    maxBarbers: 2,
    maxClients: 200,
    flags: {
      dashboard: true,
      agenda: true,
      clientes: true,
      servicos: true,
      funcionarios: true,
      financeiro: false,
      estoque: false,
      vendas: false,
      whatsapp: false,
      fidelidade: false,
      ia: false,
    },
  },
  profissional: {
    trialDays: 15,
    maxBarbers: 5,
    maxClients: 1000,
    flags: {
      dashboard: true,
      agenda: true,
      clientes: true,
      servicos: true,
      funcionarios: true,
      financeiro: true,
      estoque: true,
      vendas: true,
      whatsapp: true,
      fidelidade: true,
      ia: false,
    },
  },
  premium: {
    trialDays: 30,
    maxBarbers: 20,
    maxClients: 10000,
    flags: {
      dashboard: true,
      agenda: true,
      clientes: true,
      servicos: true,
      funcionarios: true,
      financeiro: true,
      estoque: true,
      vendas: true,
      whatsapp: true,
      fidelidade: true,
      ia: true,
    },
  },
};

export function parsePlanFeatureFlags(raw: string | null | undefined, slug?: string): PlanFeatureFlags {
  const fallback = slug ? DEFAULT_PLAN_CONFIG[slug]?.flags : undefined;
  const base: PlanFeatureFlags = fallback
    ? { ...fallback }
    : {
        dashboard: true,
        agenda: true,
        clientes: true,
        servicos: true,
        funcionarios: true,
        financeiro: false,
        estoque: false,
        vendas: false,
        whatsapp: false,
        fidelidade: false,
        ia: false,
      };

  if (!raw || raw.trim() === "" || raw === "[]") return base;

  try {
    const parsed = JSON.parse(raw) as Partial<PlanFeatureFlags>;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return { ...base, ...parsed };
    }
  } catch {
    /* legacy features array — ignore */
  }

  return base;
}

export function serializePlanFeatureFlags(flags: PlanFeatureFlags): string {
  return JSON.stringify(flags);
}

export function getRouteFeatureKey(pathname: string): PlanFeatureKey | null {
  if (pathname === "/dashboard") return "dashboard";
  for (const key of PLAN_FEATURE_KEYS) {
    const route = PLAN_FEATURE_DEFS[key].route;
    if (route !== "/dashboard" && (pathname === route || pathname.startsWith(route + "/"))) {
      return key;
    }
  }
  return null;
}

export function planIncludesFeature(flags: PlanFeatureFlags, key: PlanFeatureKey): boolean {
  return flags[key] === true;
}

export function featureListForDisplay(flags: PlanFeatureFlags): { key: PlanFeatureKey; label: string; included: boolean }[] {
  return PLAN_FEATURE_KEYS.filter((k) => k !== "dashboard").map((key) => ({
    key,
    label: PLAN_FEATURE_DEFS[key].label,
    included: flags[key],
  }));
}
