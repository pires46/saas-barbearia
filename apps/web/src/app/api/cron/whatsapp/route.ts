import { NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { verifyCronSecret } from "@/lib/cron-auth";
import { processWhatsappReminders } from "@/lib/whatsapp-service";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  try {
    const result = await processWhatsappReminders();
    await logAudit({ action: "CRON_WHATSAPP_REMINDERS", metadata: result });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro no cron WhatsApp" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
