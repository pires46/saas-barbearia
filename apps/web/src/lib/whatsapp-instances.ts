import { prisma } from "@saas-barbearia/database";

export function buildEmployeeInstanceName(tenantSlug: string, employeeId: string) {
  const suffix = employeeId.slice(-8);
  return `${tenantSlug}-barber-${suffix}`.replace(/[^a-z0-9-]/g, "-").toLowerCase();
}

export async function resolveWhatsappInstance(tenantId: string, employeeId?: string) {
  const [settings, tenant] = await Promise.all([
    prisma.tenantSettings.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } }),
  ]);

  if (settings?.whatsappMode === "INDIVIDUAL" && employeeId) {
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId,
        whatsappEnabled: true,
        whatsappInstance: { not: null },
      },
      select: { whatsappInstance: true },
    });
    if (employee?.whatsappInstance) return employee.whatsappInstance;
  }

  return settings?.whatsappInstance || tenant?.slug || null;
}

export async function getTenantSlug(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
  return tenant?.slug || tenantId;
}
