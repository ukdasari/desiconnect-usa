import { Inject, Injectable, Logger } from "@nestjs/common";
import type { SessionDto, SocialProvider, SocialSignInInput } from "@desiconnect/contracts";
import { AuditService } from "../audit/audit.service";
import { badRequest, forbidden, unauthenticated } from "../common/errors";
import { PrismaService } from "../common/prisma.service";
import { APP_CONFIG, type AppConfig } from "../config/config.module";
import { AuthService } from "./auth.service";

/** What we learn from a provider after exchanging the code. */
export interface SocialProfile {
  provider: SocialProvider;
  id: string;
  email: string | null;
  /** The provider vouches that the user controls this address (required to link to an existing account). */
  emailVerified: boolean;
  name: string | null;
}

const FACEBOOK_GRAPH = "https://graph.facebook.com/v23.0";
const TIMEOUT = 10_000;

async function json(res: Response, what: string): Promise<Record<string, unknown>> {
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`${what} failed (${res.status}): ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

/**
 * Sign in with Google, Facebook or X (AUTH_MODE=local). The website (or app) sends the user to the provider and
 * passes the returned code here; this service swaps it for the user's profile using the provider's secret, then
 * signs the user in, creating the account or linking it to an existing one when the provider confirms the email.
 */
@Injectable()
export class SocialAuthService {
  private readonly logger = new Logger(SocialAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Providers with both ID and secret configured, with the public client ID clients need to start the flow. */
  enabled(): { provider: SocialProvider; clientId: string }[] {
    if (this.config.AUTH_MODE !== "local") return [];
    const c = this.config;
    const all: [SocialProvider, string, string][] = [
      ["google", c.GOOGLE_CLIENT_ID, c.GOOGLE_CLIENT_SECRET],
      ["facebook", c.FACEBOOK_APP_ID, c.FACEBOOK_APP_SECRET],
      ["x", c.X_CLIENT_ID, c.X_CLIENT_SECRET],
    ];
    return all.filter(([, id, secret]) => id && secret).map(([provider, clientId]) => ({ provider, clientId }));
  }

  private allowedRedirect(uri: string): boolean {
    const origins = [this.config.WEB_URL, ...this.config.CORS_ORIGINS.split(",")].map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
    return origins.some((o) => uri.startsWith(`${o}/auth/social/`));
  }

  async signIn(input: SocialSignInInput, ip?: string): Promise<SessionDto> {
    if (this.config.AUTH_MODE !== "local") throw forbidden("Sign-in is handled by the identity provider");
    if (!this.enabled().some((p) => p.provider === input.provider)) throw badRequest(`${label(input.provider)} sign-in isn't set up`);
    if (!this.allowedRedirect(input.redirectUri)) throw badRequest("Unexpected redirect address");

    let profile: SocialProfile;
    try {
      profile = await this.fetchProfile(input);
    } catch (err) {
      this.logger.warn({ err: String(err), provider: input.provider }, "social sign-in exchange failed");
      throw unauthenticated(`${label(input.provider)} sign-in didn't complete. Please try again.`);
    }
    return this.complete(profile, ip);
  }

  /** Find, link or create the user for a verified provider profile, then start a session. */
  async complete(profile: SocialProfile, ip?: string): Promise<SessionDto> {
    const name = label(profile.provider);
    const linked = await this.prisma.socialIdentity.findUnique({
      where: { provider_providerUserId: { provider: profile.provider, providerUserId: profile.id } },
      include: { user: true },
    });
    if (linked) {
      if (linked.user.deletedAt || linked.user.status !== "ACTIVE") throw unauthenticated("This account isn't available");
      await this.prisma.socialIdentity.update({ where: { id: linked.id }, data: { lastUsedAt: new Date() } });
      return this.auth.sessionFor(linked.userId);
    }

    if (!profile.email) {
      throw forbidden(`${name} didn't share an email address with us. Add a confirmed email to your ${name} account, or register with email instead.`);
    }
    const email = profile.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.deletedAt || existing.status !== "ACTIVE") throw unauthenticated("This account isn't available");
      // Never attach a login to someone's account unless the provider confirms the email belongs to this person.
      if (!profile.emailVerified) {
        throw forbidden(`An account with ${email} already exists. Sign in with your password, then try ${name} again.`);
      }
      await this.prisma.socialIdentity.create({ data: { userId: existing.id, provider: profile.provider, providerUserId: profile.id, email } });
      await this.audit.log({ actorId: existing.id, action: "user.link_identity", resourceType: "user", resourceId: existing.id, metadata: { provider: profile.provider }, ipAddress: ip });
      return this.auth.sessionFor(existing.id);
    }

    const user = await this.auth.createSocialUser({ email, name: profile.name, provider: profile.provider, providerUserId: profile.id });
    await this.audit.log({ actorId: user.id, action: "user.register", resourceType: "user", resourceId: user.id, metadata: { provider: profile.provider }, ipAddress: ip });
    return this.auth.sessionFor(user.id);
  }

  private async fetchProfile(input: SocialSignInInput): Promise<SocialProfile> {
    const c = this.config;
    switch (input.provider) {
      case "google": {
        const token = await json(
          await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              code: input.code,
              client_id: c.GOOGLE_CLIENT_ID,
              client_secret: c.GOOGLE_CLIENT_SECRET,
              redirect_uri: input.redirectUri,
              ...(input.codeVerifier ? { code_verifier: input.codeVerifier } : {}),
            }),
            signal: AbortSignal.timeout(TIMEOUT),
          }),
          "Google token exchange",
        );
        const me = await json(
          await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
            headers: { authorization: `Bearer ${String(token.access_token)}` },
            signal: AbortSignal.timeout(TIMEOUT),
          }),
          "Google userinfo",
        );
        return { provider: "google", id: String(me.sub), email: str(me.email), emailVerified: me.email_verified === true, name: str(me.name) };
      }
      case "facebook": {
        const q = new URLSearchParams({ client_id: c.FACEBOOK_APP_ID, client_secret: c.FACEBOOK_APP_SECRET, redirect_uri: input.redirectUri, code: input.code });
        if (input.codeVerifier) q.set("code_verifier", input.codeVerifier);
        const token = await json(await fetch(`${FACEBOOK_GRAPH}/oauth/access_token?${q}`, { signal: AbortSignal.timeout(TIMEOUT) }), "Facebook token exchange");
        const me = await json(
          await fetch(`${FACEBOOK_GRAPH}/me?${new URLSearchParams({ fields: "id,name,email", access_token: String(token.access_token) })}`, { signal: AbortSignal.timeout(TIMEOUT) }),
          "Facebook profile",
        );
        // Facebook doesn't say whether the email is confirmed, so it can create accounts but not link to existing ones.
        return { provider: "facebook", id: String(me.id), email: str(me.email), emailVerified: false, name: str(me.name) };
      }
      case "x": {
        const token = await json(
          await fetch("https://api.x.com/2/oauth2/token", {
            method: "POST",
            headers: {
              "content-type": "application/x-www-form-urlencoded",
              authorization: `Basic ${Buffer.from(`${c.X_CLIENT_ID}:${c.X_CLIENT_SECRET}`).toString("base64")}`,
            },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              code: input.code,
              redirect_uri: input.redirectUri,
              code_verifier: input.codeVerifier ?? "",
            }),
            signal: AbortSignal.timeout(TIMEOUT),
          }),
          "X token exchange",
        );
        const me = await json(
          await fetch("https://api.x.com/2/users/me?user.fields=confirmed_email,name", {
            headers: { authorization: `Bearer ${String(token.access_token)}` },
            signal: AbortSignal.timeout(TIMEOUT),
          }),
          "X profile",
        );
        const data = (me.data ?? {}) as Record<string, unknown>;
        const email = str(data.confirmed_email);
        return { provider: "x", id: String(data.id), email, emailVerified: !!email, name: str(data.name) };
      }
    }
  }
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
export const label = (p: SocialProvider) => ({ google: "Google", facebook: "Facebook", x: "X" })[p];
