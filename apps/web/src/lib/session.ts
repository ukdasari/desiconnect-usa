import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { MeDto } from "@desiconnect/contracts";

export const SESSION_COOKIE = "dc_session";
export const LOCATION_COOKIE = "dc_loc";

export async function getToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function setSession(token: string, expiresAt: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSession() {
  const jar = await cookies();
  for (const name of [SESSION_COOKIE, "dc_refresh", "dc_exp", "dc_idt", "dc_oidc"]) jar.delete(name);
}

/** Current user for this request (deduplicated across components), or null when signed out. */
export const getMe = cache(async (): Promise<MeDto | null> => {
  if (!(await getToken())) return null;
  const { api, ApiError } = await import("./api");
  try {
    return (await api<MeDto>("/me")).data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
});

export interface SavedLocation {
  city?: string;
  state?: string;
  zip?: string;
  label: string;
}

const DEFAULT_LOCATION: SavedLocation = { city: "Dallas", state: "TX", label: "Dallas–Fort Worth" };

export async function getLocation(): Promise<SavedLocation> {
  const raw = (await cookies()).get(LOCATION_COOKIE)?.value;
  if (!raw) return DEFAULT_LOCATION;
  try {
    const parsed = JSON.parse(raw) as SavedLocation;
    return parsed.label ? parsed : DEFAULT_LOCATION;
  } catch {
    return DEFAULT_LOCATION;
  }
}
