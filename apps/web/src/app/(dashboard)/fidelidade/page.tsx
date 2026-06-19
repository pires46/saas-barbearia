"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Gift, Star, CreditCard } from "lucide-react";

export default function FidelidadePage() {
  const [data, setData] = useState<{
    program: { pointsPerReal: number; cashbackPercent: number; punchCardSize: number; active: boolean } | null;
    transactions: { id: string; type: string; points: number; description: string; createdAt: string; client: { name: string } }[];
    topClients: { id: string; name: string; loyaltyPoints: number; visitCount: number }[];
  } | null>(null);
  const [settings, setSettings] = useState({ pointsPerReal: "1", cashbackPercent: "5", punchCardSize: "10" });

  const load = () => fetch("/api/loyalty").then((r) => r.json()).then((d) => {
    setData(d);
    if (d.program) {
      setSettings({
        pointsPerReal: String(d.program.pointsPerReal),
        cashbackPercent: String(d.program.cashbackPercent),
        punchCardSize: String(d.program.punchCardSize),
      });
    }
  });
  useEffect(() => { load(); }, []);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/loyalty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pointsPerReal: parseFloat(settings.pointsPerReal),
        cashbackPercent: parseFloat(settings.cashbackPercent),
        punchCardSize: parseInt(settings.punchCardSize),
      }),
    });
    load();
  };

  if (!data) return null;

  return (
    <div>
      <PageHeader title="Fidelidade" description="Programa de pontos, cashback e cartão fidelidade" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="text-center">
          <Star className="mx-auto h-8 w-8 text-accent mb-2" />
          <p className="text-2xl font-bold">{data.program?.pointsPerReal}</p>
          <p className="text-sm text-muted-foreground">Pontos por R$1</p>
        </Card>
        <Card className="text-center">
          <CreditCard className="mx-auto h-8 w-8 text-accent mb-2" />
          <p className="text-2xl font-bold">{data.program?.cashbackPercent}%</p>
          <p className="text-sm text-muted-foreground">Cashback</p>
        </Card>
        <Card className="text-center">
          <Gift className="mx-auto h-8 w-8 text-accent mb-2" />
          <p className="text-2xl font-bold">{data.program?.punchCardSize}</p>
          <p className="text-sm text-muted-foreground">Cortes = 1 grátis</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">Configurações do Programa</CardTitle>
          <form onSubmit={saveSettings} className="space-y-3">
            <div>
              <label className="text-sm">Pontos por real gasto</label>
              <Input type="number" step="0.1" value={settings.pointsPerReal} onChange={(e) => setSettings({ ...settings, pointsPerReal: e.target.value })} />
            </div>
            <div>
              <label className="text-sm">Cashback (%)</label>
              <Input type="number" step="0.1" value={settings.cashbackPercent} onChange={(e) => setSettings({ ...settings, cashbackPercent: e.target.value })} />
            </div>
            <div>
              <label className="text-sm">Cartão fidelidade (cortes para 1 grátis)</label>
              <Input type="number" value={settings.punchCardSize} onChange={(e) => setSettings({ ...settings, punchCardSize: e.target.value })} />
            </div>
            <Button type="submit" variant="accent">Salvar Configurações</Button>
          </form>
        </Card>

        <Card>
          <CardTitle className="mb-4">Top Clientes Fidelidade</CardTitle>
          <div className="space-y-2">
            {data.topClients.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.visitCount} visitas</p>
                  </div>
                </div>
                <span className="font-bold text-accent">{c.loyaltyPoints} pts</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle className="mb-4">Transações Recentes</CardTitle>
        <div className="space-y-2">
          {data.transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <div>
                <span className="font-medium">{t.client.name}</span>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
              <span className={`font-bold ${t.points > 0 ? "text-green-500" : "text-red-500"}`}>
                {t.points > 0 ? "+" : ""}{t.points} pts
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
