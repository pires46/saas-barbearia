"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/sidebar";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlanFeatureList } from "@/components/plan-feature-list";
import { formatCurrency } from "@saas-barbearia/shared";
import type { PlanFeatureFlags, PlanFeatureKey } from "@saas-barbearia/shared";
import { Save, Clock, Lock, Check } from "lucide-react";
import { PLAN_FEATURE_DEFS } from "@saas-barbearia/shared";

type PlanRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  maxBarbers: number;
  maxClients: number;
  trialDays: number;
  active: boolean;
  tenantCount: number;
  flags: PlanFeatureFlags;
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [featureKeys, setFeatureKeys] = useState<PlanFeatureKey[]>([]);
  const [trialOptions, setTrialOptions] = useState<number[]>([7, 15, 30]);
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<PlanRow>>>({});

  const load = () =>
    fetch("/api/admin/plans")
      .then((r) => r.json())
      .then((d) => {
        setPlans(d.plans || []);
        setFeatureKeys(d.featureKeys || []);
        setTrialOptions(d.trialOptions || [7, 15, 30]);
      });

  useEffect(() => {
    load();
  }, []);

  const getDraft = (plan: PlanRow) => ({
    ...plan,
    ...drafts[plan.id],
    flags: { ...plan.flags, ...(drafts[plan.id]?.flags as PlanFeatureFlags | undefined) },
  });

  const updateDraft = (id: string, patch: Partial<PlanRow>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const toggleFlag = (plan: PlanRow, key: PlanFeatureKey) => {
    const d = getDraft(plan);
    updateDraft(plan.id, {
      flags: { ...d.flags, [key]: !d.flags[key] },
    });
  };

  const save = async (plan: PlanRow) => {
    const d = getDraft(plan);
    setSaving(plan.id);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: plan.id,
          name: d.name,
          description: d.description,
          price: d.price,
          maxBarbers: d.maxBarbers,
          maxClients: d.maxClients,
          trialDays: d.trialDays,
          flags: d.flags,
          active: d.active,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[plan.id];
        return next;
      });
      await load();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Planos"
        description="Configure recursos, limites e período de teste (7, 15 ou 30 dias) por plano"
      />

      <div className="grid gap-6 xl:grid-cols-3">
        {plans.map((plan) => {
          const d = getDraft(plan);
          const dirty = Boolean(drafts[plan.id]);

          return (
            <Card
              key={plan.id}
              className={`relative ${plan.slug === "profissional" ? "border-accent" : ""}`}
            >
              {plan.slug === "profissional" && (
                <Badge variant="accent" className="absolute -top-2 right-4">
                  Popular
                </Badge>
              )}

              <CardTitle className="mb-3 text-xl">{d.name}</CardTitle>

              <div className="mb-4 space-y-2">
                <Input
                  value={d.name}
                  onChange={(e) => updateDraft(plan.id, { name: e.target.value })}
                  placeholder="Nome do plano"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={d.price}
                  onChange={(e) => updateDraft(plan.id, { price: Number(e.target.value) })}
                  placeholder="Preço"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    value={d.maxBarbers}
                    onChange={(e) => updateDraft(plan.id, { maxBarbers: Number(e.target.value) })}
                    placeholder="Max barbeiros"
                  />
                  <Input
                    type="number"
                    value={d.maxClients}
                    onChange={(e) => updateDraft(plan.id, { maxClients: Number(e.target.value) })}
                    placeholder="Max clientes"
                  />
                </div>
              </div>

              <div className="mb-4">
                <p className="mb-2 flex items-center gap-1 text-sm font-medium">
                  <Clock className="h-4 w-4" /> Período de teste
                </p>
                <div className="flex gap-2">
                  {trialOptions.map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => updateDraft(plan.id, { trialDays: days })}
                      className={`flex-1 rounded-lg border px-2 py-2 text-sm transition-colors ${
                        d.trialDays === days
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border hover:bg-secondary"
                      }`}
                    >
                      {days} dias
                    </button>
                  ))}
                </div>
              </div>

              <p className="mb-2 text-sm font-medium">Recursos incluídos</p>
              <div className="mb-4 space-y-1.5">
                {featureKeys.map((key) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-secondary/50"
                  >
                    <input
                      type="checkbox"
                      checked={d.flags[key]}
                      onChange={() => toggleFlag(plan, key)}
                    />
                    {d.flags[key] ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className={d.flags[key] ? "" : "text-muted-foreground"}>
                      {PLAN_FEATURE_DEFS[key].label}
                    </span>
                  </label>
                ))}
              </div>

              <PlanFeatureList flags={d.flags} slug={plan.slug} compact />

              <p className="mt-4 text-xs text-muted-foreground">
                {plan.tenantCount} barbearia(s) neste plano
              </p>

              <Button
                variant="accent"
                size="sm"
                className="mt-4 w-full"
                disabled={!dirty || saving === plan.id}
                onClick={() => save(plan)}
              >
                <Save className="h-4 w-4" />
                {saving === plan.id ? "Salvando..." : "Salvar plano"}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
