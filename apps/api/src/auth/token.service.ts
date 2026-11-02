import { Inject, Injectable } from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify, SignJWT, type JWTPayload } from "jose";
import { APP_CONFIG, type AppConfig } from "../config/config.module";

export interface VerifiedClaims {
  sub: string;
  email?: string;
  name?: string;
}

/**
 * Issues and verifies bearer tokens.
 * - AUTH_MODE=local: HS256 tokens signed with JWT_SECRET, issued by this API.
 * - AUTH_MODE=oidc: RS256/ES256 tokens from an external OIDC provider, verified against its JWKS.
 */
@Injectable()
export class TokenService {
  private readonly secret: Uint8Array;
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private static readonly LOCAL_ISSUER = "desiconnect-api";

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.secret = new TextEncoder().encode(config.JWT_SECRET);
  }

  get mode() {
    return this.config.AUTH_MODE;
  }

  async signLocal(userId: string, email: string): Promise<{ token: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + this.config.JWT_TTL_SECONDS * 1000);
    const token = await new SignJWT({ email })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(`local:${userId}`)
      .setIssuer(TokenService.LOCAL_ISSUER)
      .setIssuedAt()
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.secret);
    return { token, expiresAt };
  }

  async verify(token: string): Promise<VerifiedClaims> {
    let payload: JWTPayload;
    if (this.config.AUTH_MODE === "local") {
      ({ payload } = await jwtVerify(token, this.secret, { issuer: TokenService.LOCAL_ISSUER, algorithms: ["HS256"] }));
    } else {
      this.jwks ??= createRemoteJWKSet(new URL(`${this.config.OIDC_ISSUER.replace(/\/$/, "")}/.well-known/jwks.json`));
      ({ payload } = await jwtVerify(token, this.jwks, {
        issuer: this.config.OIDC_ISSUER,
        audience: this.config.OIDC_AUDIENCE || undefined,
      }));
    }
    if (!payload.sub) throw new Error("Token has no subject");
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  }
}
