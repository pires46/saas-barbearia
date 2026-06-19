"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Brain, TrendingUp, Megaphone, Star, Mic, QrCode } from "lucide-react";

export default function IAPage() {
  const [data, setData] = useState<{
    predictions: { busiestDay: string; busiestHour: string; totalAnalyzed: number; suggestion: string };
    promotions: { title: string; description: string; impact: string; type: string }[];
    barberRanking: { id: string; name: string; rating: number; totalReviews: number }[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/ia").then((r) => r.json()).then(setData);
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
      <PageHeader title="IA & Insights" description="Previsões inteligentes e sugestões de promoções" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Brain, title: "IA Previsões", desc: "Ativa", color: "text-accent" },
          { icon: Mic, title: "Comando de Voz", desc: "Em breve", color: "text-muted-foreground" },
          { icon: QrCode, title: "QR Check-in", desc: "Ativo", color: "text-green-500" },
          { icon: Star, title: "Avaliações", desc: "Ativo", color: "text-yellow-500" },
        ].map((f) => (
          <Card key={f.title} className="text-center">
            <f.icon className={`mx-auto h-8 w-8 mb-2 ${f.color}`} />
            <p className="font-semibold">{f.title}</p>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" /> Previsão de Horários Movimentados
          </CardTitle>
          <div className="space-y-3">
            <div className="flex justify-between rounded-lg bg-secondary p-3">
              <span>Dia mais movimentado</span>
              <span className="font-bold">{data.predictions.busiestDay}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-secondary p-3">
              <span>Horário de pico</span>
              <span className="font-bold">{data.predictions.busiestHour}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-secondary p-3">
              <span>Agendamentos analisados</span>
              <span className="font-bold">{data.predictions.totalAnalyzed}</span>
            </div>
            <p className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm">
              💡 {data.predictions.suggestion}
            </p>
          </div>
        </Card>

        <Card>
          <CardTitle className="mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-accent" /> Sugestões de Promoções (IA)
          </CardTitle>
          <div className="space-y-3">
            {data.promotions.map((p, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.title}</span>
                  <Badge variant={p.impact === "Alto" ? "accent" : "warning"}>{p.impact}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle className="mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" /> Ranking dos Barbeiros
          </CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.barberRanking.map((b, i) => (
              <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-lg font-bold text-accent">
                  #{i + 1}
                </span>
                <div>
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-sm text-yellow-500">
                    ★ {b.rating.toFixed(1)} ({b.totalReviews} avaliações)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
