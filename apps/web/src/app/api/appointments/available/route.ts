import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { getAvailableSlots } from "@/lib/services";
import {
  assertEmployeeBelongsToTenant,
  assertServiceBelongsToTenant,
  tenantResourceResponse,
} from "@/lib/tenant-guard";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

async function resolveActiveTenant(tenantId: string) {
  return prisma.tenant.findFirst({
    where: { id: tenantId, active: true, blocked: false },
    select: { id: true },
  });
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const limited = rateLimit(`slots:${ip}`, 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 });
  }

  const tenantId = req.nextUrl.searchParams.get("tenantId");
  const date = req.nextUrl.searchParams.get("date");
  const serviceId = req.nextUrl.searchParams.get("serviceId");
  const employeeId = req.nextUrl.searchParams.get("employeeId") || undefined;

  if (!tenantId || !date || !serviceId) {
    return NextResponse.json({ error: "Parâmetros obrigatórios" }, { status: 400 });
  }

  const tenant = await resolveActiveTenant(tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  }

  try {
    await assertServiceBelongsToTenant(serviceId, tenantId);
    if (employeeId) await assertEmployeeBelongsToTenant(employeeId, tenantId);
  } catch (err) {
    const res = tenantResourceResponse(err);
    if (res) return NextResponse.json(res.body, { status: res.status });
    throw err;
  }

  const slots = await getAvailableSlots(tenantId, new Date(date), serviceId, employeeId);
  return NextResponse.json(slots);
}

export async function POST() {
  return NextResponse.json(
    { error: "Use POST /api/public/[slug] para criar agendamentos" },
    { status: 405 }
  );
}
