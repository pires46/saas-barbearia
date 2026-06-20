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
  Brain,
  CreditCard,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  Building2,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PlanFeatureKey } from "@saas-barbearia/shared";

const tenantNav: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  feature?: PlanFeatureKey;
  alwaysOn?: boolean;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, feature: "dashboard", alwaysOn: true },
  { href: "/agenda", label: "Agenda", icon: Calendar, feature: "agenda" },
  { href: "/clientes", label: "Clientes", icon: Users, feature: "clientes" },
  { href: "/servicos", label: "Serviços", icon: Scissors, feature: "servicos" },
  { href: "/funcionarios", label: "Funcionários", icon: UserCog, feature: "funcionarios" },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign, feature: "financeiro" },
  { href: "/estoque", label: "Estoque", icon: Package, feature: "estoque" },
  { href: "/vendas", label: "Vendas", icon: ShoppingCart, feature: "vendas" },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle, feature: "whatsapp" },
  { href: "/fidelidade", label: "Fidelidade", icon: Gift, feature: "fidelidade" },
  { href: "/ia", label: "IA & Insights", icon: Brain, feature: "ia" },
  { href: "/assinatura", label: "Assinatura", icon: CreditCard, alwaysOn: true },
  { href: "/configuracoes", label: "Configurações", icon: Settings, alwaysOn: true },
];

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tenants", label: "Barbearias", icon: Building2 },
  { href: "/admin/plans", label: "Planos", icon: Package },
  { href: "/admin/billing", label: "Cobranças", icon: DollarSign },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { hasFeature, data: planData } = usePlanFeatures();
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === "SUPER_ADMIN";
  const nav = isAdmin ? adminNav : tenantNav;

  const handleNavClick = (
    e: React.MouseEvent,
    item: (typeof tenantNav)[number]
  ) => {
    setOpen(false);
    if (isAdmin || item.alwaysOn || !item.feature) return;

    if (!hasFeature(item.feature)) {
      e.preventDefault();
      router.push(`/assinatura?locked=${item.feature}`);
    }
  };

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
          <Link
            href={isAdmin ? "/admin" : "/dashboard"}
            className="flex items-center gap-2 font-bold"
            onClick={() => setOpen(false)}
          >
            <Scissors className="h-6 w-6 text-accent" />
            <span>{isAdmin ? "BarberSaaS Admin" : "BarberSaaS"}</span>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isAdmin && planData?.plan && (
          <div className="border-b border-border px-4 py-2">
            <p className="text-xs text-muted-foreground">Plano</p>
            <p className="text-sm font-medium truncate">{planData.plan.name}</p>
            {planData.subscription?.status === "TRIAL" && planData.subscription.trialEndsAt && (
              <p className="text-xs text-accent">
                Trial até{" "}
                {new Date(planData.subscription.trialEndsAt).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const locked =
              !isAdmin &&
              "feature" in item &&
              item.feature &&
              !item.alwaysOn &&
              !hasFeature(item.feature);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => !isAdmin && handleNavClick(e, item as (typeof tenantNav)[number])}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : locked
                      ? "text-muted-foreground/70 hover:bg-secondary/50"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {locked ? (
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <item.icon className="h-4 w-4 shrink-0" />
                )}
                <span className={cn(locked && "opacity-80")}>{item.label}</span>
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
