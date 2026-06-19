"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  UserCog,
  DollarSign,
  Package,
  ShoppingCart,
  MessageCircle,
  Gift,
  Settings,
  Globe,
  Brain,
  CreditCard,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const tenantNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/servicos", label: "Serviços", icon: Scissors },
  { href: "/funcionarios", label: "Funcionários", icon: UserCog },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/estoque", label: "Estoque", icon: Package },
  { href: "/vendas", label: "Vendas", icon: ShoppingCart },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/fidelidade", label: "Fidelidade", icon: Gift },
  { href: "/ia", label: "IA & Insights", icon: Brain },
  { href: "/assinatura", label: "Assinatura", icon: CreditCard },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tenants", label: "Barbearias", icon: Building2 },
  { href: "/admin/plans", label: "Planos", icon: Package },
  { href: "/admin/billing", label: "Cobranças", icon: DollarSign },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const nav = user?.role === "SUPER_ADMIN" ? adminNav : tenantNav;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-card p-2 shadow-md lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href={user?.role === "SUPER_ADMIN" ? "/admin" : "/dashboard"} className="flex items-center gap-2 font-bold">
            <Scissors className="h-6 w-6 text-accent" />
            <span>{user?.role === "SUPER_ADMIN" ? "BarberSaaS Admin" : "BarberSaaS"}</span>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="mb-2 px-3 text-sm">
            <p className="font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>
    </>
  );
}

export function PageHeader({
  title,
  description,
  backHref,
  actions,
}: {
  title: string;
  description?: string;
  backHref?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
}) {
  return (
    <Card className="flex items-start gap-4">
      <div className="rounded-lg bg-accent/10 p-2.5">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {trend && <p className="text-xs text-green-600">{trend}</p>}
      </div>
    </Card>
  );
}

export { Card } from "@/components/ui/card";
