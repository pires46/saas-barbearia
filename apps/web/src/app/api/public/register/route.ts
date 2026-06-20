import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import bcrypt from "bcryptjs";
import { registerTenantSchema, parseBody } from "@/lib/validators";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limited = rateLimit(`register:${ip}`, 5, 60_000);
    if (!limited.ok) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = parseBody(registerTenantSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { name, slug, email, phone, planId, adminName, adminPassword } = parsed.data;

    const existingSlug = await prisma.tenant.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json({ error: "Este link já está em uso. Escolha outro." }, { status: 400 });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 400 });
    }

    const tenant = await prisma.tenant.create({
      data: { name, slug, email, phone, planId },
    });

    await prisma.tenantSettings.create({ data: { tenantId: tenant.id } });
    await prisma.loyaltyProgram.create({ data: { tenantId: tenant.id } });

    for (let d = 0; d < 7; d++) {
      await prisma.businessHour.create({
        data: {
          tenantId: tenant.id,
          dayOfWeek: d,
          openTime: "09:00",
          closeTime: "19:00",
          closed: d === 0,
        },
      });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 400 });
    }

    const trialMs = (plan.trialDays || 14) * 24 * 60 * 60 * 1000;
    const trialEnd = new Date(Date.now() + trialMs);

    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId,
        status: "TRIAL",
        paymentMethod: "PIX",
        nextBillingDate: trialEnd,
      },
    });

    await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        amount: plan.price,
        status: "PENDING",
        dueDate: trialEnd,
      },
    });

    const hashed = await bcrypt.hash(adminPassword, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name: adminName || name,
        role: "TENANT_ADMIN",
        tenantId: tenant.id,
      },
    });

    await logAudit({
      action: "TENANT_REGISTERED",
      userId: user.id,
      tenantId: tenant.id,
      ip,
      metadata: { slug, planId },
    });

    return NextResponse.json({
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
      message: "Barbearia cadastrada com sucesso!",
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno ao cadastrar" }, { status: 500 });
  }
}
