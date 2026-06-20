import { NextRequest, NextResponse } from "next/server";
import { handleEvolutionIncomingMessage } from "@/lib/whatsapp-bot";

const WEBHOOK_TOKEN = process.env.EVOLUTION_WEBHOOK_TOKEN;

export async function POST(req: NextRequest) {
  try {
    if (WEBHOOK_TOKEN) {
      const token =
        req.headers.get("apikey") ||
        req.headers.get("x-evolution-token") ||
        req.nextUrl.searchParams.get("token");
      if (token !== WEBHOOK_TOKEN && token !== process.env.EVOLUTION_API_KEY) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = (await req.json()) as Record<string, unknown>;
    const result = await handleEvolutionIncomingMessage(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[webhooks/evolution]", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "BarberSaaS Evolution Webhook" });
}
