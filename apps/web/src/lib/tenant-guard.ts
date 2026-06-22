import { prisma } from "@saas-barbearia/database";

export class TenantResourceError extends Error {
  constructor(message = "Recurso não encontrado") {
    super(message);
    this.name = "TenantResourceError";
  }
}

export async function assertClientBelongsToTenant(clientId: string, tenantId: string) {
  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId } });
  if (!client) throw new TenantResourceError();
  return client;
}

export async function assertEmployeeBelongsToTenant(employeeId: string, tenantId: string) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId, active: true },
  });
  if (!employee) throw new TenantResourceError();
  return employee;
}

export async function assertServiceBelongsToTenant(serviceId: string, tenantId: string) {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, tenantId, active: true },
  });
  if (!service) throw new TenantResourceError();
  return service;
}

export async function assertProductBelongsToTenant(productId: string, tenantId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) throw new TenantResourceError();
  return product;
}

export async function assertAppointmentBelongsToTenant(appointmentId: string, tenantId: string) {
  const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, tenantId } });
  if (!appointment) throw new TenantResourceError();
  return appointment;
}

export async function assertFinancialEntryBelongsToTenant(entryId: string, tenantId: string) {
  const entry = await prisma.financialEntry.findFirst({ where: { id: entryId, tenantId } });
  if (!entry) throw new TenantResourceError();
  return entry;
}

export function tenantResourceResponse(err: unknown) {
  if (err instanceof TenantResourceError) {
    return { status: 404, body: { error: err.message } };
  }
  return null;
}
