"use client";

import { useEffect, useState } from "react";
import { PageHeader, StatCard } from "@/components/layout/sidebar";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { Card, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@saas-barbearia/shared";
import {
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface DashboardData {
  todayAppointments: number;
  todayRevenue: number;
  monthRevenue: number;
  newClients: number;
  recurringClients: number;
  topServices: { name: string; count: number }[];
  peakHours: { hour: string; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral da sua barbearia"
      />

      <OnboardingWizard />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Agendamentos hoje"
          value={String(data.todayAppointments)}
          icon={Calendar}
        />
        <StatCard
          title="Faturamento hoje"
          value={formatCurrency(data.todayRevenue)}
          icon={DollarSign}
        />
        <StatCard
          title="Faturamento do mês"
          value={formatCurrency(data.monthRevenue)}
          icon={TrendingUp}
        />
        <StatCard
          title="Clientes novos (mês)"
          value={String(data.newClients)}
          icon={Users}
          trend={`${data.recurringClients} recorrentes`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">Receita Mensal</CardTitle>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ background: "#1a1a2e", border: "1px solid #333" }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#e94560" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle className="mb-4">Serviços Mais Vendidos</CardTitle>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.topServices}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" fontSize={11} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333" }} />
              <Bar dataKey="count" fill="#e94560" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">Horários Mais Movimentados</CardTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="hour" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333" }} />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
