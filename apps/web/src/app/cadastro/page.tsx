"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PlanFeatureList } from "@/components/plan-feature-list";
import { Scissors } from "lucide-react";
import { slugify, formatCurrency, type PlanFeatureFlags } from "@saas-barbearia/shared";

type PublicPlan = {
  id: string;
  slug: string;
  name: string;
  price: number;
  trialDays: number;
  maxBarbers: number;
  flags: PlanFeatureFlags;
};

export default function CadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    email: "",
    phone: "",
    adminName: "",
    adminPassword: "",
    planSlug: "basico",
    consentLgpd: false,
  });

  useEffect(() => {
    fetch("/api/public/plans")
      .then((r) => r.json())
      .then((list: PublicPlan[]) => {
        setPlans(list);
        if (list.length && !list.find((p) => p.slug === form.planSlug)) {
          setForm((f) => ({ ...f, planSlug: list[0].slug }));
        }
      });
  }, []);

  const selectedPlan = plans.find((p) => p.slug === form.planSlug);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const plan = plans.find((p) => p.slug === form.planSlug);
      if (!plan) throw new Error("Plano não encontrado");

      const res = await fetch("/api/public/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, planId: plan.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao cadastrar");

      router.push("/login?cadastro=ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl">
            <Scissors className="h-7 w-7 text-accent" />
            BarberSaaS
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Cadastre sua barbearia</h1>
          <p className="text-muted-foreground">Teste grátis — escolha o plano e comece em minutos</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Nome da barbearia</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">URL (seu-link)</label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Seu nome</label>
                <Input
                  value={form.adminName}
                  onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Telefone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">E-mail (login)</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Senha</label>
                <Input
                  type="password"
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Escolha o plano</label>
              <div className="grid gap-3 sm:grid-cols-3">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setForm({ ...form, planSlug: plan.slug })}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      form.planSlug === plan.slug
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/40"
                    }`}
                  >
                    <p className="font-semibold">{plan.name}</p>
                    <p className="text-sm text-accent">{formatCurrency(plan.price)}/mês</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.trialDays} dias grátis
                    </p>
                  </button>
                ))}
              </div>
              {selectedPlan && (
                <div className="mt-3 rounded-lg border border-border bg-secondary/20 p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    O que está incluído (🔒 = não incluso neste plano)
                  </p>
                  <PlanFeatureList flags={selectedPlan.flags} slug={selectedPlan.slug} compact />
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.consentLgpd}
                onChange={(e) => setForm({ ...form, consentLgpd: e.target.checked })}
                className="mt-1"
                required
              />
              <span>
                Li e aceito os{" "}
                <Link href="/termos" className="text-accent hover:underline" target="_blank">
                  Termos
                </Link>{" "}
                e a{" "}
                <Link href="/privacidade" className="text-accent hover:underline" target="_blank">
                  Privacidade
                </Link>
                .
              </span>
            </label>

            <Button type="submit" variant="accent" className="w-full" disabled={loading || !form.consentLgpd}>
              {loading
                ? "Cadastrando..."
                : selectedPlan
                  ? `Criar barbearia — ${selectedPlan.trialDays} dias grátis`
                  : "Criar minha barbearia"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Entrar
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
