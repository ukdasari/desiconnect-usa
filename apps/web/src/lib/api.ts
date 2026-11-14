import "server-only";
import type { ApiErrorBody, PaginationMeta } from "@desiconnect/contracts";
import { headers as requestHeaders } from "next/headers";
import { getToken } from "./session";

const API_URL = process.env.API_URL ?? "http://localhost:4000/api/v1";

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

type Query = Record<string, string | number | boolean | null | undefined | string[]>;

interface Options {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
  query?: Query;
  /** Send the signed-in user's token (default true). */
  auth?: boolean;
  /** Seconds to cache public GETs. Personalized requests are never cached. */
  revalidate?: number;
}

export interface ApiResult<T> {
  data: T;
  meta?: PaginationMeta & Record<string, unknown>;
}

/** Server-side API client. Tokens never reach the browser: they live in an httpOnly cookie. */
export async function api<T>(path: string, opts: Options = {}): Promise<ApiResult<T>> {
  const url = new URL(`${API_URL}${path}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k, x));
    else url.searchParams.set(k, String(v));
  }
  const token = opts.auth === false ? null : await getToken();
  const headers: Record<string, string> = { accept: "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.formData) body = opts.formData;
  else if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const method = opts.method ?? "GET";
  const cacheable = method === "GET" && !token && opts.revalidate !== undefined;
  // Let the API rate-limit each visitor separately (shared, cached public data doesn't need it).
  const internalKey = process.env.INTERNAL_API_KEY;
  if (internalKey && !cacheable) {
    const ip = await visitorIp();
    if (ip) {
      headers["x-internal-key"] = internalKey;
      headers["x-client-ip"] = ip;
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body,
      ...(cacheable ? { next: { revalidate: opts.revalidate } } : { cache: "no-store" as const }),
    });
  } catch {
    throw new ApiError(503, "API_UNREACHABLE", "We couldn't reach 1StopDesi right now. Check your connection and try again.");
  }
  const json = (await res.json().catch(() => null)) as (ApiResult<T> & Partial<ApiErrorBody>) | null;
  if (!res.ok || !json || json.error) {
    throw new ApiError(res.status, json?.error?.code ?? "UNKNOWN", json?.error?.message ?? `Request failed (${res.status})`, json?.error?.details);
  }
  return { data: json.data, meta: json.meta };
}

/** Like api() but returns null on 404 instead of throwing. */
export async function apiOrNull<T>(path: string, opts: Options = {}): Promise<ApiResult<T> | null> {
  try {
    return await api<T>(path, opts);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function toQuery(searchParams: Record<string, string | string[] | undefined>): Query {
  const q: Query = {};
  for (const [k, v] of Object.entries(searchParams)) if (v !== undefined) q[k] = Array.isArray(v) ? v[0] : v;
  return q;
}

async function visitorIp(): Promise<string | null> {
  try {
    const h = await requestHeaders();
    const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
    return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null;
  } catch {
    return null; // not inside a request (build time)
  }
}
