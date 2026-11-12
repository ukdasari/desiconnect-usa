import { Inject, Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type { LoginInput, MeDto, RegisterInput, Role, SessionDto } from "@desiconnect/contracts";
import { APP_CONFIG, type AppConfig } from "../config/config.module";
import { PrismaService } from "../common/prisma.service";
import { AuditService } from "../audit/audit.service";
import { conflict, forbidden, unauthenticated } from "../common/errors";
import type { AuthUser } from "./auth.types";
import { TokenService, type VerifiedClaims } from "./token.service";

const userInclude = { roles: true, providers: { where: { deletedAt: null }, select: { id: true } } } as const;

@Injectable()
export class AuthService {
  private readonly adminEmails: Set<string>;
  private static dummyHash: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.adminEmails = new Set(
      config.BOOTSTRAP_ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
    );
  }

  private initialRoles(email: string): Role[] {
    return this.adminEmails.has(email) ? ["CONSUMER", "ADMIN"] : ["CONSUMER"];
  }

  async register(input: RegisterInput): Promise<SessionDto> {
    if (this.tokens.mode !== "local") throw forbidden("Registration is handled by the identity provider");
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw conflict("An account with this email already exists");
    const id = randomUUID();
    const user = await this.prisma.user.create({
      data: {
        id,
        authSubject: `local:${id}`,
        email: input.email,
        name: input.name,
        roles: { create: this.initialRoles(input.email).map((role) => ({ role })) },
        localCredential: { create: { passwordHash: await bcrypt.hash(input.password, 12) } },
        consents: { create: [{ type: "TERMS", granted: true }, { type: "PRIVACY", granted: true }] },
      },
      include: userInclude,
    });
    await this.audit.log({ actorId: user.id, action: "user.register", resourceType: "user", resourceId: user.id });
    return this.session(user);
  }

  async login(input: LoginInput): Promise<SessionDto> {
    if (this.tokens.mode !== "local") throw forbidden("Sign-in is handled by the identity provider");
    const user = await this.prisma.user.findUnique({ where: { email: input.email }, include: { ...userInclude, localCredential: true } });
    // Compare against a dummy hash when the user is missing so response time doesn't reveal which emails exist.
    const hash = user?.localCredential?.passwordHash ?? (AuthService.dummyHash ??= bcrypt.hashSync(randomUUID(), 12));
    const ok = await bcrypt.compare(input.password, hash);
    if (!user || !user.localCredential || !ok || user.deletedAt) throw unauthenticated("Email or password is incorrect");
    return this.session(user);
  }

  /**
   * POST /auth/session. Exchanges a verified access token (plus, in OIDC mode, the ID token from the same
   * sign-in) for a platform user, creating or linking it on first sign-in.
   */
  async establishSession(token: string, idToken?: string): Promise<MeDto> {
    let claims: VerifiedClaims;
    try {
      claims = await this.tokens.verify(token);
    } catch {
      throw unauthenticated("Invalid or expired token");
    }
    if (this.tokens.mode === "local") {
      const user = await this.resolveClaims(claims);
      if (!user) throw unauthenticated("Account not found");
      return this.me(user.id);
    }

    // OIDC: identity details come from the ID token when the access token doesn't carry them.
    if (idToken) {
      let id: VerifiedClaims;
      try {
        id = await this.tokens.verifyIdToken(idToken);
      } catch {
        throw unauthenticated("Invalid ID token");
      }
      if (id.sub !== claims.sub) throw unauthenticated("ID token and access token belong to different users");
      claims = { sub: claims.sub, email: claims.email ?? id.email, emailVerified: claims.emailVerified ?? id.emailVerified, name: claims.name ?? id.name };
    }

    const existing = await this.prisma.user.findUnique({ where: { authSubject: claims.sub }, include: userInclude });
    if (existing) {
      if (existing.deletedAt) throw unauthenticated("Account not found");
      return this.me(existing.id);
    }
    if (!claims.email) throw unauthenticated("Your identity provider didn't share an email address. Include the 'email' scope.");
    if (this.tokens.requireVerifiedEmail && claims.emailVerified !== true) {
      throw forbidden("Verify your email address with your sign-in provider, then sign in again.");
    }
    const email = claims.email.toLowerCase();
    // Link to an existing account with the same (verified) email, e.g. one created before switching to OIDC.
    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    if (byEmail && claims.emailVerified !== true) {
      // Never attach an identity to an existing account on the strength of an unverified email.
      throw forbidden("An account with this email already exists. Verify your email with your sign-in provider to link it.");
    }
    if (byEmail?.deletedAt) throw unauthenticated("Account not found");
    const user = byEmail
      ? await this.prisma.user.update({ where: { id: byEmail.id }, data: { authSubject: claims.sub }, include: userInclude })
      : await this.prisma.user.create({
          data: {
            authSubject: claims.sub,
            email,
            name: claims.name ?? null,
            roles: { create: this.initialRoles(email).map((role) => ({ role })) },
            consents: { create: [{ type: "TERMS", granted: true }, { type: "PRIVACY", granted: true }] },
          },
          include: userInclude,
        });
    await this.audit.log({
      actorId: user.id,
      action: byEmail ? "user.link_identity" : "user.register",
      resourceType: "user",
      resourceId: user.id,
      metadata: { provider: "oidc" },
    });
    return this.me(user.id);
  }

  /**
   * Used by AuthGuard on every request. Returns null for invalid tokens or subjects without an account
   * (in OIDC mode the account is created only by POST /auth/session).
   */
  async authenticate(token: string): Promise<AuthUser | null> {
    let claims: VerifiedClaims;
    try {
      claims = await this.tokens.verify(token);
    } catch {
      return null;
    }
    return this.resolveClaims(claims);
  }

  private async resolveClaims(claims: VerifiedClaims): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { authSubject: claims.sub }, include: userInclude });
    if (!user || user.deletedAt) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: [...new Set(user.roles.map((r) => r.role as Role))],
      providerId: user.providers[0]?.id ?? null,
      suspended: user.status === "SUSPENDED",
    };
  }

  /** Session for an existing user (social sign-in). */
  async sessionFor(userId: string): Promise<SessionDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.session(user);
  }

  /** New account from a social sign-in: no password; the linked identity is how they sign in. */
  async createSocialUser(input: { email: string; name: string | null; provider: string; providerUserId: string }) {
    const id = randomUUID();
    return this.prisma.user.create({
      data: {
        id,
        authSubject: `local:${id}`,
        email: input.email,
        name: input.name,
        roles: { create: this.initialRoles(input.email).map((role) => ({ role })) },
        consents: { create: [{ type: "TERMS", granted: true }, { type: "PRIVACY", granted: true }] },
        socialIdentities: { create: { provider: input.provider, providerUserId: input.providerUserId, email: input.email } },
      },
    });
  }

  private async session(user: { id: string; email: string }): Promise<SessionDto> {
    const { token, expiresAt } = await this.tokens.signLocal(user.id, user.email);
    return { token, expiresAt: expiresAt.toISOString(), user: await this.me(user.id) };
  }

  async me(userId: string): Promise<MeDto> {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: userInclude });
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      city: u.city,
      state: u.state,
      zipCode: u.zipCode,
      preferredLanguages: u.preferredLanguages,
      roles: [...new Set(u.roles.map((r) => r.role as Role))],
      providerId: u.providers[0]?.id ?? null,
      suspended: u.status === "SUSPENDED",
      createdAt: u.createdAt.toISOString(),
    };
  }
}
