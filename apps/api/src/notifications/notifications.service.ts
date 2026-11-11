import { InjectQueue } from "@nestjs/bullmq";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import type { Queue } from "bullmq";
import { APP_CONFIG, type AppConfig } from "../config/config.module";
import { PrismaService } from "../common/prisma.service";
import { EmailService } from "./email.service";

export const NOTIFICATIONS_QUEUE = "notifications";

export interface NotificationJob {
  userId: string;
  eventType:
    | "inquiry.created"
    | "inquiry.responded"
    | "application.submitted"
    | "application.status_changed"
    | "event.registered"
    | "listing.approved"
    | "listing.rejected"
    | "provider.verified"
    | "provider.rejected"
    | "claim.submitted"
    | "claim.approved"
    | "claim.rejected"
    | "alert.match"
    | "alert.digest";
  title: string;
  body: string;
  payload?: Record<string, string>;
  /** Email version, when it should differ from title/body (digests). */
  email?: { subject: string; text: string; html?: string };
}

/** Alerts follow the user's Notification settings; account notifications always go out. */
const isAlert = (eventType: string) => eventType.startsWith("alert.");

/**
 * Queues notifications through BullMQ (Redis). The worker stores an in-app notification and
 * hands email delivery to the configured transport. With NOTIFICATIONS_INLINE=true (tests,
 * no Redis) the job is processed synchronously.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly email: EmailService,
    @Optional() @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue?: Queue<NotificationJob>,
  ) {}

  async notify(job: NotificationJob): Promise<void> {
    if (this.queue && !this.config.NOTIFICATIONS_INLINE) {
      try {
        await this.queue.add(job.eventType, job, { attempts: 5, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: 1000 });
        return;
      } catch (err) {
        this.logger.warn({ err }, "Queue unavailable, delivering notification inline");
      }
    }
    await this.deliver(job);
  }

  /** Called by the worker (or inline). */
  async deliver(job: NotificationJob): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: job.userId }, select: { email: true, alertEmails: true, alertPush: true, deletedAt: true } });
    if (!user || user.deletedAt) return;
    await this.prisma.notification.create({
      data: { userId: job.userId, channel: "IN_APP", eventType: job.eventType, title: job.title, body: job.body, payload: job.payload, status: "SENT", sentAt: new Date() },
    });
    const alert = isAlert(job.eventType);
    if (!alert || user.alertEmails) {
      const unsubscribeUrl = alert ? this.email.unsubscribeUrl(job.userId) : undefined;
      const text = job.email?.text ?? job.body;
      await this.email.send({
        to: user.email,
        subject: job.email?.subject ?? job.title,
        text: unsubscribeUrl ? `${text}\n\n—\nStop these emails: ${unsubscribeUrl}\nManage alerts: ${this.config.WEB_URL.replace(/\/$/, "")}/account/alerts` : text,
        html: job.email?.html,
        unsubscribeUrl,
      });
    }
    if (!alert || user.alertPush) await this.sendPush(job);
  }

  /** Mobile push through Expo's push service. Invalid tokens are removed. */
  private async sendPush(job: NotificationJob): Promise<void> {
    if (this.config.PUSH_PROVIDER !== "expo") return;
    const devices = await this.prisma.deviceToken.findMany({ where: { userId: job.userId } });
    if (!devices.length) return;
    const messages = devices.map((d) => ({
      to: d.token,
      title: job.title,
      body: job.body,
      sound: "default",
      data: { eventType: job.eventType, ...(job.payload ?? {}) },
    }));
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...(this.config.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${this.config.EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Expo push failed (${res.status})`); // BullMQ retries
    const body = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
    const dead = (body.data ?? [])
      .map((ticket, i) => (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? devices[i]?.token : null))
      .filter((t): t is string => !!t);
    if (dead.length) await this.prisma.deviceToken.deleteMany({ where: { token: { in: dead } } });
  }
}
