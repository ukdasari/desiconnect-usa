import { Inject, Injectable, Logger } from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify, SignJWT, type JWTPayload } from "jose";
import { APP_CONFIG, type AppConfig } from "../config/config.module";

export interface VerifiedClaims {
  sub: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
}

interface Discovery {
  issuer: string;
  jwks_uri: string;
}

const LOCAL_ISSUER = "desiconnect-api";
const ASYMMETRIC_ALGS = ["RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512", "EdDSA"];

/**
 * Issues and verifies bearer tokens.
 * - AUTH_MODE=local: HS256 tokens signed with JWT_SECRET, issued by this API (development and tests).
 * - AUTH_MODE=oidc: tokens from an external OpenID Connect provider (Auth0, Clerk, Cognito, Entra ID…).
 *   Keys come from the provider's discovery document (jwks_uri), so key rotation is automatic.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly secret: Uint8Array;
  private readonly clientIds: string[];
  private discovery: Promise<Discovery> | null = null;
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.secret = new TextEncoder().encode(config.JWT_SECRET);
    this.clientIds = config.OIDC_CLIENT_IDS.split(",").map((s) => s.trim()).filter(Boolean);
  }

  get mode() {
    return this.config.AUTH_MODE;
  }

  get requireVerifiedEmail() {
    return this.config.OIDC_REQUIRE_VERIFIED_EMAIL;
  }

  async signLocal(userId: string, email: string): Promise<{ token: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + this.config.JWT_TTL_SECONDS * 1000);
    const token = await new SignJWT({ email })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(`local:${userId}`)
      .setIssuer(LOCAL_ISSUER)
      .setIssuedAt()
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.secret);
    return { token, expiresAt };
  }

  /** Verifies the bearer token used on every API request (an access token in OIDC mode). */
  async verify(token: string): Promise<VerifiedClaims> {
    let payload: JWTPayload;
    if (this.config.AUTH_MODE === "local") {
      ({ payload } = await jwtVerify(token, this.secret, { issuer: LOCAL_ISSUER, algorithms: ["HS256"] }));
    } else {
      const { issuer, jwks } = await this.keys();
      ({ payload } = await jwtVerify(token, jwks, {
        issuer,
        audience: this.config.OIDC_AUDIENCE || undefined,
        algorithms: ASYMMETRIC_ALGS,
        clockTolerance: 30,
      }));
    }
    return this.claims(payload);
  }

  /**
   * Verifies an OIDC ID token from one of our registered clients. Used once, at POST /auth/session,
   * to learn the user's email and name (access tokens often don't carry them).
   */
  async verifyIdToken(idToken: string): Promise<VerifiedClaims> {
    if (this.config.AUTH_MODE !== "oidc") throw new Error("ID tokens are only used in OIDC mode");
    const { issuer, jwks } = await this.keys();
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer,
      audience: this.clientIds,
      algorithms: ASYMMETRIC_ALGS,
      clockTolerance: 30,
    });
    return this.claims(payload);
  }

  private claims(payload: JWTPayload): VerifiedClaims {
    if (!payload.sub) throw new Error("Token has no subject");
    const verified = payload.email_verified;
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      // Some providers send "true"/"false" strings (e.g. Cognito).
      emailVerified: typeof verified === "boolean" ? verified : verified === "true" ? true : verified === "false" ? false : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  }

  private async keys() {
    const discovery = await this.loadDiscovery();
    this.jwks ??= createRemoteJWKSet(new URL(discovery.jwks_uri), { cooldownDuration: 30_000, cacheMaxAge: 10 * 60_000 });
    return { issuer: discovery.issuer, jwks: this.jwks };
  }

  private loadDiscovery(): Promise<Discovery> {
    this.discovery ??= (async () => {
      const base = this.config.OIDC_ISSUER.replace(/\/$/, "");
      const res = await fetch(`${base}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`OIDC discovery failed (${res.status})`);
      const doc = (await res.json()) as Partial<Discovery>;
      if (!doc.issuer || !doc.jwks_uri) throw new Error("OIDC discovery document is missing issuer or jwks_uri");
      // The token `iss` must match the configured issuer exactly (modulo a trailing slash some providers add).
      if (doc.issuer.replace(/\/$/, "") !== base) throw new Error(`OIDC issuer mismatch: discovery says ${doc.issuer}`);
      return doc as Discovery;
    })().catch((err) => {
      this.discovery = null; // retry on the next request
      this.logger.error({ err }, "OIDC discovery failed");
      throw err;
    });
    return this.discovery;
  }
}
