export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number };

export async function fetchApiJson<T>(
  url: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);
    const text = await res.text();

    if (!text) {
      return { ok: false, error: "Resposta vazia do servidor", status: res.status };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: "Resposta inválida (não é JSON)", status: res.status };
    }

    if (!res.ok) {
      const err = parsed as { error?: string; message?: string };
      return {
        ok: false,
        error: err.error || err.message || `Erro ${res.status}`,
        status: res.status,
      };
    }

    if (parsed && typeof parsed === "object" && "error" in parsed && !("messages" in parsed)) {
      const err = parsed as { error?: string };
      return { ok: false, error: err.error || "Erro desconhecido", status: res.status };
    }

    return { ok: true, data: parsed as T, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha na conexão",
      status: 0,
    };
  }
}

export async function fetchWithRetry<T>(
  url: string,
  init?: RequestInit,
  retries = 2,
  delayMs = 1500
): Promise<ApiResult<T>> {
  let last = await fetchApiJson<T>(url, init);

  for (let i = 0; i < retries && !last.ok; i++) {
    await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    last = await fetchApiJson<T>(url, init);
  }

  return last;
}
