import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Alert, Prisma } from "@desiconnect/database";
import {
  ALERT_TOPICS,
  MAX_ALERTS_PER_USER,
  getAlertTopic,
  topicMatches,
  type AlertDto,
  type CreateAlertInput,
  type NotificationSettingsDto,
  createAlertSchema,
} from "@desiconnect/contracts";
import type { z } from "zod";
import type { AuthUser } from "../auth/auth.types";
import { badRequest, conflict, notFound } from "../common/errors";
import { PrismaService } from "../common/prisma.service";
import { APP_CONFIG, type AppConfig } from "../config/config.module";
import { NotificationsService } from "../notifications/notifications.service";
import { GeoService } from "../search/geo.service";

const DIGEST_ITEMS = 8;
/** A weekly alert is due once this much time has passed since its last digest. */
const DIGEST_INTERVAL_MS = 6.5 * 24 * 3600 * 1000;

const listingForAlerts = {
  category: { select: { slug: true, name: true, parent: { select: { slug: true } } } },
  location: { select: { city: true, state: true, latitude: true, longitude: true } },
} satisfies Prisma.ListingInclude;
type ListingRow = Prisma.ListingGetPayload<{ include: typeof listingForAlerts }>;

function miles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

/** Topic and area both match. Listings without coordinates only match area-less alerts or the same city. */
export function alertMatches(alert: Alert, l: ListingRow): boolean {
  const topic = getAlertTopic(alert.topic);
  if (!topic || !topicMatches(topic, l.category.slug, l.category.parent?.slug)) return false;
  if (alert.latitude == null || alert.longitude == null) {
    if (!alert.city && !alert.state) return true;
    if (alert.city) return l.location?.city?.toLowerCase() === alert.city.toLowerCase();
    return l.location?.state === alert.state;
  }
  if (l.location?.latitude == null || l.location.longitude == null) return false;
  return miles(alert.latitude, alert.longitude, l.location.latitude, l.location.longitude) <= alert.radiusMiles;
}

function toDto(a: Alert): AlertDto {
  return {
    id: a.id,
    topic: a.topic,
    topicLabel: getAlertTopic(a.topic)?.label ?? a.topic,
    locationLabel: a.locationLabel,
    radiusMiles: a.radiusMiles,
    frequency: a.frequency,
    createdAt: a.createdAt.toISOString(),
  };
}

/**
 * "Get alerts": users follow a topic near a place. New listings trigger instant alerts when an admin publishes
 * them; weekly alerts are collected into one digest per user, sent when the digest endpoint is called
 * (Cloud Scheduler, Sunday mornings).
 */
@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly notifications: NotificationsService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private get web() {
    return this.config.WEB_URL.replace(/\/$/, "");
  }

  // ---- user-facing --------------------------------------------------------------------------------

  async list(user: AuthUser): Promise<AlertDto[]> {
    const rows = await this.prisma.alert.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return rows.map(toDto);
  }

  async create(user: AuthUser, input: z.output<typeof createAlertSchema> | CreateAlertInput): Promise<AlertDto> {
    const data = createAlertSchema.parse(input);
    const topic = getAlertTopic(data.topic)!;
    if ((await this.prisma.alert.count({ where: { userId: user.id } })) >= MAX_ALERTS_PER_USER) {
      throw conflict(`You can have up to ${MAX_ALERTS_PER_USER} alerts. Remove one first.`);
    }
    const hasPlace = !!(data.city || data.zip || data.state);
    const point = hasPlace ? await this.geo.resolve({ city: data.city, state: data.state, zip: data.zip }) : null;
    if (data.city && !data.state && !point) throw badRequest("Add the state too, so we can find that city");
    const label = point?.label ?? (data.city ? `${data.city}${data.state ? `, ${data.state}` : ""}` : (data.state ?? null));
    const dup = await this.prisma.alert.findFirst({
      where: { userId: user.id, topic: data.topic, locationLabel: label, radiusMiles: point ? data.radiusMiles : undefined },
    });
    if (dup) throw conflict("You already have this alert");
    const row = await this.prisma.alert.create({
      data: {
        userId: user.id,
        topic: data.topic,
        city: data.city ?? null,
        state: data.state ?? null,
        zipCode: data.zip ?? null,
        radiusMiles: data.radiusMiles,
        latitude: point?.latitude ?? null,
        longitude: point?.longitude ?? null,
        locationLabel: label,
        frequency: data.frequency ?? topic.defaultFrequency,
        lastDigestAt: new Date(),
      },
    });
    return toDto(row);
  }

  async update(user: AuthUser, id: string, frequency: "INSTANT" | "WEEKLY"): Promise<AlertDto> {
    const a = await this.prisma.alert.findFirst({ where: { id, userId: user.id } });
    if (!a) throw notFound("Alert");
    return toDto(await this.prisma.alert.update({ where: { id }, data: { frequency } }));
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const { count } = await this.prisma.alert.deleteMany({ where: { id, userId: user.id } });
    if (!count) throw notFound("Alert");
  }

  async settings(user: AuthUser): Promise<NotificationSettingsDto> {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { alertEmails: true, alertPush: true, email: true } });
    return u;
  }

  async updateSettings(user: AuthUser, input: { alertEmails?: boolean; alertPush?: boolean }): Promise<NotificationSettingsDto> {
    return this.prisma.user.update({ where: { id: user.id }, data: input, select: { alertEmails: true, alertPush: true, email: true } });
  }

  /** One-click unsubscribe from alert emails (from the link in every alert email). */
  async unsubscribe(userId: string): Promise<void> {
    await this.prisma.user.updateMany({ where: { id: userId }, data: { alertEmails: false } });
  }

  // ---- delivery -----------------------------------------------------------------------------------

  /** Instant alerts for a listing that just went live. Never throws: alerts must not break publishing. */
  async onListingPublished(listingId: string): Promise<number> {
    try {
      const l = await this.prisma.listing.findUnique({ where: { id: listingId }, include: listingForAlerts });
      if (!l || l.status !== "PUBLISHED" || l.deletedAt) return 0;
      const topics = ALERT_TOPICS.filter((t) => topicMatches(t, l.category.slug, l.category.parent?.slug)).map((t) => t.key);
      const alerts = await this.prisma.alert.findMany({
        where: { topic: { in: topics }, frequency: "INSTANT", userId: { not: l.ownerId }, user: { deletedAt: null, status: "ACTIVE" } },
      });
      const users = new Set(alerts.filter((a) => alertMatches(a, l)).map((a) => a.userId));
      const where = [l.location?.city, l.location?.state].filter(Boolean).join(", ");
      for (const userId of users) {
        await this.notifications.notify({
          userId,
          eventType: "alert.match",
          title: `New: ${l.title}`,
          body: `${l.category.name}${where ? ` in ${where}` : ""}. ${this.web}/listings/${l.slug}`,
          payload: { listingId: l.id, slug: l.slug },
        });
      }
      return users.size;
    } catch (err) {
      this.logger.error({ err, listingId }, "Instant alerts failed");
      return 0;
    }
  }

  /** Send weekly digests that are due. Returns how many users got one. */
  async sendDigests(now = new Date()): Promise<{ users: number; listings: number }> {
    const due = await this.prisma.alert.findMany({
      where: {
        frequency: "WEEKLY",
        OR: [{ lastDigestAt: null }, { lastDigestAt: { lte: new Date(now.getTime() - DIGEST_INTERVAL_MS) } }],
        user: { deletedAt: null, status: "ACTIVE" },
      },
      orderBy: { userId: "asc" },
    });
    const byUser = new Map<string, Alert[]>();
    for (const a of due) byUser.set(a.userId, [...(byUser.get(a.userId) ?? []), a]);

    let sentUsers = 0;
    let sentListings = 0;
    for (const [userId, alerts] of byUser) {
      const since = new Date(Math.min(...alerts.map((a) => (a.lastDigestAt ?? a.createdAt).getTime())));
      const fresh = await this.prisma.listing.findMany({
        where: { status: "PUBLISHED", deletedAt: null, publishedAt: { gt: since, lte: now }, ownerId: { not: userId } },
        include: listingForAlerts,
        orderBy: { publishedAt: "desc" },
        take: 500,
      });
      const sections = alerts
        .map((a) => ({
          alert: a,
          items: fresh.filter((l) => l.publishedAt! > (a.lastDigestAt ?? a.createdAt) && alertMatches(a, l)).slice(0, DIGEST_ITEMS),
        }))
        .filter((s) => s.items.length);
      await this.prisma.alert.updateMany({ where: { id: { in: alerts.map((a) => a.id) } }, data: { lastDigestAt: now } });
      if (!sections.length) continue; // nothing new: no email (an empty digest teaches people to ignore us)

      const count = new Set(sections.flatMap((s) => s.items.map((l) => l.id))).size;
      const heading = (a: Alert) => `${getAlertTopic(a.topic)?.label ?? a.topic}${a.locationLabel ? ` near ${a.locationLabel}` : ""}`;
      const text = sections
        .map((s) => [heading(s.alert), ...s.items.map((l) => `• ${l.title}${l.location?.city ? ` (${l.location.city})` : ""}\n  ${this.web}/listings/${l.slug}`)].join("\n"))
        .join("\n\n");
      const html = `<div style="font-family:system-ui,sans-serif;max-width:560px">${sections
        .map(
          (s) =>
            `<h2 style="font-size:16px;margin:24px 0 8px">${esc(heading(s.alert))}</h2><ul style="padding-left:18px;margin:0">${s.items
              .map((l) => `<li style="margin:6px 0"><a href="${this.web}/listings/${esc(l.slug)}">${esc(l.title)}</a>${l.location?.city ? ` <span style="color:#666">· ${esc(l.location.city)}</span>` : ""}</li>`)
              .join("")}</ul>`,
        )
        .join("")}<p style="margin-top:24px;color:#666;font-size:13px"><a href="${this.web}/account/alerts">Manage your alerts</a></p></div>`;
      await this.notifications.notify({
        userId,
        eventType: "alert.digest",
        title: `${count} new ${count === 1 ? "listing" : "listings"} this week`,
        body: sections.map((s) => `${heading(s.alert)}: ${s.items.length}`).join(" · "),
        email: { subject: `This week on 1StopDesi: ${count} new ${count === 1 ? "listing" : "listings"} for you`, text, html },
      });
      sentUsers += 1;
      sentListings += count;
    }
    return { users: sentUsers, listings: sentListings };
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
