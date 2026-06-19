import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaHash?: string;
};

// Invalida cache do Prisma Client quando o schema muda (dev)
const SCHEMA_HASH = "employee-whatsapp-v2-billing-audit";

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient() {
  if (
    process.env.NODE_ENV !== "production" &&
    globalForPrisma.prisma &&
    globalForPrisma.prismaSchemaHash !== SCHEMA_HASH
  ) {
    globalForPrisma.prisma.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaSchemaHash = SCHEMA_HASH;
  }

  return globalForPrisma.prisma;
}

export const prisma = getPrismaClient();

export * from "@prisma/client";
