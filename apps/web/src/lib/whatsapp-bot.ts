import { prisma } from "@saas-barbearia/database";
import { generateGeminiText } from "./gemini";
import { sendTextMessage, formatPhoneBR } from "./evolution-api";

export async function resolveTenantFromInstance(instanceName: string) {
  const settings = await prisma.tenantSettings.findFirst({
    where: { whatsappInstance: instanceName },
    include: { tenant: { include: { plan: true } } },
  });
  if (settings?.tenant) return { tenantId: settings.tenant.id, tenant: settings.tenant, settings };

  const tenant = await prisma.tenant.findFirst({
    where: { slug: instanceName },
    include: { plan: true, settings: true },
  });
  if (tenant) {
    return {
      tenantId: tenant.id,
      tenant,
      settings: tenant.settings,
    };
  }

  const employee = await prisma.employee.findFirst({
    where: { whatsappInstance: instanceName },
    include: { tenant: { include: { plan: true, settings: true } } },
  });
  if (employee?.tenant) {
    return {
      tenantId: employee.tenant.id,
      tenant: employee.tenant,
      settings: employee.tenant.settings,
      employee,
    };
  }

  return null;
}

function extractIncomingText(payload: Record<string, unknown>): string | null {
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const message = data.message as Record<string, unknown> | undefined;
  if (!message) return null;

  if (typeof message.conversation === "string") return message.conversation;
  const extended = message.extendedTextMessage as { text?: string } | undefined;
  if (extended?.text) return extended.text;
  const image = message.imageMessage as { caption?: string } | undefined;
  if (image?.caption) return image.caption;

  return null;
}

function phoneFromJid(jid: string): string {
  return jid.replace(/@.*/, "").replace(/\D/g, "");
}

async function buildBarbershopContext(tenantId: string, clientPhone?: string) {
  const [tenant, services, hours, client, upcoming] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true, address: true, phone: true, description: true },
    }),
    prisma.service.findMany({
      where: { tenantId, active: true },
      select: { name: true, price: true, duration: true },
      take: 15,
    }),
    prisma.businessHour.findMany({ where: { tenantId }, orderBy: { dayOfWeek: "asc" } }),
    clientPhone
      ? prisma.client.findFirst({
          where: { tenantId, phone: { contains: clientPhone.slice(-9) } },
          select: { name: true, phone: true, loyaltyPoints: true, lastVisit: true },
        })
      : null,
    clientPhone
      ? prisma.appointment.findMany({
          where: {
            tenantId,
            client: { phone: { contains: clientPhone.slice(-9) } },
            status: { in: ["SCHEDULED", "CONFIRMED"] },
            startTime: { gte: new Date() },
          },
          include: { service: true, employee: true },
          take: 3,
          orderBy: { startTime: "asc" },
        })
      : [],
  ]);

  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const hoursText = hours
    .map((h) => `${days[h.dayOfWeek]}: ${h.closed ? "fechado" : `${h.openTime}-${h.closeTime}`}`)
    .join("; ");

  return {
    tenant,
    servicesText: services.map((s) => `${s.name} R$${s.price} (${s.duration}min)`).join(", "),
    hoursText,
    client,
    upcoming,
    publicUrl: tenant ? `/b/${tenant.slug}` : "",
  };
}

export async function handleEvolutionIncomingMessage(payload: Record<string, unknown>) {
  const event = String(payload.event || "").toLowerCase();
  if (event !== "messages.upsert") return { handled: false, reason: "event_ignored" };

  const instance = String(payload.instance || "");
  if (!instance) return { handled: false, reason: "no_instance" };

  const data = payload.data as Record<string, unknown> | undefined;
  const key = data?.key as { fromMe?: boolean; remoteJid?: string } | undefined;
  if (key?.fromMe) return { handled: false, reason: "from_me" };

  const remoteJid = key?.remoteJid || "";
  if (!remoteJid || remoteJid.includes("@g.us") || remoteJid.includes("broadcast")) {
    return { handled: false, reason: "group_or_broadcast" };
  }

  const text = extractIncomingText(payload);
  if (!text?.trim()) return { handled: false, reason: "no_text" };

  const resolved = await resolveTenantFromInstance(instance);
  if (!resolved) return { handled: false, reason: "tenant_not_found" };

  const { tenantId, tenant, settings } = resolved;
  if (!settings?.whatsappBotEnabled) return { handled: false, reason: "bot_disabled" };
  if (!settings.whatsappEnabled) return { handled: false, reason: "whatsapp_disabled" };

  const phone = phoneFromJid(remoteJid);
  const ctx = await buildBarbershopContext(tenantId, phone);

  const systemPrompt = `Você é a assistente virtual da barbearia "${tenant.name}" no WhatsApp.
Responda em português do Brasil, de forma cordial e objetiva (máximo 3 parágrafos curtos).
Você pode: informar serviços e preços, horários, endereço, ajudar a agendar (orientar acessar o link ou informar horários disponíveis), tirar dúvidas.
Não invente preços ou horários — use apenas os dados fornecidos.
Se não souber algo, peça para falar com a barbearia ou acessar o site de agendamento.`;

  const userPrompt = `
Dados da barbearia:
- Nome: ${ctx.tenant?.name}
- Endereço: ${ctx.tenant?.address || "não informado"}
- Telefone: ${ctx.tenant?.phone || "não informado"}
- Serviços: ${ctx.servicesText || "consulte no site"}
- Horários: ${ctx.hoursText}
- Link agendamento: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${ctx.publicUrl}

Cliente: ${ctx.client?.name || "visitante"} (${phone})
${ctx.client?.loyaltyPoints ? `Pontos fidelidade: ${ctx.client.loyaltyPoints}` : ""}
${ctx.upcoming?.length ? `Próximos agendamentos: ${ctx.upcoming.map((a) => `${a.startTime.toLocaleString("pt-BR")} - ${a.service.name} com ${a.employee.name}`).join("; ")}` : ""}

Mensagem do cliente: "${text.trim()}"
`;

  let reply: string;
  try {
    reply = await generateGeminiText({ system: systemPrompt, prompt: userPrompt, temperature: 0.6 });
  } catch (err) {
    console.error("[whatsapp-bot] Gemini error:", err);
    reply = `Olá! Sou a assistente da ${tenant.name}. No momento estou com dificuldade técnica. Por favor, ligue para ${tenant.phone || "a barbearia"} ou acesse nosso site para agendar.`;
  }

  await sendTextMessage(instance, phone, reply);

  await prisma.whatsappMessage.create({
    data: {
      tenantId,
      phone: formatPhoneBR(phone),
      message: `[BOT IN] ${text.slice(0, 200)}\n[BOT OUT] ${reply.slice(0, 500)}`,
      type: "CUSTOM",
      status: "SENT",
      sentAt: new Date(),
    },
  });

  return { handled: true, instance, phone };
}
