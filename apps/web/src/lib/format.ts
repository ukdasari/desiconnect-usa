import type { ListingSummaryDto } from "@desiconnect/contracts";

const TZ = "America/Chicago";

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...opts }).format(new Date(iso));
}

export function formatEventWhen(startIso: string, endIso: string | null) {
  const start = new Date(startIso);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric" }).format(start);
  const time = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(d);
  return endIso ? `${day}, ${time(start)} – ${time(new Date(endIso))}` : `${day}, ${time(start)}`;
}

export function dateBlock(iso: string) {
  const d = new Date(iso);
  return {
    month: new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short" }).format(d),
    day: new Intl.DateTimeFormat("en-US", { timeZone: TZ, day: "numeric" }).format(d),
    weekday: new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d),
  };
}

export function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  if (diff < 60) return "just now";
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
  if (diff < 86400 * 30) return rtf.format(-Math.round(diff / 86400), "day");
  return formatDate(iso);
}

export function money(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

export function salary(job: NonNullable<ListingSummaryDto["job"]>) {
  if (job.salaryMin === null && job.salaryMax === null) return null;
  const per = job.salaryPeriod ? ` / ${job.salaryPeriod.toLowerCase()}` : "";
  if (job.salaryMin !== null && job.salaryMax !== null) return `${money(job.salaryMin)}–${money(job.salaryMax)}${per}`;
  return `${money((job.salaryMin ?? job.salaryMax)!)}${per}`;
}

export function placeLabel(loc: { city: string; state: string }) {
  return `${loc.city}, ${loc.state}`;
}

export function enumText(value: string) {
  const s = value.toLowerCase().replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Where a listing's page lives. */
export function listingHref(l: { slug: string }) {
  return `/listings/${l.slug}`;
}
