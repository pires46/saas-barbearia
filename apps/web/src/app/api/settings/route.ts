import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";
import {
  buildDefaultSchedules,
  createEmployeeAbsences,
  ensureBusinessHours,
  saveEmployeeSchedules,
} from "@/lib/employee-schedules";

export async function GET() {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const [tenant, businessHours, settings] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    ensureBusinessHours(tenantId),
    prisma.tenantSettings.findUnique({ where: { tenantId } }),
  ]);

  return NextResponse.json({ tenant, businessHours, settings });
}

export async function PATCH(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();

  if (body.type === "business-hours") {
    for (const hour of body.hours) {
      const dayOfWeek = Number(hour.dayOfWeek);
      if (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) continue;

      await prisma.businessHour.upsert({
        where: { id: `${tenantId}-${dayOfWeek}` },
        update: {
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          closed: hour.closed,
        },
        create: {
          id: `${tenantId}-${dayOfWeek}`,
          tenantId,
          dayOfWeek,
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          closed: hour.closed,
        },
      });
    }
    return NextResponse.json({ success: true });
  }

  const allowedFields = [
    "name",
    "email",
    "phone",
    "description",
    "address",
    "instagram",
    "spotifyUrl",
    "logo",
    "coverImage",
  ] as const;

  const tenantData = body.tenant || body;
  const safeData: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in tenantData) safeData[key] = tenantData[key];
  }

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: safeData,
  });

  return NextResponse.json(tenant);
}
