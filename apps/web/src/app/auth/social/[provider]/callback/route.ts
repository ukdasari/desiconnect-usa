import { NextResponse, type NextRequest } from "next/server";
import type { SessionDto } from "@desiconnect/contracts";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/session";
import { SOCIAL_COOKIE, socialRedirectUri } from "@/lib/social";

/** The provider sends the browser back here with ?code&state. The API swaps the code for a session. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const raw = req.cookies.get(SOCIAL_COOKIE)?.value;
  let flow: { p: string; state: string; verifier?: string; next: string } | null = null;
  try {
    flow = raw ? JSON.parse(raw) : null;
  } catch {
    flow = null;
  }
  const fail = (code: string, message?: string) => {
    const qs = new URLSearchParams({ error: code, next: flow?.next ?? "/account" });
    if (message) qs.set("message", message.slice(0, 300));
    const res = NextResponse.redirect(new URL(`/login?${qs}`, req.url));
    res.cookies.delete(SOCIAL_COOKIE);
    return res;
  };

  const q = req.nextUrl.searchParams;
  if (q.get("error")) return fail(q.get("error") === "access_denied" ? "cancelled" : "provider_error");
  if (!flow || flow.p !== provider || !q.get("state") || q.get("state") !== flow.state) return fail("expired");
  const code = q.get("code");
  if (!code) return fail("provider_error");

  try {
    const { data } = await api<SessionDto>("/auth/social", {
      method: "POST",
      auth: false,
      body: { provider, code, codeVerifier: flow.verifier, redirectUri: socialRedirectUri(provider as "google") },
    });
    await setSession(data.token, data.expiresAt);
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return fail("social_refused", err.message);
    return fail("api_unavailable");
  }
  const res = NextResponse.redirect(new URL(flow.next, req.url));
  res.cookies.delete(SOCIAL_COOKIE);
  return res;
}
