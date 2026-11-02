import { NextResponse, type NextRequest } from "next/server";
import { AUTH_MODE, client, COOKIES, cookieOptions, oidcConfig, redirectUri, settings } from "@/lib/oidc";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

/** Starts an OIDC sign-in: authorization code flow with PKCE, state and nonce. */
export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  if (AUTH_MODE !== "oidc") return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, req.url));

  let config;
  try {
    config = await oidcConfig();
  } catch {
    return NextResponse.redirect(new URL("/login?error=provider_unavailable", req.url));
  }
  const s = settings();
  const verifier = client.randomPKCECodeVerifier();
  const state = client.randomState();
  const nonce = client.randomNonce();
  const params: Record<string, string> = {
    redirect_uri: redirectUri(),
    scope: s.scopes,
    code_challenge: await client.calculatePKCECodeChallenge(verifier),
    code_challenge_method: "S256",
    state,
    nonce,
  };
  if (s.audience) params.audience = s.audience; // Auth0 issues a JWT access token for this API
  if (process.env.OIDC_PROMPT) params.prompt = process.env.OIDC_PROMPT; // e.g. "consent" where refresh tokens require it
  if (req.nextUrl.searchParams.get("signup") === "1") params.screen_hint = "signup"; // Auth0/Clerk hint; ignored elsewhere

  const res = NextResponse.redirect(client.buildAuthorizationUrl(config, params));
  res.cookies.set(COOKIES.flow, JSON.stringify({ verifier, state, nonce, next }), cookieOptions(600));
  return res;
}
