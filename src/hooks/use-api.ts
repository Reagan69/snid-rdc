"use client";
import { useCallback, useState } from "react";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: init?.method ?? (init?.body ? "POST" : "GET"),
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
    });
    const json = (await res.json().catch(() => ({}))) as { error?: ApiError } & Record<string, unknown>;
    if (!res.ok) return { ok: false, error: json.error ?? { code: "HTTP_" + res.status, message: "Erreur " + res.status } };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: { code: "NETWORK", message: "Réseau indisponible. Réessayez." } };
  }
}

/** État « en cours / erreur » commun aux formulaires. */
export function useApiAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const run = useCallback(async <T,>(path: string, init?: { method?: string; body?: unknown }) => {
    setPending(true);
    setError(null);
    const r = await api<T>(path, init);
    setPending(false);
    if (!r.ok) setError(r.error);
    return r;
  }, []);
  return { pending, error, run, clearError: () => setError(null) };
}

export function fieldErrors(error: ApiError | null): string {
  if (!error) return "";
  const d = error.details;
  if (Array.isArray(d)) return d.map((x: { champ?: string; message?: string }) => (x.champ ? `${x.champ} : ` : "") + (x.message ?? "")).join(" · ");
  return error.message;
}
