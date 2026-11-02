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

  /** Exchanges an OIDC token for a platform user (creating it on first sign-in). */
  async establishSession(token: string): Promise<MeDto> {
    let claims: VerifiedClaims;
    try {
      claims = await this.tokens.verify(token);
    } catch {
      throw unauthenticated("Invalid or expired token");
    }
    const user = await this.resolveClaims(claims, true);
    if (!user) throw unauthenticated("Account not found");
    return this.me(user.id);
  }

  /** Used by AuthGuard on every request. Returns null for unknown subjects. */
  async authenticate(token: string): Promise<AuthUser | null> {
    let claims: VerifiedClaims;
    try {
      claims = await this.tokens.verify(token);
    } catch {
      return null;
    }
    return this.resolveClaims(claims, this.tokens.mode === "oidc");
  }

  private async resolveClaims(claims: VerifiedClaims, createIfMissing: boolean): Promise<AuthUser | null> {
    let user = await this.prisma.user.findUnique({ where: { authSubject: claims.sub }, include: userInclude });
    if (!user && createIfMissing) {
      if (!claims.email) throw unauthenticated("Identity provider token must include an email claim");
      const email = claims.email.toLowerCase();
      user = await this.prisma.user.upsert({
        where: { email },
        update: { authSubject: claims.sub },
        create: {
          authSubject: claims.sub,
          email,
          name: claims.name ?? null,
          roles: { create: this.initialRoles(email).map((role) => ({ role })) },
        },
        include: userInclude,
      });
    }
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
