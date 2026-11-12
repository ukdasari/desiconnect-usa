import { NextResponse, type NextRequest } from "next/server";
import { SOCIAL_PROVIDERS, type SocialProvider } from "@desiconnect/contracts";
import { AUTH_MODE, client, cookieOptions } from "@/lib/oidc";
import { authorizeUrl, oidcConnections, SOCIAL_COOKIE, socialProviders } from "@/lib/social";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

/** Starts "Continue with Google / Facebook / X". */
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const back = (code: string) => NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}&error=${code}`, req.url));
  if (!SOCIAL_PROVIDERS.includes(provider as SocialProvider)) return back("social_unavailable");
  const p = provider as SocialProvider;

  if (AUTH_MODE === "oidc") {
    const connection = oidcConnections()[p];
    if (!connection) return back("social_unavailable");
    return NextResponse.redirect(new URL(`/auth/login?${new URLSearchParams({ next, connection })}`, req.url));
  }

  const enabled = (await socialProviders()).find((s) => s.provider === p);
  if (!enabled) return back("social_unavailable");
  const state = client.randomState();
  const verifier = client.randomPKCECodeVerifier();
  const challenge = await client.calculatePKCECodeChallenge(verifier);
  const res = NextResponse.redirect(authorizeUrl(p, enabled.clientId, state, challenge));
  res.cookies.set(SOCIAL_COOKIE, JSON.stringify({ p, state, verifier: p === "facebook" ? undefined : verifier, next }), cookieOptions(600));
  return res;
}
