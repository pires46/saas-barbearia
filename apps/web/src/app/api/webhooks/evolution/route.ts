import { NextRequest, NextResponse } from "next/server";
import { handleEvolutionIncomingMessage } from "@/lib/whatsapp-bot";
import { timingSafeEqual } from "crypto";

function verifyWebhookToken(provided: string | null): boolean {
  const expected = process.env.EVOLUTION_WEBHOOK_TOKEN;
  if (!expected) return false;
  if (!provided) return false;

  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.EVOLUTION_WEBHOOK_TOKEN) {
      console.error("[webhooks/evolution] EVOLUTION_WEBHOOK_TOKEN não configurado");
      return NextResponse.json({ error: "Webhook não configurado" }, { status: 503 });
    }

    const token =
      req.headers.get("x-evolution-token") ||
      req.headers.get("apikey");

    if (!verifyWebhookToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    await handleEvolutionIncomingMessage(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhooks/evolution]", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
