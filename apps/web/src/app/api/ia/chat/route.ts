import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/api-auth";
import { generateGeminiText, isGeminiConfigured } from "@/lib/gemini";
import { prisma } from "@saas-barbearia/database";

export async function POST(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  if (!isGeminiConfigured()) {
    return NextResponse.json({ error: "Google AI não configurada no servidor" }, { status: 503 });
  }

  const { message } = (await req.json()) as { message?: string };
  if (!message?.trim()) {
    return NextResponse.json({ error: "Mensagem obrigatória" }, { status: 400 });
  }

  const [tenant, services, stats] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, address: true, phone: true, slug: true },
    }),
    prisma.service.findMany({
      where: { tenantId, active: true },
      select: { name: true, price: true },
      take: 10,
    }),
    prisma.appointment.count({
      where: {
        tenantId,
        startTime: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        status: { not: "CANCELLED" },
      },
    }),
  ]);

  const systemPrompt = `Você é assistente de gestão da barbearia "${tenant?.name || "Barbearia"}".
Responda em português do Brasil, de forma prática para o dono/gestor.
Ajude com: promoções, ocupação da agenda, retenção de clientes, estoque e faturamento.
Seja objetivo (máximo 4 parágrafos curtos).`;

  const context = `
Barbearia: ${tenant?.name}
Endereço: ${tenant?.address || "não informado"}
Serviços: ${services.map((s) => `${s.name} R$${s.price}`).join(", ") || "não cadastrados"}
Agendamentos últimos 30 dias: ${stats}
Link público: ${process.env.NEXT_PUBLIC_APP_URL || ""}/b/${tenant?.slug || ""}
`;

  try {
    const reply = await generateGeminiText({
      system: systemPrompt,
      prompt: `${context}\n\nPergunta do gestor: ${message.trim()}`,
      temperature: 0.65,
    });
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[ia/chat]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao consultar IA" },
      { status: 500 }
    );
  }
}
