import { NextResponse, type NextRequest } from "next/server";
import { AUTH_MODE, client, COOKIES, oidcConfig, redirectUri, sessionCookies, toTokenSet } from "@/lib/oidc";

const API_URL = process.env.API_URL ?? "http://localhost:4000/api/v1";

function fail(req: NextRequest, code: string) {
  const res = NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(code)}`, req.url));
  res.cookies.delete(COOKIES.flow);
  return res;
}

/**
 * Completes the OIDC sign-in: validates state/nonce/PKCE and the ID token (openid-client), then asks the API to
 * establish the platform account (POST /auth/session), and finally stores tokens in httpOnly cookies.
 */
export async function GET(req: NextRequest) {
  if (AUTH_MODE !== "oidc") return NextResponse.redirect(new URL("/login", req.url));
  const providerError = req.nextUrl.searchParams.get("error");
  if (providerError) return fail(req, providerError === "access_denied" ? "cancelled" : "provider_error");

  const raw = req.cookies.get(COOKIES.flow)?.value;
  if (!raw) return fail(req, "expired");
  let flow: { verifier: string; state: string; nonce: string; next: string };
  try {
    flow = JSON.parse(raw);
  } catch {
    return fail(req, "expired");
  }

  let tokenSet;
  try {
    const config = await oidcConfig();
    // Rebuild the callback URL from the configured redirect URI so proxies/hosts can't change it.
    const current = new URL(redirectUri());
    current.search = req.nextUrl.search;
    const tokens = await client.authorizationCodeGrant(config, current, {
      pkceCodeVerifier: flow.verifier,
      expectedState: flow.state,
      expectedNonce: flow.nonce,
      idTokenExpected: true,
    });
    tokenSet = toTokenSet(tokens);
  } catch {
    return fail(req, "sign_in_failed");
  }

  const session = await fetch(`${API_URL}/auth/session`, {
    method: "POST",
    headers: { authorization: `Bearer ${tokenSet.bearer}`, "content-type": "application/json" },
    body: JSON.stringify({ idToken: tokenSet.idToken }),
    cache: "no-store",
  }).catch(() => null);
  if (!session) return fail(req, "api_unavailable");
  if (session.status === 403) return fail(req, "email_unverified");
  if (!session.ok) return fail(req, "account_error");

  const res = NextResponse.redirect(new URL(flow.next || "/account", req.url));
  for (const [name, value, opts] of sessionCookies(tokenSet)) res.cookies.set(name, value, opts);
  res.cookies.delete(COOKIES.flow);
  return res;
}
