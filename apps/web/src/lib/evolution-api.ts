const EVOLUTION_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || "";

export function isEvolutionConfigured() {
  return Boolean(EVOLUTION_URL && EVOLUTION_KEY);
}

function headers() {
  return {
    "Content-Type": "application/json",
    apikey: EVOLUTION_KEY,
  };
}

async function evolutionFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${EVOLUTION_URL}${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers as Record<string, string>) },
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    const err = data as { message?: string; error?: string };
    throw new Error(err?.message || err?.error || `Evolution API error ${res.status}`);
  }

  return data;
}

export function formatPhoneBR(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  if (digits.length === 11 || digits.length === 10) return `55${digits}`;
  return digits;
}

export async function createInstance(instanceName: string) {
  return evolutionFetch("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
    }),
  });
}

export async function connectInstance(instanceName: string) {
  return evolutionFetch(`/instance/connect/${instanceName}`);
}

export async function getConnectionState(instanceName: string) {
  return evolutionFetch(`/instance/connectionState/${instanceName}`);
}

export async function fetchInstances() {
  return evolutionFetch("/instance/fetchInstances");
}

export async function sendTextMessage(instanceName: string, phone: string, text: string) {
  return evolutionFetch(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number: formatPhoneBR(phone),
      text,
    }),
  });
}

export async function logoutInstance(instanceName: string) {
  return evolutionFetch(`/instance/logout/${instanceName}`, { method: "DELETE" });
}

export async function deleteInstance(instanceName: string) {
  return evolutionFetch(`/instance/delete/${instanceName}`, { method: "DELETE" });
}

export function extractQrCode(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  if (typeof obj.base64 === "string") return obj.base64;
  if (typeof obj.qrcode === "string") return obj.qrcode;

  const nested = obj.qrcode as Record<string, unknown> | undefined;
  if (nested && typeof nested.base64 === "string") return nested.base64;

  const instance = obj.instance as Record<string, unknown> | undefined;
  if (instance && typeof instance.qrcode === "string") return instance.qrcode;

  return null;
}

export function extractConnectionState(data: unknown): string {
  if (!data || typeof data !== "object") return "close";
  const obj = data as Record<string, unknown>;
  const state = obj.state || (obj.instance as Record<string, unknown>)?.state;
  return String(state || "close").toLowerCase();
}

export async function ensureInstance(instanceName: string) {
  try {
    const state = await getConnectionState(instanceName);
    return { exists: true, state: extractConnectionState(state) };
  } catch {
    await createInstance(instanceName);
    return { exists: false, state: "connecting" };
  }
}

export function getEvolutionWebhookUrl() {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/webhooks/evolution`;
}

export async function setInstanceWebhook(instanceName: string) {
  const url = getEvolutionWebhookUrl();
  const payload = {
    webhook: {
      enabled: true,
      url,
      webhookByEvents: false,
      webhookBase64: false,
      events: ["MESSAGES_UPSERT"],
    },
  };

  try {
    return await evolutionFetch(`/webhook/set/${instanceName}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    return evolutionFetch(`/webhook/set/${instanceName}`, {
      method: "POST",
      body: JSON.stringify({
        enabled: true,
        url,
        webhookByEvents: false,
        events: ["MESSAGES_UPSERT"],
      }),
    });
  }
}
