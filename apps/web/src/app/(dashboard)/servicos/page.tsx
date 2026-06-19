"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, SERVICE_CATEGORIES } from "@saas-barbearia/shared";
import { Plus, Clock } from "lucide-react";

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  commission: number;
  active: boolean;
}

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "HAIRCUT",
    price: "",
    duration: "30",
    commission: "50",
  });

  const load = () => fetch("/api/services").then((r) => r.json()).then(setServices);
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: parseFloat(form.price),
        duration: parseInt(form.duration),
        commission: parseFloat(form.commission),
      }),
    });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Serviços"
        description="Cadastro e configuração de serviços"
        actions={
          <Button variant="accent" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Novo Serviço
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(SERVICE_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
            <Input placeholder="Valor (R$)" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <Input placeholder="Duração (min)" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} required />
            <Input placeholder="Comissão (%)" type="number" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} required />
            <div className="flex gap-2">
              <Button type="submit" variant="accent">Salvar</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <Card key={s.id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{s.name}</h3>
                <Badge variant="default" className="mt-1">
                  {SERVICE_CATEGORIES[s.category as keyof typeof SERVICE_CATEGORIES]}
                </Badge>
              </div>
              <span className="text-lg font-bold text-accent">{formatCurrency(s.price)}</span>
            </div>
            <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.duration} min</span>
              <span>Comissão: {s.commission}%</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
