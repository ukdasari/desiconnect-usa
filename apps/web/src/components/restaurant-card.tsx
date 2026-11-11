import Link from "next/link";
import { ArrowRight, MapPin, Navigation } from "lucide-react";
import type { ListingSummaryDto } from "@desiconnect/contracts";
import { cn } from "@/lib/cn";
import { cuisineLabel, cuisineStyle, featureTags } from "@/lib/cuisine";
import { listingHref } from "@/lib/format";
import { FavoriteButton } from "./listing";
import { DemoBadge, VerificationBadge } from "./ui";

function directionsUrl(l: ListingSummaryDto) {
  const q = [l.title, l.location.addressLine, l.location.city, l.location.state].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Restaurant result card: cuisine icon band, name, address and feature badges. */
export function RestaurantCard({ listing: l, back, signedIn }: { listing: ListingSummaryDto; back: string; signedIn: boolean }) {
  const tags = l.tags ?? [];
  const style = cuisineStyle(tags);
  const label = cuisineLabel(tags) ?? l.subcategory?.name ?? "Restaurant";
  const features = featureTags(tags).filter((f) => f.label !== label).slice(0, 4);
  const Icon = style.icon;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(14,59,67,0.45)]">
      {/* band */}
      <div className={cn("relative h-14 bg-gradient-to-br", style.band)}>
        <svg className="absolute inset-0 h-full w-full text-white/15" aria-hidden focusable="false">
          <defs>
            <pattern id={`dots-${l.id}`} width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="9" cy="9" r="1.4" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#dots-${l.id})`} />
        </svg>
        <span className="absolute -bottom-5 left-5 inline-flex size-10 items-center justify-center rounded-xl border-[3px] border-surface bg-surface shadow-md" aria-hidden>
          <span className={cn("inline-flex size-full items-center justify-center rounded-lg", style.tone)}>
            <Icon className="size-[18px]" />
          </span>
        </span>
        <div className="absolute right-2 top-2 z-10 rounded-full bg-surface/90 backdrop-blur">
          <FavoriteButton listing={l} back={back} signedIn={signedIn} />
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col px-5 pb-5 pt-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">{label}</span>
          {l.provider ? <VerificationBadge status={l.provider.verification} /> : null}
          {l.isDemo ? <DemoBadge /> : null}
        </div>
        <h3 className="mt-1 text-lg font-bold leading-snug">
          <Link href={listingHref(l)} className="after:absolute after:inset-0 after:z-0 hover:underline">
            {l.title}
          </Link>
        </h3>
        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-ink-2">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {l.location.addressLine ? `${l.location.addressLine}, ` : ""}
            {l.location.city}, {l.location.state}
            {l.distanceMiles !== null ? <span className="text-ink-2/80"> · {l.distanceMiles} mi</span> : null}
          </span>
        </p>

        {features.length ? (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Features">
            {features.map(({ label: f, style: s }) => {
              const FIcon = s.icon;
              return (
                <li key={f} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", s.tone)}>
                  <FIcon className="size-3.5" aria-hidden /> {f}
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-peacock-2 group-hover:gap-2 dark:text-marigold">
            View details <ArrowRight className="size-4 transition-all" aria-hidden />
          </span>
          <a
            href={directionsUrl(l)}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-2 hover:border-ink-2 hover:text-ink"
            aria-label={`Directions to ${l.title} (opens Google Maps)`}
          >
            <Navigation className="size-3.5" aria-hidden /> Directions
          </a>
        </div>
      </div>
    </article>
  );
}
