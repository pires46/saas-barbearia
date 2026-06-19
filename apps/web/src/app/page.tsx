import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Scissors, Calendar, Users, BarChart3, Smartphone, Brain } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Scissors className="h-7 w-7 text-accent" />
            BarberSaaS
          </div>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="outline" size="sm">Entrar</Button>
            </Link>
            <Link href="/cadastro">
              <Button variant="accent" size="sm">Cadastrar barbearia</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Gestão completa para sua{" "}
          <span className="text-accent">barbearia</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Agendamento online, gestão de clientes, financeiro, estoque, WhatsApp automático,
          fidelidade, IA e muito mais. Tudo em um só lugar.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/cadastro">
            <Button variant="accent" size="lg">Cadastrar minha barbearia</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">Já tenho conta</Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: Calendar, title: "Agendamento Online", desc: "Clientes agendam 24h pelo celular ou computador" },
          { icon: Users, title: "Gestão de Clientes", desc: "CRM completo com histórico, VIP e aniversariantes" },
          { icon: BarChart3, title: "Dashboard & Financeiro", desc: "Indicadores, fluxo de caixa e relatórios" },
          { icon: Smartphone, title: "App Mobile", desc: "Apps para clientes e barbeiros iOS/Android" },
          { icon: Brain, title: "IA Integrada", desc: "Previsão de horários e sugestões de promoções" },
          { icon: Scissors, title: "Site Próprio", desc: "minhabarbearia.seusistema.com.br" },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-card p-6">
            <f.icon className="mb-3 h-8 w-8 text-accent" />
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
