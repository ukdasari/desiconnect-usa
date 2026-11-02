import Link from "next/link";
import { Bath, BedDouble, Briefcase, Heart, Languages, MapPin, Ruler, Ticket } from "lucide-react";
import type { ListingSummaryDto } from "@desiconnect/contracts";
import { toggleFavorite } from "@/app/actions/engagement";
import { cn } from "@/lib/cn";
import { dateBlock, enumText, formatEventWhen, listingHref, money, placeLabel, salary } from "@/lib/format";
import { CategoryIcon } from "./category-icon";
import { DemoBadge, VerificationBadge } from "./ui";

export function FavoriteButton({ listing, back, signedIn }: { listing: Pick<ListingSummaryDto, "id" | "isFavorite" | "title">; back: string; signedIn: boolean }) {
  const on = !!listing.isFavorite;
  if (!signedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(back)}`} className="inline-flex size-10 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2" aria-label={`Sign in to save ${listing.title}`}>
        <Heart className="size-5" aria-hidden />
      </Link>
    );
  }
  return (
    <form action={toggleFavorite}>
      <input type="hidden" name="listingId" value={listing.id} />
      <input type="hidden" name="on" value={on ? "false" : "true"} />
      <input type="hidden" name="back" value={back} />
      <button
        className={cn("inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-2", on ? "text-kumkum" : "text-ink-2")}
        aria-label={on ? `Remove ${listing.title} from saved` : `Save ${listing.title}`}
        aria-pressed={on}
      >
        <Heart className={cn("size-5", on && "fill-current")} aria-hidden />
      </button>
    </form>
  );
}

function Meta({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-ink-2/80" aria-hidden />
      {children}
    </span>
  );
}

/** One result row. The layout adapts to the listing kind so jobs, rentals and services each show what matters. */
export function ListingRow({ listing, back, signedIn }: { listing: ListingSummaryDto; back: string; signedIn: boolean }) {
  const l = listing;
  return (
    <article className="group relative flex gap-4 border-b border-line py-5 last:border-b-0">
      {l.event ? <DateBlock iso={l.event.startAt} /> : <CategoryIcon icon={l.category.icon} slug={l.category.slug} />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {l.provider ? <VerificationBadge status={l.provider.verification} /> : null}
          {l.isDemo ? <DemoBadge /> : null}
          <span className="text-xs font-medium text-ink-2">{l.subcategory?.name ?? l.category.name}</span>
        </div>
        <h3 className="mt-1 text-lg font-semibold leading-snug">
          <Link href={listingHref(l)} className="after:absolute after:inset-0 hover:underline">
            {l.title}
          </Link>
        </h3>
        {l.provider ? <p className="text-sm text-ink-2">{l.provider.businessName}</p> : null}
        {l.job ? <p className="text-sm text-ink-2">{l.job.company}</p> : null}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
          <Meta icon={MapPin}>
            {l.job?.workArrangement === "REMOTE" ? "Remote" : placeLabel(l.location)}
            {l.distanceMiles !== null ? <span className="text-ink-2/80">({l.distanceMiles} mi)</span> : null}
          </Meta>
          {l.event ? <Meta icon={Ticket}>{formatEventWhen(l.event.startAt, l.event.endAt)}</Meta> : null}
          {l.job ? <Meta icon={Briefcase}>{enumText(l.job.employmentType)}, {enumText(l.job.workArrangement).toLowerCase()}</Meta> : null}
          {l.property ? (
            <>
              {l.property.beds !== null ? <Meta icon={BedDouble}>{l.property.beds} bd</Meta> : null}
              {l.property.baths !== null ? <Meta icon={Bath}>{l.property.baths} ba</Meta> : null}
              {l.property.sqft ? <Meta icon={Ruler}>{l.property.sqft.toLocaleString("en-US")} sq ft</Meta> : null}
            </>
          ) : null}
          {l.languages.length ? <Meta icon={Languages}>{l.languages.slice(0, 4).join(", ")}</Meta> : null}
        </div>
      </div>
      <div className="relative z-10 flex shrink-0 flex-col items-end justify-between gap-2">
        <FavoriteButton listing={l} back={back} signedIn={signedIn} />
        <Price listing={l} />
      </div>
    </article>
  );
}

function Price({ listing: l }: { listing: ListingSummaryDto }) {
  const text = l.property
    ? `${money(l.property.price)}${l.property.transactionType === "SALE" ? "" : "/mo"}`
    : l.job
      ? salary(l.job)
      : l.priceText;
  if (!text) return null;
  return <p className="max-w-40 text-right text-sm font-semibold">{text}</p>;
}

export function DateBlock({ iso, className }: { iso: string; className?: string }) {
  const d = dateBlock(iso);
  return (
    <div className={cn("flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-xl border border-line bg-surface text-center", className)} aria-hidden>
      <span className="w-full bg-kumkum py-0.5 text-[0.7rem] font-bold text-white">{d.month}</span>
      <span className="font-display text-2xl font-bold leading-tight">{d.day}</span>
      <span className="pb-1 text-[0.7rem] text-ink-2">{d.weekday}</span>
    </div>
  );
}

/** Compact item for homepage strips. */
export function ListingMini({ listing: l }: { listing: ListingSummaryDto }) {
  return (
    <Link href={listingHref(l)} className="group flex gap-3 rounded-2xl p-2 -mx-2 hover:bg-surface-2">
      {l.event ? <DateBlock iso={l.event.startAt} /> : <CategoryIcon icon={l.category.icon} slug={l.category.slug} size="md" />}
      <div className="min-w-0">
        <p className="font-semibold leading-snug group-hover:underline">{l.title}</p>
        <p className="mt-0.5 text-sm text-ink-2">
          {l.event ? `${l.event.venue}, ${l.location.city}` : l.job ? `${l.job.company}, ${l.job.workArrangement === "REMOTE" ? "Remote" : l.location.city}` : placeLabel(l.location)}
        </p>
        <p className="mt-0.5 text-sm font-medium">
          {l.property ? `${money(l.property.price)}${l.property.transactionType === "SALE" ? "" : " / month"}` : l.job ? salary(l.job) : l.priceText}
        </p>
      </div>
    </Link>
  );
}
