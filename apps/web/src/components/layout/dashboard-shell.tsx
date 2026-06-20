"use client";

import { useAuth } from "@/contexts/auth-context";
import { AuthProvider } from "@/contexts/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { PlanRouteGuard } from "@/components/plan-route-guard";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </AuthProvider>
  );
}

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    if (!loading && user) {
      if (user.role === "SUPER_ADMIN" && !pathname.startsWith("/admin")) {
        router.push("/admin");
      }
      if (user.role !== "SUPER_ADMIN" && pathname.startsWith("/admin")) {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {user.role !== "SUPER_ADMIN" && <PlanRouteGuard />}
      <main className="flex-1 overflow-auto p-4 pt-16 lg:p-6 lg:pt-6">
        <ErrorBoundary autoRetryMs={2000}>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
