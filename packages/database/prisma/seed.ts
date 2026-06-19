import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Inicializando banco de dados...");

  await Promise.all([
    prisma.plan.upsert({
      where: { slug: "basico" },
      update: {},
      create: {
        name: "Básico",
        slug: "basico",
        description: "Ideal para barbearias pequenas",
        price: 79.9,
        maxBarbers: 2,
        maxClients: 200,
        features: JSON.stringify(["Agendamento", "Clientes", "Serviços", "Dashboard"]),
      },
    }),
    prisma.plan.upsert({
      where: { slug: "profissional" },
      update: {},
      create: {
        name: "Profissional",
        slug: "profissional",
        description: "Para barbearias em crescimento",
        price: 149.9,
        maxBarbers: 5,
        maxClients: 1000,
        features: JSON.stringify([
          "Tudo do Básico",
          "Financeiro",
          "Estoque",
          "WhatsApp",
          "Fidelidade",
        ]),
      },
    }),
    prisma.plan.upsert({
      where: { slug: "premium" },
      update: {},
      create: {
        name: "Premium",
        slug: "premium",
        description: "Recursos completos + IA",
        price: 249.9,
        maxBarbers: 20,
        maxClients: 10000,
        features: JSON.stringify([
          "Tudo do Profissional",
          "IA Previsões",
          "IA Promoções",
          "App Cliente",
          "App Barbeiro",
          "Integrações",
        ]),
      },
    }),
  ]);

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@barbersaas.com.br";
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(8).toString("hex");

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
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
    console.log(`   Senha:  ${adminPassword}`);
    console.log("   ⚠️  Guarde esta senha. Altere após o primeiro acesso.");
  } else {
    console.log("✅ Planos verificados. Super Admin já existe.");
  }

  const tenantCount = await prisma.tenant.count();
  console.log(`\n📊 Barbearias cadastradas: ${tenantCount}`);
  if (tenantCount === 0) {
    console.log("   Cadastre a primeira barbearia em /cadastro ou /admin/tenants");
  }

  console.log("\n✅ Inicialização concluída!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
