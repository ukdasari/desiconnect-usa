import { NextResponse, type NextRequest } from "next/server";
import { AUTH_MODE, client, COOKIES, oidcConfig, sessionCookies, toTokenSet } from "@/lib/oidc";

const PRIVATE = [/^\/account(\/|$)/, /^\/provider(\/|$)/, /^\/admin(\/|$)/, /^\/listings\/[^/]+\/(apply|claim)$/];
const REFRESH_SKEW_SECONDS = 60;

/**
 * Runs before pages and server actions.
 * 1. OIDC mode: refreshes the access token shortly before it expires, so server components always send a valid
 *    bearer to the API. The new cookies are applied to this request and returned to the browser.
 * 2. Redirects signed-out visitors away from private areas. (This only checks for a session; the API verifies the
 *    token and enforces roles and ownership on every request.)
 */
export async function proxy(request: NextRequest) {
  let refreshed: ReturnType<typeof sessionCookies> | null = null;
  let signedOut = false;

  if (AUTH_MODE === "oidc" && request.cookies.has(COOKIES.session)) {
    const exp = Number(request.cookies.get(COOKIES.expires)?.value ?? 0);
    if (!exp || exp - REFRESH_SKEW_SECONDS < Date.now() / 1000) {
      const refreshToken = request.cookies.get(COOKIES.refresh)?.value;
      if (refreshToken) {
        try {
          const tokens = await client.refreshTokenGrant(await oidcConfig(), refreshToken);
          refreshed = sessionCookies(toTokenSet(tokens, { refreshToken, idToken: request.cookies.get(COOKIES.idToken)?.value }));
        } catch {
          signedOut = true; // refresh token revoked or expired
        }
      } else {
        signedOut = true;
      }
    }
  }

  // Make the new state visible to the page rendering for this same request.
  if (refreshed) for (const [name, value] of refreshed) request.cookies.set(name, value);
  if (signedOut) for (const name of [COOKIES.session, COOKIES.refresh, COOKIES.expires, COOKIES.idToken]) request.cookies.delete(name);

  const isPrivate = PRIVATE.some((re) => re.test(request.nextUrl.pathname));
  const hasSession = request.cookies.has(COOKIES.session);
  const res = isPrivate && !hasSession
    ? NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`, request.url))
    : NextResponse.next({ request: { headers: request.headers } });

  if (refreshed) for (const [name, value, opts] of refreshed) res.cookies.set(name, value, opts);
  if (signedOut) for (const name of [COOKIES.session, COOKIES.refresh, COOKIES.expires, COOKIES.idToken]) res.cookies.delete(name);
  return res;
}

export const config = {
  // Everything except static assets, images and the OIDC endpoints themselves.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/|api/resume).*)"],
};
