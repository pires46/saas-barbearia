import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }), session: null };
  }
  return { error: null, session };
}

export async function requireTenant() {
  const { error, session } = await requireAuth();
  if (error) return { error, session: null, tenantId: null };

  if (session!.role === "SUPER_ADMIN") {
    return { error: null, session, tenantId: null };
  }

  if (!session!.tenantId) {
    return {
      error: NextResponse.json({ error: "Tenant não encontrado" }, { status: 403 }),
      session: null,
      tenantId: null,
    };
  }

  return { error: null, session, tenantId: session!.tenantId };
}

export function getTenantFromRequest(req: NextRequest, session: { role: string; tenantId?: string | null }) {
  if (session.role === "SUPER_ADMIN") {
    return req.nextUrl.searchParams.get("tenantId") || null;
  }
  return session.tenantId || null;
}
