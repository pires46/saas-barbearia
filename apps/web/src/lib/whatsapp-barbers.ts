import { prisma } from "@saas-barbearia/database";
import {
  isEvolutionConfigured,
  getConnectionState,
  extractConnectionState,
} from "./evolution-api";

async function getBarberConnection(instanceName: string | null) {
  if (!isEvolutionConfigured() || !instanceName) {
    return { state: "unconfigured", qrCode: null as string | null };
  }

  try {
    const stateData = await getConnectionState(instanceName);
    return { state: extractConnectionState(stateData), qrCode: null };
  } catch {
    return { state: "disconnected", qrCode: null };
  }
}

export async function getBarbersWhatsappStatus(tenantId: string) {
  const barbers = await prisma.employee.findMany({
    where: { tenantId, active: true, role: "BARBER" },
    select: {
      id: true,
      name: true,
      phone: true,
      whatsappEnabled: true,
      whatsappInstance: true,
    },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    barbers.map(async (barber) => {
      const connection = await getBarberConnection(barber.whatsappInstance);
      return { ...barber, connection };
    })
  );
}

export async function upsertTenantSettings(
  tenantId: string,
  data: Record<string, unknown>
) {
  return prisma.tenantSettings.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  });
}
