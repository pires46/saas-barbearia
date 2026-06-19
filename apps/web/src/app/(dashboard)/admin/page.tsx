"use client";

import { useEffect, useState } from "react";
import { PageHeader, StatCard } from "@/components/layout/sidebar";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatCurrency } from "@saas-barbearia/shared";
import { Building2, Users, DollarSign, Ban, Plus, ArrowRight, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AdminData {
  tenants: { id: string; name: string; slug: string; blocked: boolean; plan: { name: string }; _count: { clients: number; appointments: number } }[];
  plans: { id: string; name: string; price: number; slug: string }[];
  stats: { totalTenants: number; blockedTenants: number; activeSubscriptions: number; monthlyRevenue: number; mrr?: number; trialCount?: number };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error);
        setData(json);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Painel SaaS" description="Controle central da plataforma" />
        <Card className="p-6 text-center">
          <p className="text-destructive">{error || "Erro ao carregar"}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Faça login com a conta de Super Admin do sistema.
          </p>
        </Card>
      </div>
    );
  }

  const planChart = data.plans.map((p) => ({
    name: p.name,
    count: data.tenants.filter((t) => t.plan.name === p.name).length,
  }));

  return (
    <div>
      <PageHeader
        title="Painel SaaS"
        description="Visão geral de todas as barbearias na plataforma"
        actions={
          <Link href="/admin/tenants">
            <Button variant="accent">
              <Plus className="h-4 w-4" /> Nova Barbearia
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total de Barbearias" value={String(data.stats.totalTenants)} icon={Building2} />
        <StatCard title="Assinaturas Ativas" value={String(data.stats.activeSubscriptions)} icon={Users} />
        <StatCard title="MRR" value={formatCurrency(data.stats.mrr || 0)} icon={TrendingUp} />
        <StatCard title="Receita do Mês" value={formatCurrency(data.stats.monthlyRevenue)} icon={DollarSign} />
        <StatCard title="Em Trial" value={String(data.stats.trialCount || 0)} icon={Ban} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">Barbearias por Plano</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={planChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333" }} />
              <Bar dataKey="count" fill="#e94560" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>Barbearias Recentes</CardTitle>
            <Link href="/admin/tenants" className="text-sm text-accent hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {data.tenants.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.slug}.seusistema.com.br</p>
                </div>
                <span className="text-xs text-muted-foreground">{t.plan.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/tenants">
          <Card className="cursor-pointer transition-colors hover:border-accent/50">
            <Building2 className="h-8 w-8 text-accent mb-2" />
            <h3 className="font-semibold">Gerenciar Barbearias</h3>
            <p className="text-sm text-muted-foreground">Cadastrar, editar, bloquear e acessar sites</p>
          </Card>
        </Link>
        <Link href="/admin/plans">
          <Card className="cursor-pointer transition-colors hover:border-accent/50">
            <DollarSign className="h-8 w-8 text-accent mb-2" />
            <h3 className="font-semibold">Planos & Preços</h3>
            <p className="text-sm text-muted-foreground">Básico, Profissional e Premium</p>
          </Card>
        </Link>
        <Link href="/admin/billing">
          <Card className="cursor-pointer transition-colors hover:border-accent/50">
            <Ban className="h-8 w-8 text-accent mb-2" />
            <h3 className="font-semibold">Cobranças</h3>
            <p className="text-sm text-muted-foreground">Faturas, inadimplência e bloqueios</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
