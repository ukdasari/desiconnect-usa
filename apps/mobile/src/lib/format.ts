import type { ListingSummaryDto } from "@desiconnect/contracts";

const TZ = "America/Chicago";

export const money = (n: number) => `$${n.toLocaleString("en-US")}`;

export function enumText(value: string) {
  const s = value.toLowerCase().replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...opts }).format(new Date(iso));
}

export function formatEventWhen(startIso: string, endIso: string | null) {
  const day = formatDate(startIso, { weekday: "short", month: "short", day: "numeric" });
  const t = (iso: string) => formatDate(iso, { hour: "numeric", minute: "2-digit" });
  return endIso ? `${day}, ${t(startIso)} – ${t(endIso)}` : `${day}, ${t(startIso)}`;
}

export function dateParts(iso: string) {
  return { month: formatDate(iso, { month: "short" }), day: formatDate(iso, { day: "numeric" }) };
}

export function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  if (diff < 86400 * 30) return `${Math.round(diff / 86400)} d ago`;
  return formatDate(iso);
}

export function salary(job: NonNullable<ListingSummaryDto["job"]>) {
  if (job.salaryMin === null && job.salaryMax === null) return null;
  const per = job.salaryPeriod ? ` / ${job.salaryPeriod.toLowerCase()}` : "";
  if (job.salaryMin !== null && job.salaryMax !== null) return `${money(job.salaryMin)}–${money(job.salaryMax)}${per}`;
  return `${money((job.salaryMin ?? job.salaryMax)!)}${per}`;
}

export function priceLine(l: ListingSummaryDto): string | null {
  if (l.property) return `${money(l.property.price)}${l.property.transactionType === "SALE" ? "" : " / month"}`;
  if (l.job) return salary(l.job);
  return l.priceText;
}
