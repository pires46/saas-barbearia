import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  DEFAULT_PLAN_CONFIG,
  serializePlanFeatureFlags,
  featureListForDisplay,
} from "@saas-barbearia/shared";

const prisma = new PrismaClient();

const PLAN_SEEDS = [
  {
    slug: "basico",
    name: "Básico",
    description: "Ideal para barbearias pequenas",
    price: 79.9,
  },
  {
    slug: "profissional",
    name: "Profissional",
    description: "Para barbearias em crescimento",
    price: 149.9,
  },
  {
    slug: "premium",
    name: "Premium",
    description: "Recursos completos + IA",
    price: 249.9,
  },
] as const;

async function main() {
  console.log("🌱 Inicializando banco de dados...");

  for (const plan of PLAN_SEEDS) {
    const config = DEFAULT_PLAN_CONFIG[plan.slug];
    const flags = config.flags;
    const labels = featureListForDisplay(flags)
      .filter((f) => f.included)
      .map((f) => f.label);

    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        description: plan.description,
        price: plan.price,
        maxBarbers: config.maxBarbers,
        maxClients: config.maxClients,
        trialDays: config.trialDays,
        featureFlags: serializePlanFeatureFlags(flags),
        features: JSON.stringify(labels),
        active: true,
      },
      create: {
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        price: plan.price,
        maxBarbers: config.maxBarbers,
        maxClients: config.maxClients,
        trialDays: config.trialDays,
        featureFlags: serializePlanFeatureFlags(flags),
        features: JSON.stringify(labels),
      },
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "guhgames46@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const plainPassword = adminPassword || crypto.randomBytes(8).toString("hex");
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: "Administrador SaaS",
        role: "SUPER_ADMIN",
      },
    });

    console.log("✅ Super Admin criado:");
    console.log(`   E-mail: ${adminEmail}`);
    if (adminPassword) {
      console.log("   Senha:  (definida em SEED_ADMIN_PASSWORD)");
    } else {
      console.log(`   Senha:  ${plainPassword}`);
      console.log("   ⚠️  Guarde esta senha. Altere após o primeiro acesso.");
    }
  } else if (adminPassword) {
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        password: hashedPassword,
        role: "SUPER_ADMIN",
        name: "Administrador SaaS",
      },
    });
    console.log(`✅ Super Admin atualizado: ${adminEmail}`);
  } else {
    console.log(`✅ Planos verificados. Super Admin já existe: ${adminEmail}`);
  }

  console.log("\n📋 Planos:");
  for (const p of PLAN_SEEDS) {
    const c = DEFAULT_PLAN_CONFIG[p.slug];
    console.log(`   ${p.name}: trial ${c.trialDays} dias`);
  }

  const tenantCount = await prisma.tenant.count();
  console.log(`\n📊 Barbearias cadastradas: ${tenantCount}`);
  console.log("\n✅ Inicialização concluída!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
