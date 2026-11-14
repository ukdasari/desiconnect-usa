// Local OpenID Connect provider for development and E2E tests (DEVELOPMENT ONLY — accepts any password).
//
//   pnpm oidc:dev        → http://localhost:4400
//
// Sign in with any username and any password. The username decides the identity:
//   - "priya@example.com"       → email priya@example.com (verified)
//   - "priya"                   → email priya@dev.desiconnect.test (verified)
//   - "unverified-..."          → email marked as NOT verified (to test the API's rejection)
//
// Issues JWT access tokens for the 1StopDesi API (audience OIDC_DEV_AUDIENCE) plus ID and refresh tokens,
// exactly like Auth0/Clerk/Cognito would. Supports PKCE, refresh tokens and RP-initiated logout.
import Provider from "oidc-provider";

const PORT = Number(process.env.OIDC_DEV_PORT ?? 4400);
const ISSUER = process.env.OIDC_DEV_ISSUER ?? `http://localhost:${PORT}`;
const AUDIENCE = process.env.OIDC_DEV_AUDIENCE ?? "https://api.desiconnect.local";
const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const ACCESS_TTL = Number(process.env.OIDC_DEV_ACCESS_TTL ?? 300);
const SCOPES = "openid profile email offline_access api";

if (process.env.NODE_ENV === "production") {
  console.error("oidc-dev must never run in production");
  process.exit(1);
}

function titleCase(s) {
  return s.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

const configuration = {
  clients: [
    {
      client_id: "desiconnect-web",
      token_endpoint_auth_method: "none",
      redirect_uris: [`${APP_URL}/auth/callback`],
      post_logout_redirect_uris: [APP_URL, `${APP_URL}/`],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    {
      client_id: "desiconnect-mobile",
      token_endpoint_auth_method: "none",
      application_type: "native",
      redirect_uris: ["onestopdesi://auth/callback"],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
  ],
  pkce: { required: () => true },
  scopes: SCOPES.split(" "),
  claims: { openid: ["sub"], email: ["email", "email_verified"], profile: ["name"] },
  // Put email/name in the ID token itself (the API reads them from there).
  conformIdTokenClaims: false,
  cookies: { keys: ["desiconnect-oidc-dev-only-key"] },
  ttl: { AccessToken: ACCESS_TTL, IdToken: 3600, RefreshToken: 30 * 24 * 3600, Session: 30 * 24 * 3600, Grant: 30 * 24 * 3600, Interaction: 600 },
  async findAccount(_ctx, id) {
    const login = String(id).trim().toLowerCase();
    const email = login.includes("@") ? login : `${login}@dev.desiconnect.test`;
    return {
      accountId: login,
      async claims() {
        return { sub: `dev|${login}`, email, email_verified: !login.startsWith("unverified"), name: titleCase(login.split("@")[0]) };
      },
    };
  },
  features: {
    devInteractions: { enabled: true },
    rpInitiatedLogout: { enabled: true },
    resourceIndicators: {
      enabled: true,
      defaultResource: () => AUDIENCE,
      useGrantedResource: () => true,
      getResourceServerInfo: (_ctx, resource) => {
        if (resource !== AUDIENCE) throw new Error(`Unknown resource ${resource}`);
        return { scope: "api", audience: AUDIENCE, accessTokenFormat: "jwt", accessTokenTTL: ACCESS_TTL, jwt: { sign: { alg: "RS256" } } };
      },
    },
  },
  // Auto-approve consent for our own clients (first-party apps don't show a consent screen).
  async loadExistingGrant(ctx) {
    const grantId = ctx.oidc.result?.consent?.grantId || ctx.oidc.session.grantIdFor(ctx.oidc.client.clientId);
    if (grantId) return ctx.oidc.provider.Grant.find(grantId);
    const grant = new ctx.oidc.provider.Grant({ clientId: ctx.oidc.client.clientId, accountId: ctx.oidc.session.accountId });
    grant.addOIDCScope("openid profile email offline_access");
    grant.addOIDCClaims(["email", "email_verified", "name"]);
    grant.addResourceScope(AUDIENCE, "api");
    await grant.save();
    return grant;
  },
  async issueRefreshToken(_ctx, client) {
    return client.grantTypeAllowed("refresh_token");
  },
};

const provider = new Provider(ISSUER, configuration);
provider.listen(PORT, () => {
  console.log(`1StopDesi dev OIDC provider: ${ISSUER} (any username/password; audience ${AUDIENCE}; access token TTL ${ACCESS_TTL}s)`);
});
