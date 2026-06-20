"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, SERVICE_CATEGORIES } from "@saas-barbearia/shared";
import { Plus, Clock, Pencil, Trash2 } from "lucide-react";

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  commission: number;
  active: boolean;
}

const emptyForm = {
  name: "",
  category: "HAIRCUT",
  price: "",
  duration: "30",
  commission: "50",
};

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => fetch("/api/services").then((r) => r.json()).then(setServices);
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (service: Service) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      category: service.category,
      price: String(service.price),
      duration: String(service.duration),
      commission: String(service.commission),
    });
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      category: form.category,
      price: parseFloat(form.price),
      duration: parseInt(form.duration, 10),
      commission: parseFloat(form.commission),
    };

    try {
      const res = await fetch("/api/services", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar serviço");

      closeForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar serviço");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Excluir o serviço "${service.name}"?`)) return;

    const res = await fetch(`/api/services?id=${service.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Erro ao excluir serviço");
      return;
    }
    load();
  };

  return (
    <div>
      <PageHeader
        title="Serviços"
        description="Cadastro e configuração de serviços"
        actions={
          <Button variant="accent" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Novo Serviço
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardTitle className="mb-4">{editingId ? "Editar serviço" : "Novo serviço"}</CardTitle>
          {error && (
            <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(SERVICE_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
            <Input placeholder="Valor (R$)" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <Input placeholder="Duração (min)" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} required />
            <Input placeholder="Comissão (%)" type="number" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} required />
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <Button type="submit" variant="accent" disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <Card key={s.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{s.name}</h3>
                <Badge variant="default" className="mt-1">
                  {SERVICE_CATEGORIES[s.category as keyof typeof SERVICE_CATEGORIES]}
                </Badge>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg font-bold text-accent">{formatCurrency(s.price)}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.duration} min</span>
              <span>Comissão: {s.commission}%</span>
            </div>
          </Card>
        ))}
      </div>

      {services.length === 0 && !showForm && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Nenhum serviço cadastrado. Clique em &quot;Novo Serviço&quot; para começar.
        </p>
      )}
    </div>
  );
}
