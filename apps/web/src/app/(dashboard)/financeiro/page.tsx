"use client";

import { useEffect, useState } from "react";
import { PageHeader, StatCard } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@saas-barbearia/shared";
import { Plus, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function FinanceiroPage() {
  const [entries, setEntries] = useState<{ id: string; type: string; category: string; description: string; amount: number; date: string }[]>([]);
  const [report, setReport] = useState<{ grossProfit: number; netProfit: number; totalIncome: number; totalExpenses: number; monthlyComparison: { month: string; income: number; expenses: number; profit: number }[] } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "EXPENSE", category: "Aluguel", description: "", amount: "" });

  useEffect(() => {
    fetch("/api/finance").then((r) => r.json()).then(setEntries);
    fetch("/api/finance?type=report").then((r) => r.json()).then(setReport);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    setShowForm(false);
    const [e1, e2] = await Promise.all([
      fetch("/api/finance").then((r) => r.json()),
      fetch("/api/finance?type=report").then((r) => r.json()),
    ]);
    setEntries(e1);
    setReport(e2);
  };

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Controle de entradas, saídas e relatórios"
        actions={
          <Button variant="accent" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Novo Lançamento
          </Button>
        }
      />

      {report && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Receita Bruta" value={formatCurrency(report.grossProfit)} icon={TrendingUp} />
            <StatCard title="Despesas" value={formatCurrency(report.totalExpenses)} icon={TrendingDown} />
            <StatCard title="Lucro Líquido" value={formatCurrency(report.netProfit)} icon={DollarSign} />
            <StatCard title="Margem" value={`${report.grossProfit > 0 ? ((report.netProfit / report.grossProfit) * 100).toFixed(1) : 0}%`} icon={DollarSign} />
          </div>

          <Card className="mb-6">
            <CardTitle className="mb-4">Comparativo Mensal</CardTitle>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report.monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "#1a1a2e", border: "1px solid #333" }} />
                <Legend />
                <Bar dataKey="income" name="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Lucro" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="INCOME">Entrada</option>
              <option value="EXPENSE">Saída</option>
            </Select>
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {(form.type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            <Input placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            <Input placeholder="Valor" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <div className="flex gap-2">
              <Button type="submit" variant="accent">Salvar</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <CardTitle className="mb-4">Lançamentos Recentes</CardTitle>
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-medium">{e.description}</p>
                <p className="text-xs text-muted-foreground">{e.category} · {new Date(e.date).toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={e.type === "INCOME" ? "success" : "danger"}>
                  {e.type === "INCOME" ? "+" : "-"}{formatCurrency(e.amount)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
