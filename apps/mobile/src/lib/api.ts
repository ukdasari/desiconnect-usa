import type { ApiErrorBody, PaginationMeta } from "@desiconnect/contracts";
import { API_URL } from "./config";

export { API_URL };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

interface AuthHooks {
  /** Returns a valid bearer token (refreshing first if needed), or null when signed out. */
  getToken: () => Promise<string | null>;
  /** Called when the API rejects the token. */
  onUnauthorized: () => void;
}

let hooks: AuthHooks = { getToken: async () => null, onUnauthorized: () => {} };

/** Wired by AuthProvider so every request is authenticated without passing tokens around. */
export function setAuthHooks(next: AuthHooks) {
  hooks = next;
}

type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
  query?: Query;
  /** Skip the bearer token (public endpoints called before sign-in). */
  anonymous?: boolean;
  /** Use this token instead of the stored one (e.g. right after sign-in). */
  token?: string;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T; meta?: PaginationMeta & Record<string, unknown> }> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  const url = `${API_URL}${path}${params.toString() ? `?${params}` : ""}`;
  const token = opts.token ?? (opts.anonymous ? null : await hooks.getToken());
  const headers: Record<string, string> = { accept: "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.formData) body = opts.formData;
  else if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(url, { method: opts.method ?? "GET", headers, body });
  } catch {
    throw new ApiError(0, "NETWORK", "Can't reach DesiConnect. Check your connection and try again.");
  }
  const json = (await res.json().catch(() => null)) as ({ data: T; meta?: PaginationMeta & Record<string, unknown> } & Partial<ApiErrorBody>) | null;
  if (!res.ok || !json || json.error) {
    if (res.status === 401 && token && !opts.token) hooks.onUnauthorized();
    throw new ApiError(res.status, json?.error?.code ?? "UNKNOWN", json?.error?.message ?? `Request failed (${res.status})`, json?.error?.details);
  }
  return { data: json.data, meta: json.meta };
}

/** First field error for a form input, if any. */
export function fieldError(err: unknown, field: string): string | undefined {
  return err instanceof ApiError ? err.details?.[field]?.[0] : undefined;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.code === "VALIDATION_FAILED" && err.details ? "Check the highlighted fields." : err.message;
  return "Something went wrong. Try again.";
}
