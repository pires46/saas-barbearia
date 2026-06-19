"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate, getInitials } from "@saas-barbearia/shared";
import { Plus, Search, Crown, Cake, UserX, Trophy } from "lucide-react";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  vip: boolean;
  totalSpent: number;
  visitCount: number;
  lastVisit: string | null;
  loyaltyPoints: number;
  notes: string | null;
  appointments: { service: { name: string }; employee: { name: string }; startTime: string }[];
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", birthDate: "", notes: "", vip: false });

  const load = () => {
    const params = new URLSearchParams();
    if (filter) params.set("filter", filter);
    if (search) params.set("search", search);
    fetch(`/api/clients?${params}`)
      .then((r) => r.json())
      .then(setClients);
  };

  useEffect(() => {
    load();
  }, [filter, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", phone: "", email: "", birthDate: "", notes: "", vip: false });
    load();
  };

  const filters = [
    { key: "", label: "Todos", icon: Search },
    { key: "vip", label: "VIP", icon: Crown },
    { key: "birthday", label: "Aniversariantes", icon: Cake },
    { key: "inactive", label: "Inativos", icon: UserX },
    { key: "ranking", label: "Ranking", icon: Trophy },
  ];

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Gestão completa de clientes"
        actions={
          <Button variant="accent" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {filters.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "accent" : "outline"}
              onClick={() => setFilter(f.key)}
            >
              <f.icon className="h-3 w-3" /> {f.label}
            </Button>
          ))}
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input placeholder="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="Telefone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <Input placeholder="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Data nascimento" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
            <Input placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.vip} onChange={(e) => setForm({ ...form, vip: e.target.checked })} />
              Cliente VIP
            </label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <Button type="submit" variant="accent">Salvar</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => (
          <Card key={client.id}>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/10 font-bold text-accent">
                {getInitials(client.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{client.name}</h3>
                  {client.vip && <Badge variant="accent">VIP</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{client.phone}</p>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  <span>Visitas: {client.visitCount}</span>
                  <span>Gasto: {formatCurrency(client.totalSpent)}</span>
                  <span>Pontos: {client.loyaltyPoints}</span>
                  {client.lastVisit && <span>Última: {formatDate(client.lastVisit)}</span>}
                </div>
                {client.appointments?.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Último: {client.appointments[0].service.name} com {client.appointments[0].employee.name}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
