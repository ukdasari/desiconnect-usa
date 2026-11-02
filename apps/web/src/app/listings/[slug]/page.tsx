import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Building2, CalendarDays, Globe, Languages, Mail, MapPin, Phone, Users } from "lucide-react";
import { REGULATED_DISCLAIMER, type ListingDetailDto } from "@desiconnect/contracts";
import { CategoryIcon } from "@/components/category-icon";
import { InquiryForm, ReportForm, ReviewForm, RsvpForm } from "@/components/forms";
import { FavoriteButton } from "@/components/listing";
import { Alert, Badge, ButtonLink, DemoBadge, VerificationBadge } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { enumText, formatDate, formatEventWhen, money, salary } from "@/lib/format";
import { getMe } from "@/lib/session";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return (await apiOrNull<ListingDetailDto>(`/listings/${encodeURIComponent(slug)}`))?.data ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await load((await params).slug);
  return l ? { title: l.title, description: l.excerpt } : { title: "Listing not found" };
}

const CTA: Record<string, { heading: string; button: string; placeholder: string }> = {
  SERVICE: { heading: "Request a quote or callback", button: "Send request", placeholder: "Describe what you need, when, and any details that help the provider quote accurately." },
  PROPERTY: { heading: "Contact the owner", button: "Send message", placeholder: "Introduce yourself, your move-in date and any questions about the property." },
  EVENT: { heading: "Ask the organizer", button: "Send question", placeholder: "Ask about parking, food, accessibility or group tickets." },
  JOB: { heading: "Ask the employer", button: "Send question", placeholder: "Ask about the role, visa sponsorship or the interview process." },
  RESOURCE: { heading: "Contact", button: "Send message", placeholder: "How can they help?" },
};

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;
  const [listing, me] = await Promise.all([load(slug), getMe()]);
  if (!listing) notFound();
  const l = listing;
  const back = `/listings/${l.slug}`;
  const isOwner = me?.id === l.ownerId;
  const cta = CTA[l.kind] ?? CTA.SERVICE!;
  const full = !!(l.event?.capacity && l.event.registeredCount >= l.event.capacity);

  return (
    <div className="container-page py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-2">
        <Link href={`/c/${l.category.slug}`} className="hover:underline">{l.category.name}</Link>
        {l.subcategory ? (
          <>
            <span aria-hidden className="mx-2">/</span>
            <Link href={`/c/${l.category.slug}?category=${l.subcategory.slug}`} className="hover:underline">{l.subcategory.name}</Link>
          </>
        ) : null}
      </nav>

      {isOwner && l.status !== "PUBLISHED" ? (
        <Alert className="mt-4" tone={l.status === "REJECTED" ? "danger" : "warning"} title={`Only you can see this listing (${enumText(l.status).toLowerCase()})`}>
          {l.rejectionReason ? <>Moderator note: {l.rejectionReason}. </> : null}
          <Link href={`/provider/listings/${l.id}`}>Manage this listing</Link>
        </Alert>
      ) : null}
      {l.isDemo ? (
        <Alert className="mt-4" tone="info" title="This is demonstration content">
          It shows how listings work on DesiConnect. The business, contact details and any license number are not real.
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_24rem]">
        <article>
          <div className="flex items-start gap-4">
            <CategoryIcon icon={l.category.icon} slug={l.category.slug} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {l.provider ? <VerificationBadge status={l.provider.verification} /> : null}
                {l.isDemo ? <DemoBadge /> : null}
              </div>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">{l.title}</h1>
              {l.provider ? (
                <p className="mt-2 text-ink-2">
                  by <Link href={`/providers/${l.provider.id}`} className="font-semibold text-ink hover:underline">{l.provider.businessName}</Link>
                </p>
              ) : l.job ? (
                <p className="mt-2 text-ink-2">{l.job.company}</p>
              ) : null}
            </div>
            <FavoriteButton listing={l} back={back} signedIn={!!me} />
          </div>

          <dl className="mt-8 grid gap-x-8 gap-y-4 rounded-3xl border border-line bg-surface p-6 sm:grid-cols-2">
            {l.event ? (
              <>
                <Fact icon={CalendarDays} label="When">{formatEventWhen(l.event.startAt, l.event.endAt)}</Fact>
                <Fact icon={MapPin} label="Where">{l.event.venue}, {l.location.city}, {l.location.state}</Fact>
                <Fact icon={Users} label="Attending">
                  {l.event.registeredCount}{l.event.capacity ? ` of ${l.event.capacity} spots` : " registered"}
                </Fact>
                <Fact label="Tickets">{l.event.isFree ? "Free" : (l.priceText ?? "Paid")}</Fact>
              </>
            ) : null}
            {l.job ? (
              <>
                <Fact icon={Building2} label="Company">{l.job.company}</Fact>
                <Fact label="Type">{enumText(l.job.employmentType)}, {enumText(l.job.workArrangement).toLowerCase()}</Fact>
                <Fact label="Pay">{salary(l.job) ?? "Not listed"}</Fact>
                <Fact icon={MapPin} label="Location">{l.job.workArrangement === "REMOTE" ? "Remote (USA)" : `${l.location.city}, ${l.location.state}`}</Fact>
              </>
            ) : null}
            {l.property ? (
              <>
                <Fact label={l.property.transactionType === "SALE" ? "Price" : "Rent"}>
                  {money(l.property.price)}{l.property.transactionType === "SALE" ? "" : " / month"}
                </Fact>
                <Fact label="Home">
                  {enumText(l.property.propertyType)}
                  {l.property.beds !== null ? `, ${l.property.beds} bed` : ""}
                  {l.property.baths !== null ? `, ${l.property.baths} bath` : ""}
                  {l.property.sqft ? `, ${l.property.sqft.toLocaleString("en-US")} sq ft` : ""}
                </Fact>
                <Fact icon={MapPin} label="Area">{l.location.city}, {l.location.state}</Fact>
                <Fact label="Available">{l.property.availableFrom ? formatDate(l.property.availableFrom) : "Ask the owner"}</Fact>
              </>
            ) : null}
            {l.kind === "SERVICE" ? (
              <>
                <Fact icon={MapPin} label="Based in">{l.location.city}, {l.location.state}</Fact>
                {l.priceText ? <Fact label="Pricing">{l.priceText}</Fact> : null}
              </>
            ) : null}
            {l.languages.length ? <Fact icon={Languages} label="Languages">{l.languages.join(", ")}</Fact> : null}
          </dl>

          <section className="mt-8">
            <h2 className="text-xl font-bold">About</h2>
            <p className="prose-measure mt-3 whitespace-pre-line leading-relaxed">{l.description}</p>
            {l.job?.skills.length || l.tags.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {(l.job?.skills.length ? l.job.skills : l.tags).map((t) => <Badge key={t}>{t}</Badge>)}
              </div>
            ) : null}
          </section>

          {l.regulated ? (
            <section className="mt-8">
              <h2 className="text-xl font-bold">Licenses and verification</h2>
              {l.credentials.length ? (
                <ul className="mt-3 divide-y divide-line rounded-3xl border border-line bg-surface">
                  {l.credentials.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div>
                        <p className="font-semibold">{enumText(c.type)}</p>
                        <p className="text-sm text-ink-2">
                          {c.jurisdiction} license {c.licenseNumber}
                          {c.issuingAuthority ? `, ${c.issuingAuthority}` : ""}
                          {c.expiresAt ? `, expires ${formatDate(c.expiresAt)}` : ""}
                        </p>
                      </div>
                      {c.reviewStatus === "VERIFIED" ? (
                        <Badge tone="leaf"><BadgeCheck className="size-3.5" aria-hidden />Checked {c.reviewedAt ? formatDate(c.reviewedAt) : ""}</Badge>
                      ) : (
                        <Badge tone="marigold">Not yet checked</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-ink-2">This provider hasn&rsquo;t submitted a license yet.</p>
              )}
              <p className="mt-3 text-sm text-ink-2">{REGULATED_DISCLAIMER}</p>
            </section>
          ) : null}

          <section className="mt-10">
            <h2 className="text-xl font-bold">Reviews</h2>
            {l.ratingCount ? (
              <p className="mt-1 text-ink-2">{l.ratingAverage} out of 5 from {l.ratingCount} {l.ratingCount === 1 ? "review" : "reviews"}</p>
            ) : (
              <p className="mt-1 text-ink-2">No reviews yet. Reviews appear after moderation; we never add ratings that customers didn&rsquo;t write.</p>
            )}
            <ul className="mt-4 space-y-4">
              {l.reviews.map((r) => (
                <li key={r.id} className="rounded-2xl border border-line bg-surface p-4">
                  <p className="font-semibold">{r.rating} / 5 <span className="font-normal text-ink-2">from {r.authorName}, {formatDate(r.createdAt)}</span></p>
                  <p className="mt-1">{r.body}</p>
                </li>
              ))}
            </ul>
            {me && !isOwner && l.status === "PUBLISHED" ? (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold underline">Write a review</summary>
                <div className="mt-3 max-w-lg"><ReviewForm listingId={l.id} back={back} /></div>
              </details>
            ) : null}
          </section>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {l.kind === "JOB" && !isOwner ? (
            <div className="rounded-3xl border border-line bg-surface p-6">
              <h2 className="text-lg font-bold">Apply for this job</h2>
              <p className="mt-1 text-sm text-ink-2">Upload your resume and an optional note. You&rsquo;ll see status updates under My requests.</p>
              <ButtonLink href={me ? `/listings/${l.slug}/apply` : `/login?next=${encodeURIComponent(`/listings/${l.slug}/apply`)}`} className="mt-4 w-full">
                Apply now
              </ButtonLink>
            </div>
          ) : null}
          {l.kind === "EVENT" && !isOwner && l.status === "PUBLISHED" ? (
            <div className="rounded-3xl border border-line bg-surface p-6">
              <h2 className="text-lg font-bold">{full ? "This event is full" : "Save your spot"}</h2>
              {l.event?.ticketUrl ? (
                <p className="mt-1 text-sm text-ink-2">Tickets are sold by the organizer. <a href={l.event.ticketUrl} rel="noopener noreferrer nofollow" target="_blank" className="font-semibold text-ink underline">Buy tickets</a></p>
              ) : null}
              <div className="mt-4"><RsvpForm listingId={l.id} back={back} signedIn={!!me} full={full} /></div>
            </div>
          ) : null}

          {!isOwner && l.status === "PUBLISHED" ? (
            <div className="rounded-3xl border border-line bg-surface p-6">
              <h2 className="text-lg font-bold">{cta.heading}</h2>
              <p className="mt-1 text-sm text-ink-2">We only share your details with this {l.kind === "PROPERTY" ? "owner" : l.kind === "JOB" ? "employer" : "provider"} after you agree.</p>
              <div className="mt-4">
                <InquiryForm listingId={l.id} back={back} signedIn={!!me} ctaLabel={cta.button} placeholder={cta.placeholder} />
              </div>
            </div>
          ) : null}

          {l.contactPhone || l.website || l.contactEmail ? (
            <div className="rounded-3xl border border-line p-6 text-sm">
              <h2 className="font-semibold">Direct contact</h2>
              <ul className="mt-2 space-y-1.5 text-ink-2">
                {l.contactPhone ? <li className="flex items-center gap-2"><Phone className="size-4" aria-hidden /><a href={`tel:${l.contactPhone}`} className="hover:underline">{l.contactPhone}</a></li> : null}
                {l.contactEmail ? <li className="flex items-center gap-2"><Mail className="size-4" aria-hidden /><a href={`mailto:${l.contactEmail}`} className="break-all hover:underline">{l.contactEmail}</a></li> : null}
                {l.website ? <li className="flex items-center gap-2"><Globe className="size-4" aria-hidden /><a href={l.website} rel="noopener noreferrer nofollow" target="_blank" className="break-all hover:underline">{l.website.replace(/^https?:\/\//, "")}</a></li> : null}
              </ul>
            </div>
          ) : null}

          {me && !isOwner ? (
            <details className="px-1 text-sm">
              <summary className="cursor-pointer text-ink-2 underline">Report this listing</summary>
              <div className="mt-3"><ReportForm listingId={l.id} back={back} /></div>
            </details>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, children }: { icon?: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-sm text-ink-2">
        {Icon ? <Icon className="size-4" aria-hidden /> : null}
        {label}
      </dt>
      <dd className="mt-0.5 font-semibold">{children}</dd>
    </div>
  );
}
