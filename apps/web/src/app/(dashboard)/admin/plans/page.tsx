"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/sidebar";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@saas-barbearia/shared";
import { Check } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  maxBarbers: number;
  maxClients: number;
  features: string;
  active: boolean;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenantCounts, setTenantCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all([fetch("/api/admin"), fetch("/api/admin/tenants")]).then(async ([adminRes, tenantsRes]) => {
      if (adminRes.ok) {
        const admin = await adminRes.json();
        setPlans(admin.plans || []);
      }
      if (tenantsRes.ok) {
        const tenants = await tenantsRes.json();
        const counts: Record<string, number> = {};
        tenants.forEach((t: { plan: { name: string } }) => {
          counts[t.plan.name] = (counts[t.plan.name] || 0) + 1;
        });
        setTenantCounts(counts);
      }
    });
  }, []);

  return (
    <div>
      <PageHeader
        title="Planos"
        description="Planos de assinatura disponíveis para as barbearias"
      />

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const features = JSON.parse(plan.features || "[]") as string[];
          return (
            <Card key={plan.id} className={`relative ${plan.slug === "profissional" ? "border-accent" : ""}`}>
              {plan.slug === "profissional" && (
                <Badge variant="accent" className="absolute -top-2 right-4">Popular</Badge>
              )}
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <p className="text-3xl font-bold text-accent my-3">
                {formatCurrency(plan.price)}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
              {plan.description && (
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
              )}
              <div className="mb-4 text-sm text-muted-foreground">
                <p>Até {plan.maxBarbers} barbeiros</p>
                <p>Até {plan.maxClients} clientes</p>
                <p className="mt-2 font-medium text-foreground">
                  {tenantCounts[plan.name] || 0} barbearia(s) neste plano
                </p>
              </div>
              <ul className="space-y-2">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardTitle className="mb-3">Formas de pagamento suportadas</CardTitle>
        <div className="flex flex-wrap gap-2">
          {["Pix recorrente", "Cartão de crédito", "Boleto bancário"].map((m) => (
            <Badge key={m} variant="default">{m}</Badge>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Integração com gateway de pagamento (Asaas, Pagar.me) configurável em produção.
        </p>
      </Card>
    </div>
  );
}
