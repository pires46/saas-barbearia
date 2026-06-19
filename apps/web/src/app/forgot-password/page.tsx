"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <CardTitle className="mb-4">Esqueci minha senha</CardTitle>
        <form onSubmit={submit} className="space-y-3">
          <Input type="email" placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" variant="accent" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link"}
          </Button>
        </form>
        {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-accent hover:underline">Voltar ao login</Link>
        </p>
      </Card>
    </div>
  );
}
