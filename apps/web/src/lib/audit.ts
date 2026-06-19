import { prisma } from "@saas-barbearia/database";

export async function logAudit(params: {
  action: string;
  userId?: string | null;
  tenantId?: string | null;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        userId: params.userId || undefined,
        tenantId: params.tenantId || undefined,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
        ip: params.ip,
      },
    });
  } catch (err) {
    console.error("[audit]", err);
  }
}
