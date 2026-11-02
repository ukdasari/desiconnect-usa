"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import type { SessionDto } from "@desiconnect/contracts";
import { api } from "@/lib/api";
import { fromError, formValues, str, type ActionState } from "@/lib/action-state";
import { AUTH_MODE, client, COOKIES, oidcConfig, settings } from "@/lib/oidc";
import { clearSession, LOCATION_COOKIE, setSession } from "@/lib/session";

/** Only allow same-site relative redirects after sign-in. */
function safeNext(value: string | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export async function login(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let session: SessionDto;
  try {
    session = (await api<SessionDto>("/auth/login", { method: "POST", auth: false, body: { email: str(fd, "email") ?? "", password: fd.get("password") ?? "" } })).data;
  } catch (err) {
    return fromError(err, formValues(fd));
  }
  await setSession(session.token, session.expiresAt);
  redirect(safeNext(str(fd, "next")));
}

export async function register(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (fd.get("terms") !== "on") {
    return { ok: false, message: "Agree to the terms and privacy policy to create an account.", fieldErrors: { terms: ["Required"] }, values: formValues(fd) };
  }
  let session: SessionDto;
  try {
    session = (
      await api<SessionDto>("/auth/register", {
        method: "POST",
        auth: false,
        body: { name: str(fd, "name") ?? "", email: str(fd, "email") ?? "", password: fd.get("password") ?? "" },
      })
    ).data;
  } catch (err) {
    return fromError(err, formValues(fd));
  }
  await setSession(session.token, session.expiresAt);
  redirect(safeNext(str(fd, "next")));
}

export async function logout() {
  const jar = await cookies();
  const idToken = jar.get(COOKIES.idToken)?.value;
  await clearSession();
  if (AUTH_MODE === "oidc") {
    // RP-initiated logout so the provider session ends too; falls back to a local sign-out.
    let target: string | null = null;
    try {
      const config = await oidcConfig();
      const params: Record<string, string> = { post_logout_redirect_uri: settings().appUrl, client_id: settings().clientId };
      if (idToken) params.id_token_hint = idToken;
      target = client.buildEndSessionUrl(config, params).toString();
    } catch {
      target = null;
    }
    if (target) redirect(target);
  }
  redirect("/");
}

/** Saves the visitor's location choice (city/state or ZIP) in a cookie used to pre-fill searches. */
export async function setLocation(fd: FormData) {
  const zip = str(fd, "zip");
  const [city, state] = (str(fd, "place") ?? "").split("|");
  const value =
    zip && /^\d{5}$/.test(zip)
      ? { zip, label: `ZIP ${zip}` }
      : city && state
        ? { city, state, label: `${city}, ${state}` }
        : null;
  const jar = await cookies();
  if (value) jar.set(LOCATION_COOKIE, JSON.stringify(value), { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  else jar.delete(LOCATION_COOKIE);
  let back = str(fd, "back");
  if (!back) {
    const referer = (await headers()).get("referer");
    try {
      back = referer ? new URL(referer).pathname : undefined;
    } catch {
      back = undefined;
    }
  }
  redirect(back && back.startsWith("/") && !back.startsWith("//") ? back : "/");
}
