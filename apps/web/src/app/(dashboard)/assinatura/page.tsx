"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@saas-barbearia/shared";
import { CreditCard, ExternalLink } from "lucide-react";

export default function AssinaturaPage() {
  const [data, setData] = useState<any>(null);

  const load = () => fetch("/api/billing").then((r) => r.json()).then(setData);
  useEffect(() => { load(); }, []);

  if (!data) return null;

  const payInvoice = async (invoiceId: string) => {
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "pay-invoice", invoiceId }),
    });
    const result = await res.json();
    if (result.paymentUrl) window.open(result.paymentUrl, "_blank");
    else if (result.error) alert(result.error);
    load();
  };

  const changePlan = async (planId: string) => {
    await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "change-plan", planId }),
    });
    load();
  };

  return (
    <div>
      <PageHeader title="Assinatura" description="Plano, faturas e pagamentos" />

      {data.blocked && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          Conta bloqueada por inadimplência. Regularize o pagamento abaixo.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <Card>
          <CardTitle className="mb-2">Plano atual</CardTitle>
          <p className="text-2xl font-bold">{data.tenant?.plan?.name}</p>
          <p className="text-muted-foreground">{formatCurrency(data.tenant?.plan?.price || 0)}/mês</p>
          <Badge className="mt-2">{data.subscription?.status || "—"}</Badge>
        </Card>
        <Card>
          <CardTitle className="mb-2">Próxima cobrança</CardTitle>
          <p className="text-lg">
            {data.subscription?.nextBillingDate
              ? new Date(data.subscription.nextBillingDate).toLocaleDateString("pt-BR")
              : "—"}
          </p>
          {!data.asaasConfigured && (
            <p className="mt-2 text-xs text-yellow-500">Configure ASAAS_API_KEY para pagamentos automáticos.</p>
          )}
        </Card>
      </div>

      <Card className="mb-6">
        <CardTitle className="mb-4">Trocar plano</CardTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {data.plans?.map((plan: { id: string; name: string; price: number; slug: string }) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => changePlan(plan.id)}
              className={`rounded-lg border p-4 text-left ${data.tenant?.planId === plan.id ? "border-accent bg-accent/5" : "border-border"}`}
            >
              <p className="font-semibold">{plan.name}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(plan.price)}/mês</p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5" /> Faturas
        </CardTitle>
        <div className="space-y-2">
          {data.invoices?.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma fatura</p>
          )}
          {data.invoices?.map((inv: { id: string; amount: number; status: string; dueDate: string; paymentUrl?: string }) => (
            <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <div>
                <p className="font-medium">{formatCurrency(inv.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  Vencimento: {new Date(inv.dueDate).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "danger" : "warning"}>
                  {inv.status}
                </Badge>
                {inv.status !== "PAID" && (
                  <Button size="sm" variant="accent" onClick={() => payInvoice(inv.id)}>
                    <ExternalLink className="h-3 w-3" /> Pagar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
