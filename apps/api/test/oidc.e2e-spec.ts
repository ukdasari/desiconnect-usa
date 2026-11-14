// OIDC mode: a mock identity provider (discovery document + JWKS over HTTP, real RSA keys) issues tokens
// and the API must accept only the right ones. Env is switched before the app module is loaded.
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { exportJWK, generateKeyPair, SignJWT, type JWTPayload, type KeyLike } from "jose";
import type { TestContext } from "./helpers";

const AUDIENCE = "https://api.desiconnect.test";
const WEB_CLIENT = "web-client";
const V = "/api/v1";

let server: Server;
let issuer: string;
let key: KeyLike;
let otherKey: KeyLike;
let ctx: TestContext;

async function token(claims: JWTPayload & { sub: string }, opts: { aud?: string | string[]; exp?: string | number; iss?: string; signWith?: KeyLike } = {}) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setIssuer(opts.iss ?? issuer)
    .setAudience(opts.aud ?? AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? "10m")
    .sign(opts.signWith ?? key);
}

/** Access token for the API plus the ID token for the web client, as a real provider returns them. */
async function signInTokens(sub: string, idClaims: JWTPayload) {
  return {
    access: await token({ sub, scope: "openid profile email" }),
    id: await token({ sub, ...idClaims }, { aud: WEB_CLIENT }),
  };
}

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  key = pair.privateKey;
  otherKey = (await generateKeyPair("RS256")).privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  server = createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.url === "/.well-known/openid-configuration") res.end(JSON.stringify({ issuer, jwks_uri: `${issuer}/jwks` }));
    else if (req.url === "/jwks") res.end(JSON.stringify({ keys: [jwk] }));
    else {
      res.statusCode = 404;
      res.end("{}");
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  Object.assign(process.env, {
    AUTH_MODE: "oidc",
    OIDC_ISSUER: issuer,
    OIDC_AUDIENCE: AUDIENCE,
    OIDC_CLIENT_IDS: `${WEB_CLIENT},mobile-client`,
    BOOTSTRAP_ADMIN_EMAILS: "boss@oidc.test",
  });
  const helpers = await import("./helpers");
  ctx = await helpers.createTestApp();
});

afterAll(async () => {
  await ctx?.app.close();
  server?.close();
});

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

describe("OIDC sign-in", () => {
  it("advertises OIDC mode and disables local passwords", async () => {
    const cfg = await ctx.http.get(`${V}/auth/config`).expect(200);
    expect(cfg.body.data).toMatchObject({ mode: "oidc", issuer, audience: AUDIENCE });
    await ctx.http.post(`${V}/auth/login`).send({ email: "user@1stopdesi.example", password: "DemoPass123!" }).expect(403);
    await ctx.http.post(`${V}/auth/register`).send({ name: "New", email: "n@oidc.test", password: "long-enough-1" }).expect(403);
  });

  it("creates the account on first session and accepts the access token afterwards", async () => {
    const t = await signInTokens("auth0|alice", { email: "Alice@OIDC.test", email_verified: true, name: "Alice Rao" });
    // A valid token alone isn't enough until the session has been established.
    await ctx.http.get(`${V}/me`).set(bearer(t.access)).expect(401);
    const session = await ctx.http.post(`${V}/auth/session`).set(bearer(t.access)).send({ idToken: t.id }).expect(200);
    expect(session.body.data).toMatchObject({ email: "alice@oidc.test", name: "Alice Rao", roles: ["CONSUMER"] });
    const me = await ctx.http.get(`${V}/me`).set(bearer(t.access)).expect(200);
    expect(me.body.data.id).toBe(session.body.data.id);
    // Second sign-in is idempotent.
    const again = await ctx.http.post(`${V}/auth/session`).set(bearer(t.access)).send({ idToken: t.id }).expect(200);
    expect(again.body.data.id).toBe(session.body.data.id);
  });

  it("links a pre-existing account by verified email", async () => {
    const t = await signInTokens("google-oauth2|demo-user", { email: "user@1stopdesi.example", email_verified: true });
    const session = await ctx.http.post(`${V}/auth/session`).set(bearer(t.access)).send({ idToken: t.id }).expect(200);
    const demo = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "user@1stopdesi.example" } });
    expect(session.body.data.id).toBe(demo.id);
    expect(demo.authSubject).toBe("google-oauth2|demo-user");
  });

  it("grants the bootstrap admin role by email", async () => {
    const t = await signInTokens("auth0|boss", { email: "boss@oidc.test", email_verified: true });
    const session = await ctx.http.post(`${V}/auth/session`).set(bearer(t.access)).send({ idToken: t.id }).expect(200);
    expect(session.body.data.roles).toContain("ADMIN");
    await ctx.http.get(`${V}/admin/stats`).set(bearer(t.access)).expect(200);
  });

  it("rejects unverified emails, including attempts to claim an existing account", async () => {
    const fresh = await signInTokens("auth0|unverified", { email: "new-unverified@oidc.test", email_verified: false });
    const res = await ctx.http.post(`${V}/auth/session`).set(bearer(fresh.access)).send({ idToken: fresh.id }).expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    const takeover = await signInTokens("auth0|attacker", { email: "admin@1stopdesi.example", email_verified: false });
    await ctx.http.post(`${V}/auth/session`).set(bearer(takeover.access)).send({ idToken: takeover.id }).expect(403);
    const admin = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "admin@1stopdesi.example" } });
    expect(admin.authSubject).not.toBe("auth0|attacker");
  });

  it("requires an email from the provider", async () => {
    const access = await token({ sub: "auth0|no-email" });
    const res = await ctx.http.post(`${V}/auth/session`).set(bearer(access)).send({}).expect(401);
    expect(res.body.error.message).toContain("email");
  });

  it("rejects tokens with the wrong audience, issuer, signature or expiry", async () => {
    const id = await token({ sub: "auth0|x", email: "x@oidc.test", email_verified: true }, { aud: WEB_CLIENT });
    const cases = [
      await token({ sub: "auth0|x" }, { aud: "https://someone-else.example" }),
      await token({ sub: "auth0|x" }, { iss: "https://evil.example" }),
      await token({ sub: "auth0|x" }, { signWith: otherKey }),
      await token({ sub: "auth0|x" }, { exp: Math.floor(Date.now() / 1000) - 120 }),
    ];
    for (const bad of cases) {
      await ctx.http.post(`${V}/auth/session`).set(bearer(bad)).send({ idToken: id }).expect(401);
    }
  });

  it("rejects an ID token for another user or another client", async () => {
    const access = await token({ sub: "auth0|carol" });
    const otherUser = await token({ sub: "auth0|mallory", email: "carol@oidc.test", email_verified: true }, { aud: WEB_CLIENT });
    await ctx.http.post(`${V}/auth/session`).set(bearer(access)).send({ idToken: otherUser }).expect(401);
    const otherClient = await token({ sub: "auth0|carol", email: "carol@oidc.test", email_verified: true }, { aud: "unknown-client" });
    await ctx.http.post(`${V}/auth/session`).set(bearer(access)).send({ idToken: otherClient }).expect(401);
  });

  it("enforces ownership the same way for OIDC users", async () => {
    const owner = await signInTokens("auth0|owner", { email: "owner@oidc.test", email_verified: true });
    const other = await signInTokens("auth0|other", { email: "other@oidc.test", email_verified: true });
    await ctx.http.post(`${V}/auth/session`).set(bearer(owner.access)).send({ idToken: owner.id }).expect(200);
    await ctx.http.post(`${V}/auth/session`).set(bearer(other.access)).send({ idToken: other.id }).expect(200);
    const helpers = await import("./helpers");
    const created = await ctx.http.post(`${V}/listings`).set(bearer(owner.access)).send(helpers.eventPayload()).expect(201);
    await ctx.http.patch(`${V}/listings/${created.body.data.id}`).set(bearer(other.access)).send({ title: "Not my listing at all" }).expect(403);
  });
});
