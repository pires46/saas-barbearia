"use client";

import { useEffect, useState } from "react";
import { PageHeader, StatCard } from "@/components/layout/sidebar";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@saas-barbearia/shared";
import { DollarSign, Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface Invoice {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt: string | null;
  tenant: { name: string; slug: string; email: string };
}

export default function AdminBillingPage() {
  const [data, setData] = useState<{
    invoices: Invoice[];
    subscriptions: { id: string; status: string; tenant: { name: string }; plan: { name: string; price: number } }[];
    stats: { pending: number; overdue: number; monthlyPaid: number };
  } | null>(null);

  const load = () => fetch("/api/admin/billing").then((r) => r.json()).then(setData);
  useEffect(() => { load(); }, []);

  const markPaid = async (id: string) => {
    await fetch("/api/admin/billing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "PAID" }),
    });
    load();
  };

  const markOverdue = async (id: string) => {
    if (!confirm("Marcar como inadimplente e bloquear barbearia?")) return;
    await fetch("/api/admin/billing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "OVERDUE" }),
    });
    load();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, "success" | "warning" | "danger" | "info"> = {
      PAID: "success",
      PENDING: "warning",
      OVERDUE: "danger",
      CANCELLED: "info",
    };
    const labels: Record<string, string> = {
      PAID: "Pago",
      PENDING: "Pendente",
      OVERDUE: "Inadimplente",
      CANCELLED: "Cancelado",
    };
    return <Badge variant={map[status] || "default"}>{labels[status] || status}</Badge>;
  };

  if (!data) return null;

  return (
    <div>
      <PageHeader title="Cobranças" description="Faturas, assinaturas e controle de inadimplência" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="Recebido no Mês" value={formatCurrency(data.stats.monthlyPaid)} icon={DollarSign} />
        <StatCard title="Pendentes" value={String(data.stats.pending)} icon={Clock} />
        <StatCard title="Inadimplentes" value={String(data.stats.overdue)} icon={AlertTriangle} />
      </div>

      <Card className="mb-6">
        <CardTitle className="mb-4">Assinaturas Ativas</CardTitle>
        <div className="space-y-2">
          {data.subscriptions.filter((s) => s.status === "ACTIVE").map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-medium">{s.tenant.name}</p>
                <p className="text-sm text-muted-foreground">Plano {s.plan.name}</p>
              </div>
              <span className="font-bold text-accent">{formatCurrency(s.plan.price)}/mês</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-4">Faturas</CardTitle>
        <div className="space-y-2">
          {data.invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhuma fatura registrada</p>
          ) : (
            data.invoices.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{inv.tenant.name}</span>
                    {statusBadge(inv.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Vencimento: {new Date(inv.dueDate).toLocaleDateString("pt-BR")}
                    {inv.paidAt && ` · Pago em ${new Date(inv.paidAt).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatCurrency(inv.amount)}</span>
                  {inv.status === "PENDING" && (
                    <>
                      <Button size="sm" variant="accent" onClick={() => markPaid(inv.id)}>
                        <CheckCircle className="h-3 w-3" /> Confirmar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => markOverdue(inv.id)}>
                        Inadimplente
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
