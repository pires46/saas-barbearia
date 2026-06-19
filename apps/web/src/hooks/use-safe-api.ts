"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWithRetry, type ApiResult } from "@/lib/fetch-api";

type UseSafeApiOptions = {
  pollMs?: number;
  retries?: number;
  autoRetryOnError?: boolean;
};

export function useSafeApi<T>(
  url: string,
  normalize: (raw: T) => T,
  empty: T,
  options: UseSafeApiOptions = {}
) {
  const { pollMs, retries = 2, autoRetryOnError = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    const result = await fetchWithRetry<T>(url, undefined, autoRetryOnError ? retries : 0);

    if (!mounted.current) return result;

    if (result.ok) {
      setData(normalize(result.data));
      setError(null);
    } else {
      setError(result.error);
      setData((prev) => prev ?? empty);
    }

    setLoading(false);
    return result;
  }, [url, normalize, empty, retries, autoRetryOnError]);

  useEffect(() => {
    mounted.current = true;
    load();
    if (!pollMs) return () => { mounted.current = false; };
    const id = setInterval(load, pollMs);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [load, pollMs]);

  const retry = useCallback(() => {
    setLoading(true);
    return load();
  }, [load]);

  return { data, error, loading, retry, reload: load };
}

export type { ApiResult };
