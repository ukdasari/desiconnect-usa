// OpenID Connect client for the website (authorization code flow + PKCE, via openid-client).
// Works with any standards-compliant provider: Auth0, Clerk, Amazon Cognito, Microsoft Entra ID, Okta, Keycloak…
// Tokens never reach browser JavaScript: they are stored in httpOnly cookies by route handlers / the proxy.
import * as client from "openid-client";

export const AUTH_MODE = (process.env.AUTH_MODE ?? "local") === "oidc" ? "oidc" : "local";

export const COOKIES = {
  session: "dc_session", // bearer token sent to the API (access token, or ID token if OIDC_API_TOKEN=id)
  refresh: "dc_refresh", // refresh token (only if the provider issued one)
  expires: "dc_exp", // epoch seconds when the bearer token expires
  idToken: "dc_idt", // ID token, kept only as a logout hint
  flow: "dc_oidc", // short-lived state/nonce/PKCE verifier for an in-progress sign-in
} as const;

interface OidcSettings {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  audience?: string;
  scopes: string;
  apiToken: "access" | "id";
  appUrl: string;
  allowInsecure: boolean;
}

export function settings(): OidcSettings {
  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  if (!issuer || !clientId) throw new Error("OIDC_ISSUER and OIDC_CLIENT_ID must be set when AUTH_MODE=oidc");
  return {
    issuer,
    clientId,
    clientSecret: process.env.OIDC_CLIENT_SECRET || undefined,
    audience: process.env.OIDC_AUDIENCE || undefined,
    scopes: process.env.OIDC_SCOPES || "openid profile email offline_access",
    apiToken: process.env.OIDC_API_TOKEN === "id" ? "id" : "access",
    appUrl: (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, ""),
    // Plain http is only ever allowed for a loopback issuer (the local dev provider), and only when asked for.
    allowInsecure: process.env.OIDC_ALLOW_INSECURE === "true" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(issuer),
  };
}

let configPromise: Promise<client.Configuration> | null = null;

/** Discovered provider configuration, cached for the process lifetime (retried after a failure). */
export function oidcConfig(): Promise<client.Configuration> {
  configPromise ??= (async () => {
    const s = settings();
    return client.discovery(
      new URL(s.issuer),
      s.clientId,
      s.clientSecret,
      s.clientSecret ? client.ClientSecretPost(s.clientSecret) : client.None(),
      s.allowInsecure ? { execute: [client.allowInsecureRequests] } : undefined,
    );
  })().catch((err) => {
    configPromise = null;
    throw err;
  });
  return configPromise;
}

export const redirectUri = () => `${settings().appUrl}/auth/callback`;

export interface TokenSet {
  bearer: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt: number;
}

/** Picks the token the API verifies and computes its expiry. */
export function toTokenSet(tokens: client.TokenEndpointResponse, previous?: { idToken?: string; refreshToken?: string }): TokenSet {
  const s = settings();
  const idToken = tokens.id_token ?? previous?.idToken;
  const bearer = s.apiToken === "id" ? idToken : tokens.access_token;
  if (!bearer) throw new Error(`Provider did not return an ${s.apiToken === "id" ? "ID" : "access"} token`);
  const expiresIn = typeof tokens.expires_in === "number" ? tokens.expires_in : 3600;
  return {
    bearer,
    idToken,
    // Providers with refresh-token rotation return a new one; otherwise keep the old one.
    refreshToken: tokens.refresh_token ?? previous?.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
  };
}

export function cookieOptions(maxAgeSeconds?: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    path: "/",
    ...(maxAgeSeconds !== undefined ? { maxAge: maxAgeSeconds } : {}),
  };
}

/** Session cookies live as long as the refresh token may (30 days); the bearer is refreshed before it expires. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function sessionCookies(t: TokenSet): [string, string, ReturnType<typeof cookieOptions>][] {
  const opts = cookieOptions(SESSION_MAX_AGE);
  const out: [string, string, ReturnType<typeof cookieOptions>][] = [
    [COOKIES.session, t.bearer, opts],
    [COOKIES.expires, String(t.expiresAt), opts],
  ];
  if (t.refreshToken) out.push([COOKIES.refresh, t.refreshToken, opts]);
  if (t.idToken) out.push([COOKIES.idToken, t.idToken, opts]);
  return out;
}

export { client };
