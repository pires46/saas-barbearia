"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setOk(true);
      setMessage(data.message);
    } else {
      setMessage(data.error);
    }
    setLoading(false);
  };

  if (!token) {
    return <p className="text-destructive">Link inválido.</p>;
  }

  return (
    <Card className="w-full max-w-md p-6">
      <CardTitle className="mb-4">Nova senha</CardTitle>
      {ok ? (
        <p className="text-sm text-green-500">{message}</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Input type="password" placeholder="Nova senha (mín. 6)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <Button type="submit" variant="accent" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Redefinir senha"}
          </Button>
        </form>
      )}
      {message && !ok && <p className="mt-3 text-sm text-destructive">{message}</p>}
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="text-accent hover:underline">Ir para login</Link>
      </p>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={<div>Carregando...</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
