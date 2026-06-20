const DEFAULT_MODEL = process.env.GOOGLE_AI_MODEL || "gemini-2.0-flash";

export function isGeminiConfigured() {
  return Boolean(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY);
}

function getApiKey() {
  return process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
}

type GeminiPart = { text: string };
type GeminiContent = { role?: string; parts: GeminiPart[] };

export async function generateGeminiText(options: {
  system?: string;
  prompt: string;
  temperature?: number;
}): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY não configurada no servidor");
  }

  const contents: GeminiContent[] = [];
  if (options.system) {
    contents.push({ role: "user", parts: [{ text: options.system }] });
    contents.push({ role: "model", parts: [{ text: "Entendido. Seguirei essas instruções." }] });
  }
  contents.push({ role: "user", parts: [{ text: options.prompt }] });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: 1024,
      },
    }),
  });

  const data = (await res.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini API error ${res.status}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("")?.trim();
  if (!text) throw new Error("Resposta vazia da IA");
  return text;
}

export async function generateGeminiJson<T>(options: {
  system: string;
  prompt: string;
}): Promise<T> {
  const raw = await generateGeminiText({
    system: `${options.system}\nResponda APENAS com JSON válido, sem markdown.`,
    prompt: options.prompt,
    temperature: 0.4,
  });

  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned) as T;
}
