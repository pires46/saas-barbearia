import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";

export async function GET() {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const [tenant, businessHours, settings] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.businessHour.findMany({ where: { tenantId }, orderBy: { dayOfWeek: "asc" } }),
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
      await prisma.businessHour.upsert({
        where: { id: hour.id || `${tenantId}-${hour.dayOfWeek}` },
        update: {
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          closed: hour.closed,
        },
        create: {
          id: `${tenantId}-${hour.dayOfWeek}`,
          tenantId,
          dayOfWeek: hour.dayOfWeek,
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          closed: hour.closed,
        },
      });
    }
    return NextResponse.json({ success: true });
  }

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: body.tenant || body,
  });

  return NextResponse.json(tenant);
}
