"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, slugify } from "@saas-barbearia/shared";
import { Plus, Search, Globe, ExternalLink, Ban, CheckCircle, Pencil } from "lucide-react";
import Link from "next/link";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  blocked: boolean;
  active: boolean;
  createdAt: string;
  plan: { id: string; name: string; price: number };
  subscriptions: { status: string; nextBillingDate: string | null }[];
  _count: { clients: number; employees: number; appointments: number; users: number };
}

interface Plan {
  id: string;
  name: string;
  price: number;
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    email: "",
    phone: "",
    planId: "",
    adminName: "",
    adminPassword: "",
  });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filter) params.set("filter", filter);

    const [tenantsRes, adminRes] = await Promise.all([
      fetch(`/api/admin/tenants?${params}`),
      fetch("/api/admin"),
    ]);

    if (tenantsRes.ok) setTenants(await tenantsRes.json());
    if (adminRes.ok) {
      const admin = await adminRes.json();
      setPlans(admin.plans || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [search, filter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ name: "", slug: "", email: "", phone: "", planId: plans[0]?.id || "", adminName: "", adminPassword: "" });
      load();
    } else {
      const err = await res.json();
      alert(err.error || "Erro ao criar");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    await fetch("/api/admin/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing.id,
        name: form.name,
        email: form.email,
        phone: form.phone,
        planId: form.planId,
      }),
    });
    setEditing(null);
    load();
  };

  const toggleBlock = async (id: string, blocked: boolean) => {
    await fetch("/api/admin/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, blocked }),
    });
    load();
  };

  const openEdit = (t: Tenant) => {
    setEditing(t);
    setForm({
      name: t.name,
      slug: t.slug,
      email: t.email,
      phone: t.phone || "",
      planId: t.plan.id,
      adminName: "",
      adminPassword: "",
    });
    setShowForm(false);
  };

  return (
    <div>
      <PageHeader
        title="Barbearias"
        description="Todas as barbearias cadastradas na plataforma SaaS"
        actions={
          <Button variant="accent" onClick={() => { setShowForm(true); setEditing(null); setForm({ ...form, planId: plans[0]?.id || "" }); }}>
            <Plus className="h-4 w-4" /> Nova Barbearia
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, slug ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {[
            { key: "", label: "Todas" },
            { key: "active", label: "Ativas" },
            { key: "blocked", label: "Bloqueadas" },
          ].map((f) => (
            <Button key={f.key} size="sm" variant={filter === f.key ? "accent" : "outline"} onClick={() => setFilter(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {(showForm || editing) && (
        <Card className="mb-6">
          <CardTitle className="mb-4">{editing ? "Editar Barbearia" : "Cadastrar Nova Barbearia"}</CardTitle>
          <form onSubmit={editing ? handleUpdate : handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              placeholder="Nome da barbearia *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })}
              required
            />
            <Input
              placeholder="Slug (URL) *"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              required
              disabled={!!editing}
            />
            <Input placeholder="E-mail admin *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <select
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
              value={form.planId}
              onChange={(e) => setForm({ ...form, planId: e.target.value })}
              required
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}/mês</option>
              ))}
            </select>
            {!editing && (
              <>
                <Input placeholder="Nome do administrador" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
            <Input placeholder="Senha do administrador *" type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} required />
              </>
            )}
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <Button type="submit" variant="accent">{editing ? "Salvar" : "Cadastrar"}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
            </div>
          </form>
          {!editing && (
            <p className="mt-3 text-xs text-muted-foreground">
              Ao cadastrar, a barbearia recebe login automático, site em /b/{form.slug || "slug"} e assinatura ativa.
            </p>
          )}
        </Card>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      ) : tenants.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhuma barbearia encontrada. Clique em &quot;Nova Barbearia&quot; para cadastrar.
        </Card>
      ) : (
        <div className="space-y-3">
          {tenants.map((t) => (
            <Card key={t.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{t.name}</h3>
                    <Badge>{t.plan.name}</Badge>
                    {t.blocked ? (
                      <Badge variant="danger">Bloqueada</Badge>
                    ) : (
                      <Badge variant="success">Ativa</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    <Globe className="inline h-3 w-3 mr-1" />
                    {t.slug}.seusistema.com.br · {t.email}
                    {t.phone && ` · ${t.phone}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{t._count.clients} clientes</span>
                    <span>{t._count.employees} funcionários</span>
                    <span>{t._count.appointments} agendamentos</span>
                    <span>{t._count.users} usuários</span>
                    <span>Cadastro: {new Date(t.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/b/${t.slug}`} target="_blank">
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-3 w-3" /> Site
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant={t.blocked ? "accent" : "destructive"}
                    onClick={() => toggleBlock(t.id, !t.blocked)}
                  >
                    {t.blocked ? (
                      <><CheckCircle className="h-3 w-3" /> Desbloquear</>
                    ) : (
                      <><Ban className="h-3 w-3" /> Bloquear</>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
