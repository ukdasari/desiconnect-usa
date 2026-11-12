import "server-only";
import type { AuthConfigDto, SocialProvider } from "@desiconnect/contracts";
import { api } from "./api";
import { AUTH_MODE } from "./oidc";

export const SOCIAL_COOKIE = "dc_social";
export const SOCIAL_LABEL: Record<SocialProvider, string> = { google: "Google", facebook: "Facebook", x: "X" };

export const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
export const socialRedirectUri = (p: SocialProvider) => `${appUrl()}/auth/social/${p}/callback`;

/**
 * Auth0 (AUTH_MODE=oidc) social connection names, e.g. "google=google-oauth2,facebook=facebook,x=twitter".
 * The buttons then go through Auth0 with ?connection=…, skipping its own login page.
 */
export function oidcConnections(): Partial<Record<SocialProvider, string>> {
  const out: Partial<Record<SocialProvider, string>> = {};
  for (const pair of (process.env.OIDC_SOCIAL_CONNECTIONS ?? "").split(",")) {
    const [k, v] = pair.split("=").map((s) => s?.trim());
    if ((k === "google" || k === "facebook" || k === "x") && v) out[k] = v;
  }
  return out;
}

/** Social providers to offer on the sign-in and register pages. */
export async function socialProviders(): Promise<{ provider: SocialProvider; clientId: string }[]> {
  if (AUTH_MODE === "oidc") {
    return Object.keys(oidcConnections()).map((p) => ({ provider: p as SocialProvider, clientId: "" }));
  }
  try {
    const cfg = await api<AuthConfigDto>("/auth/config", { auth: false, revalidate: 300 });
    return cfg.data.social ?? [];
  } catch {
    return [];
  }
}

/** Where to send the browser to start a sign-in with the provider (local mode). */
export function authorizeUrl(p: SocialProvider, clientId: string, state: string, challenge: string): string {
  const redirect_uri = socialRedirectUri(p);
  switch (p) {
    case "google":
      return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: clientId, redirect_uri, response_type: "code", scope: "openid email profile", state,
        code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account",
      })}`;
    case "facebook":
      // Confidential client: the secret stays on the API, so Facebook uses state without PKCE.
      return `https://www.facebook.com/v23.0/dialog/oauth?${new URLSearchParams({
        client_id: clientId, redirect_uri, response_type: "code", scope: "email,public_profile", state,
      })}`;
    case "x":
      return `https://x.com/i/oauth2/authorize?${new URLSearchParams({
        client_id: clientId, redirect_uri, response_type: "code", scope: "tweet.read users.read users.email", state,
        code_challenge: challenge, code_challenge_method: "S256",
      })}`;
  }
}
