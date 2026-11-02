import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { APP_SCHEME, OIDC_CLIENT_ID, OIDC_REDIRECT_PATH, OIDC_SCOPES } from "./config";

WebBrowser.maybeCompleteAuthSession();

export interface OidcSettings {
  issuer: string;
  audience: string | null;
}

export interface OidcTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  /** Epoch seconds. */
  expiresAt: number;
}

export const redirectUri = () => AuthSession.makeRedirectUri({ scheme: APP_SCHEME, path: OIDC_REDIRECT_PATH });

function toTokens(r: AuthSession.TokenResponse, previous?: Partial<OidcTokens>): OidcTokens {
  return {
    accessToken: r.accessToken,
    idToken: r.idToken ?? previous?.idToken,
    refreshToken: r.refreshToken ?? previous?.refreshToken,
    expiresAt: (r.issuedAt ?? Math.floor(Date.now() / 1000)) + (r.expiresIn ?? 3600),
  };
}

/**
 * Authorization code flow with PKCE in the system browser (ASWebAuthenticationSession / Custom Tabs).
 * Returns null if the user cancels.
 */
export async function signInWithProvider(settings: OidcSettings, opts: { signup?: boolean } = {}): Promise<OidcTokens | null> {
  const discovery = await AuthSession.fetchDiscoveryAsync(settings.issuer);
  const extraParams: Record<string, string> = {};
  if (settings.audience) extraParams.audience = settings.audience;
  if (opts.signup) extraParams.screen_hint = "signup";
  const request = new AuthSession.AuthRequest({
    clientId: OIDC_CLIENT_ID,
    redirectUri: redirectUri(),
    scopes: OIDC_SCOPES,
    usePKCE: true,
    responseType: AuthSession.ResponseType.Code,
    extraParams,
  });
  const result = await request.promptAsync(discovery);
  if (result.type === "cancel" || result.type === "dismiss") return null;
  if (result.type !== "success") throw new Error(result.type === "error" ? (result.error?.description ?? "Sign-in failed") : "Sign-in failed");
  const tokens = await AuthSession.exchangeCodeAsync(
    { clientId: OIDC_CLIENT_ID, code: result.params.code!, redirectUri: redirectUri(), extraParams: { code_verifier: request.codeVerifier! } },
    discovery,
  );
  return toTokens(tokens);
}

export async function refreshTokens(settings: OidcSettings, current: OidcTokens): Promise<OidcTokens> {
  if (!current.refreshToken) throw new Error("No refresh token");
  const discovery = await AuthSession.fetchDiscoveryAsync(settings.issuer);
  const tokens = await AuthSession.refreshAsync({ clientId: OIDC_CLIENT_ID, refreshToken: current.refreshToken }, discovery);
  return toTokens(tokens, current);
}

/** Ends the provider session (RP-initiated logout) when the provider supports it. Best effort. */
export async function endProviderSession(settings: OidcSettings, idToken?: string) {
  try {
    const discovery = await AuthSession.fetchDiscoveryAsync(settings.issuer);
    if (!discovery.endSessionEndpoint) return;
    const url = new URL(discovery.endSessionEndpoint);
    url.searchParams.set("client_id", OIDC_CLIENT_ID);
    url.searchParams.set("post_logout_redirect_uri", redirectUri());
    if (idToken) url.searchParams.set("id_token_hint", idToken);
    await WebBrowser.openAuthSessionAsync(url.toString(), redirectUri());
  } catch {
    // Local sign-out already happened; the provider session will expire on its own.
  }
}
