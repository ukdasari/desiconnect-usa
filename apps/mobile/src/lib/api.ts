import type { ApiErrorBody, PaginationMeta } from "@desiconnect/contracts";

/**
 * API base URL. On a simulator use your machine's LAN IP (not localhost) for Android.
 * Set EXPO_PUBLIC_API_URL in apps/mobile/.env, e.g. http://192.168.1.20:4000/api/v1
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export async function api<T>(path: string, init?: { method?: string; body?: unknown; query?: Record<string, string | undefined> }) {
  const url = new URL(`${API_URL}${path}`);
  for (const [k, v] of Object.entries(init?.query ?? {})) if (v) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    method: init?.method ?? "GET",
    headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as ({ data: T; meta?: PaginationMeta } & Partial<ApiErrorBody>) | null;
  if (!res.ok || !json || json.error) throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  return { data: json.data, meta: json.meta };
}
