import { createHmac, timingSafeEqual } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config/config.module";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** One-click unsubscribe link (alerts and digests). Adds List-Unsubscribe headers. */
  unsubscribeUrl?: string;
}

/**
 * Sends email through the configured provider. EMAIL_PROVIDER=log (the default) only logs, so development and
 * tests never send real mail. EMAIL_PROVIDER=resend uses Resend's HTTP API.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async send(msg: EmailMessage): Promise<void> {
    if (this.config.EMAIL_PROVIDER !== "resend") {
      this.logger.log({ to: msg.to, subject: msg.subject }, "email (log only)");
      return;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${this.config.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: this.config.EMAIL_FROM,
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        headers: msg.unsubscribeUrl
          ? { "List-Unsubscribe": `<${msg.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
          : undefined,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Email send failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }

  /** Signed, non-expiring token identifying a user for one-click unsubscribe. */
  unsubscribeToken(userId: string): string {
    return `${userId}.${this.sign(userId)}`;
  }

  /** Returns the user id if the token is genuine. */
  verifyUnsubscribeToken(token: string): string | null {
    const [userId, sig] = token.split(".");
    if (!userId || !sig) return null;
    const expected = Buffer.from(this.sign(userId));
    const given = Buffer.from(sig);
    return expected.length === given.length && timingSafeEqual(expected, given) ? userId : null;
  }

  unsubscribeUrl(userId: string): string {
    return `${this.config.WEB_URL.replace(/\/$/, "")}/unsubscribe?token=${encodeURIComponent(this.unsubscribeToken(userId))}`;
  }

  private sign(userId: string): string {
    return createHmac("sha256", `unsubscribe:${this.config.JWT_SECRET}`).update(userId).digest("base64url");
  }
}
