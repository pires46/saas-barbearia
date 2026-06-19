"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Scissors } from "lucide-react";
import { slugify } from "@saas-barbearia/shared";

export default function CadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const plansRes = await fetch("/api/public/plans");
      const plans = await plansRes.json();
      const plan = plans.find((p: { slug: string }) => p.slug === form.planSlug);
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
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl">
            <Scissors className="h-7 w-7 text-accent" />
            BarberSaaS
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Cadastre sua barbearia</h1>
          <p className="text-muted-foreground">Comece a usar o sistema em minutos</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nome da barbearia</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">URL (seu-link.seusistema.com.br)</label>
              <div className="flex items-center gap-1">
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} required />
                <span className="text-xs text-muted-foreground shrink-0">.seusistema.com.br</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Seu nome</label>
              <Input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">E-mail (será seu login)</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Telefone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Senha</label>
              <Input type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} required minLength={6} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Plano</label>
              <select
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                value={form.planSlug}
                onChange={(e) => setForm({ ...form, planSlug: e.target.value })}
              >
                <option value="basico">Básico - R$ 79,90/mês</option>
                <option value="profissional">Profissional - R$ 149,90/mês</option>
                <option value="premium">Premium - R$ 249,90/mês</option>
              </select>
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
                <Link href="/termos" className="text-accent hover:underline" target="_blank">Termos de Uso</Link>
                {" "}e a{" "}
                <Link href="/privacidade" className="text-accent hover:underline" target="_blank">Política de Privacidade</Link>.
              </span>
            </label>

            <Button type="submit" variant="accent" className="w-full" disabled={loading || !form.consentLgpd}>
              {loading ? "Cadastrando..." : "Criar minha barbearia"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta? <Link href="/login" className="text-accent hover:underline">Entrar</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
