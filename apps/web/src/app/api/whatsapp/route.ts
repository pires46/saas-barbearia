import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";
import {
  isEvolutionConfigured,
  ensureInstance,
  connectInstance,
  getConnectionState,
  sendTextMessage,
  extractQrCode,
  extractConnectionState,
  logoutInstance,
} from "@/lib/evolution-api";
import { resolveWhatsappInstance, getTenantSlug } from "@/lib/whatsapp-instances";
import { getBarbersWhatsappStatus, upsertTenantSettings } from "@/lib/whatsapp-barbers";

async function sendViaEvolution(tenantId: string, phone: string, message: string, employeeId?: string) {
  if (!isEvolutionConfigured()) {
    throw new Error("Evolution API não configurada");
  }

  const instanceName = await resolveWhatsappInstance(tenantId, employeeId);
  if (!instanceName) throw new Error("Instância WhatsApp não configurada");

  await sendTextMessage(instanceName, phone, message);
}

export async function GET() {
  try {
    const { error, tenantId } = await requireTenant();
    if (error) return error;
    if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

    const [messages, campaigns, settings, tenant, barbers] = await Promise.all([
      prisma.whatsappMessage.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.whatsappCampaign.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.tenantSettings.findUnique({ where: { tenantId } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } }),
      getBarbersWhatsappStatus(tenantId),
    ]);

    let connection = { state: "unconfigured", qrCode: null as string | null };

    if (isEvolutionConfigured() && tenant) {
      const instanceName = settings?.whatsappInstance || tenant.slug;
      try {
        const stateData = await getConnectionState(instanceName);
        connection.state = extractConnectionState(stateData);
      } catch {
        connection.state = "disconnected";
      }
    }

    return NextResponse.json({
      messages,
      campaigns,
      settings,
      barbers,
      evolution: {
        configured: isEvolutionConfigured(),
        instance: settings?.whatsappInstance || tenant?.slug,
        mode: settings?.whatsappMode || "SHOP",
        ...connection,
      },
    });
  } catch (err) {
    console.error("[whatsapp GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao carregar WhatsApp" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();

  if (body.type === "connect") {
    if (!isEvolutionConfigured()) {
      return NextResponse.json({ error: "Evolution API não configurada no servidor" }, { status: 503 });
    }

    const slug = await getTenantSlug(tenantId);
    const instanceName = slug.replace(/[^a-z0-9-]/g, "-");

    await ensureInstance(instanceName);
    const connectData = await connectInstance(instanceName);
    const qrCode = extractQrCode(connectData);

    await upsertTenantSettings(tenantId, {
      whatsappInstance: instanceName,
      whatsappEnabled: true,
    });

    return NextResponse.json({
      instance: instanceName,
      qrCode,
      state: "connecting",
    });
  }

  if (body.type === "disconnect") {
    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
    if (settings?.whatsappInstance && isEvolutionConfigured()) {
      try {
        await logoutInstance(settings.whatsappInstance);
      } catch {
        /* instance may not exist */
      }
    }
    await upsertTenantSettings(tenantId, { whatsappEnabled: false });
    return NextResponse.json({ success: true });
  }

  if (body.type === "campaign") {
    const clients = await prisma.client.findMany({
      where: { tenantId, active: true },
      select: { phone: true },
    });

    let sent = 0;
    let failed = 0;

    for (const client of clients) {
      try {
        if (isEvolutionConfigured()) {
          await sendViaEvolution(tenantId, client.phone, body.message);
        }
        await prisma.whatsappMessage.create({
          data: {
            tenantId,
            phone: client.phone,
            message: body.message,
            type: "MARKETING",
            status: isEvolutionConfigured() ? "SENT" : "PENDING",
            sentAt: isEvolutionConfigured() ? new Date() : null,
          },
        });
        sent++;
      } catch {
        await prisma.whatsappMessage.create({
          data: {
            tenantId,
            phone: client.phone,
            message: body.message,
            type: "MARKETING",
            status: "FAILED",
          },
        });
        failed++;
      }
    }

    const campaign = await prisma.whatsappCampaign.create({
      data: {
        tenantId,
        name: body.name,
        message: body.message,
        status: "SENT",
        sentCount: sent,
        sentAt: new Date(),
      },
    });

    return NextResponse.json({ campaign, sent, failed }, { status: 201 });
  }

  if (body.type === "settings") {
    const allowed = ["confirmBooking", "reminder24h", "reminder2h", "thankYouMessage", "whatsappMode"];
    const settingsData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body.settings) settingsData[key] = body.settings[key];
    }

    const settings = await upsertTenantSettings(tenantId, settingsData);
    return NextResponse.json(settings);
  }

  try {
    if (isEvolutionConfigured()) {
      await sendViaEvolution(tenantId, body.phone, body.message);
    }

    const message = await prisma.whatsappMessage.create({
      data: {
        tenantId,
        phone: body.phone,
        message: body.message,
        type: body.messageType || "CUSTOM",
        status: isEvolutionConfigured() ? "SENT" : "PENDING",
        sentAt: isEvolutionConfigured() ? new Date() : null,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao enviar" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const pending = await prisma.whatsappMessage.findMany({
    where: { tenantId, status: "PENDING" },
  });

  let processed = 0;
  let failed = 0;

  for (const msg of pending) {
    try {
      if (isEvolutionConfigured()) {
        await sendViaEvolution(tenantId, msg.phone, msg.message);
        await prisma.whatsappMessage.update({
          where: { id: msg.id },
          data: { status: "SENT", sentAt: new Date() },
        });
        processed++;
      }
    } catch {
      await prisma.whatsappMessage.update({
        where: { id: msg.id },
        data: { status: "FAILED" },
      });
      failed++;
    }
  }

  return NextResponse.json({ processed, failed, pending: pending.length - processed - failed });
}
