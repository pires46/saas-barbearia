"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Scissors } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cadastroOk = searchParams.get("cadastro") === "ok";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      router.push(user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
            <Scissors className="h-7 w-7 text-accent" />
          </div>
          <CardTitle>BarberSaaS</CardTitle>
          <CardDescription>Entre na sua conta</CardDescription>
        </div>

        {cadastroOk && (
          <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-400">
            Barbearia cadastrada! Faça login com seu e-mail e senha.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" variant="accent" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-3 text-center text-sm">
          <Link href="/forgot-password" className="text-accent hover:underline">
            Esqueci minha senha
          </Link>
        </p>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link href="/cadastro" className="text-accent hover:underline">
            Cadastre sua barbearia
          </Link>
        </p>
      </Card>
    </div>
  );
}
