# Authentication

1StopDesi supports two sign-in modes, chosen with `AUTH_MODE` (read by both the API and the website).

| | `oidc` | `local` |
|---|---|---|
| Use for | **Production** and staging | Development, tests, demos |
| Passwords | Held by your identity provider; 1StopDesi never sees them | bcrypt hashes in `local_credentials` |
| Email verification, password reset, MFA, social sign-in | Provided by the identity provider | Not available |
| Allowed in production | Yes | Only with `ALLOW_LOCAL_AUTH_IN_PRODUCTION=true` (the API refuses to start otherwise) |

## How OIDC sign-in works

```
Browser ── /auth/login ──► Website ── redirect (code flow + PKCE, state, nonce) ──► Identity provider
Browser ◄──────────────── provider sign-in page (password, Google, MFA…) ─────────┘
Browser ── /auth/callback?code ──► Website: exchanges code, validates ID token (openid-client)
                                   └─ POST /api/v1/auth/session  (Bearer access token + { idToken })
                                        API: verifies both against the provider's JWKS, creates or links the account
                                   └─ sets httpOnly cookies: dc_session, dc_refresh, dc_exp, dc_idt
Every request ──► proxy.ts refreshes the access token when < 60 s remain ──► server components call the API with it
Sign out ──► cookies cleared + RP-initiated logout at the provider (end_session_endpoint), back to APP_URL
```

API rules (`apps/api/src/auth`):

- Access tokens are verified with keys from the provider's discovery document (`jwks_uri`): issuer must match
  `OIDC_ISSUER`, audience must match `OIDC_AUDIENCE`, asymmetric algorithms only, 30 s clock tolerance.
- An account is created **only** by `POST /auth/session`. A valid token for an unknown subject gets 401 elsewhere.
- The ID token must be issued to one of `OIDC_CLIENT_IDS` and belong to the same subject as the access token.
- New accounts need an email the provider marks as verified (`email_verified: true`) unless
  `OIDC_REQUIRE_VERIFIED_EMAIL=false`. Linking an identity to an existing account by email **always** requires a verified
  email, so nobody can take over an account by signing up elsewhere with the victim's address.
- `BOOTSTRAP_ADMIN_EMAILS` still grants the admin role on first sign-in.
- Accounts created in local mode are linked automatically the first time the same verified email signs in with OIDC.

Tests: `apps/api/test/oidc.e2e-spec.ts` (mock issuer with real RSA keys: creation, linking, admin bootstrap, unverified
email, takeover attempt, wrong audience / issuer / signature / expiry / subject / client) and
`tests/e2e/specs/oidc.spec.ts` (browser: sign-up, return to page, acting while signed in, silent refresh, provider logout,
unverified email).

## Try it locally (no cloud account)

```bash
pnpm oidc:dev        # dev provider on http://localhost:4400 — any username, any password
```

Then set these for **both** the API and the website and restart them:

```bash
AUTH_MODE=oidc
OIDC_ISSUER=http://localhost:4400
OIDC_AUDIENCE=https://api.desiconnect.local
OIDC_CLIENT_IDS=desiconnect-web,desiconnect-mobile
OIDC_CLIENT_ID=desiconnect-web
OIDC_SCOPES="openid profile email offline_access api"
OIDC_ALLOW_INSECURE=true
APP_URL=http://localhost:3000
```

Sign in as `meera@example.com` (or any name). Usernames starting with `unverified` get an unverified email, to see the
rejection. The dev provider shows a one-time consent screen; click **Continue**. Never deploy it.

## Production setup with Auth0 (recommended)

1. **Create an API** (Applications → APIs): Identifier `https://api.<your-domain>` (this is the audience), signing
   algorithm RS256, and turn on **Allow Offline Access** so refresh tokens are issued.
2. **Create an application** (Applications → Create → Regular Web Application):
   - Allowed Callback URLs: `https://<your-site>/auth/callback`
   - Allowed Logout URLs: `https://<your-site>`
   - Under Advanced → Grant Types: Authorization Code and Refresh Token. Enable refresh token rotation.
3. In tenant Settings → Advanced, enable **RP-Initiated Logout End Session Endpoint Discovery** so sign-out also ends the
   Auth0 session.
4. Database connection: keep email verification on (Auth0 sends the verification email). Add Google or Apple sign-in if you want.
5. Configure:

```bash
# both apps
AUTH_MODE=oidc
OIDC_ISSUER=https://<tenant>.us.auth0.com/          # keep the trailing slash; it must match Auth0's issuer exactly
OIDC_AUDIENCE=https://api.<your-domain>
# API
OIDC_CLIENT_IDS=<web client id>,<mobile client id later>
# website
OIDC_CLIENT_ID=<web client id>
OIDC_CLIENT_SECRET=<web client secret>
OIDC_SCOPES=openid profile email offline_access
APP_URL=https://<your-site>
SESSION_COOKIE_SECURE=true
```

## Other providers

Any provider that supports the authorization code flow with PKCE and publishes a discovery document works. Check each
provider's current documentation for exact menu names; the points that differ are:

- **Access token format.** The API must be able to verify the token it receives. If your provider's access tokens are not
  JWTs addressed to your API, set `OIDC_API_TOKEN=id` on the website and use the client ID as `OIDC_AUDIENCE` on the API,
  so the API verifies the ID token instead.
- **Amazon Cognito.** ID tokens are addressed to the app client; access tokens typically carry `client_id` rather than
  `aud`, so use `OIDC_API_TOKEN=id`. Cognito's discovery document has no standard end-session endpoint, so sign-out ends
  the 1StopDesi session but not the Cognito session.
- **Microsoft Entra ID.** Use the v2.0 issuer and an exposed API scope. Entra doesn't send `email_verified`, so new sign-ups
  are refused while `OIDC_REQUIRE_VERIFIED_EMAIL=true`; only relax it if your tenant guarantees verified emails.
- **Okta, Keycloak, Ping, ZITADEL.** Standard; create an authorization server or API audience and use the default settings.

## Mobile

The mobile app will use the same provider with a native client (`desiconnect-mobile`, redirect `onestopdesi://auth/callback`)
via `expo-auth-session`, then call `POST /auth/session` exactly like the website. Add that client ID to `OIDC_CLIENT_IDS`.
