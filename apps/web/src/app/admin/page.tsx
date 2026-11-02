import type { Metadata } from "next";
import Link from "next/link";
import type { AdminReviewQueueDto, AdminStatsDto } from "@desiconnect/contracts";
import { AdminNav, DecisionForm } from "@/components/admin";
import { Badge, DemoBadge, EmptyState, PageHeader, Stat } from "@/components/ui";
import { api } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-guard";
import { enumText, formatDate, relativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Moderation" };

export default async function AdminPage() {
  await requireAdmin("/admin");
  const [stats, queue] = await Promise.all([
    api<AdminStatsDto>("/admin/stats").then((r) => r.data),
    api<AdminReviewQueueDto>("/admin/review-queue").then((r) => r.data),
  ]);
  const total = queue.listings.length + queue.providers.length + queue.credentials.length + queue.reviews.length;

  return (
    <div className="container-page py-10">
      <PageHeader title="Moderation" description="Dallas–Fort Worth pilot. Approve listings, verify providers and their licenses, and handle reports." />
      <AdminNav current="/admin" />

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Registered users" value={stats.users} hint="Excludes demo accounts" />
        <Stat label="Verified providers" value={stats.providers.verified} hint={`${stats.providers.total} total`} />
        <Stat label="Live listings" value={stats.listings.published} hint={`${stats.listings.demo} are demo`} />
        <Stat label="Waiting for review" value={stats.listings.pending + stats.providers.pending} />
        <Stat label="Requests sent" value={stats.inquiries.total} hint={`${stats.inquiries.last7Days} in the last 7 days`} />
        <Stat label="Open reports" value={<Link href="/admin/reports" className="hover:underline">{stats.openReports}</Link>} />
      </div>

      {total === 0 ? <div className="mt-10"><EmptyState title="The queue is clear">New submissions will appear here.</EmptyState></div> : null}

      {queue.listings.length ? (
        <QueueSection title={`Listings (${queue.listings.length})`}>
          {queue.listings.map((l) => (
            <li key={l.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="peacock">{l.subcategory?.name ?? l.category.name}</Badge>
                  {l.regulated ? <Badge tone="marigold">Licensed category</Badge> : null}
                  {l.isDemo ? <DemoBadge /> : null}
                </div>
                <p className="mt-2 font-semibold"><Link href={`/listings/${l.slug}`} className="hover:underline">{l.title}</Link></p>
                <p className="text-sm text-ink-2">
                  {l.provider ? `${l.provider.businessName} (${enumText(l.provider.verification).toLowerCase()}), ` : ""}
                  {l.ownerEmail}, {l.location.city}, {l.location.state}. Submitted {relativeTime(l.submittedAt)}.
                </p>
                <p className="mt-2 text-sm">{l.excerpt}</p>
              </div>
              <DecisionForm target="listing" id={l.id} />
            </li>
          ))}
        </QueueSection>
      ) : null}

      {queue.providers.length ? (
        <QueueSection title={`Provider profiles (${queue.providers.length})`}>
          {queue.providers.map((p) => (
            <li key={p.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="font-semibold"><Link href={`/providers/${p.id}`} className="hover:underline">{p.businessName}</Link> {p.isDemo ? <DemoBadge /> : null}</p>
                <p className="text-sm text-ink-2">{p.categories.map((c) => c.name).join(", ")}. {p.ownerEmail}, {p.phone}. {p.location ? `${p.location.city}, ${p.location.state}` : ""}</p>
                <p className="mt-2 text-sm">{p.description}</p>
                <p className="mt-2 text-sm text-ink-2">
                  {p.credentials.length ? `Credentials: ${p.credentials.map((c) => `${enumText(c.type)} ${c.jurisdiction} ${c.licenseNumber} (${enumText(c.reviewStatus).toLowerCase()})`).join("; ")}` : "No credentials submitted."}
                </p>
              </div>
              <DecisionForm target="provider" id={p.id} />
            </li>
          ))}
        </QueueSection>
      ) : null}

      {queue.credentials.length ? (
        <QueueSection title={`Credentials to check (${queue.credentials.length})`} note="Look the number up with the issuing state authority before approving.">
          {queue.credentials.map((c) => (
            <li key={c.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="font-semibold">{enumText(c.type)}, {c.jurisdiction} {c.licenseNumber}</p>
                <p className="text-sm text-ink-2">
                  <Link href={`/providers/${c.providerId}`} className="underline">{c.businessName}</Link>
                  {c.issuingAuthority ? `. Issued by ${c.issuingAuthority}` : ""}{c.expiresAt ? `. Expires ${formatDate(c.expiresAt)}` : ""}.
                </p>
              </div>
              <DecisionForm target="credential" id={c.id} />
            </li>
          ))}
        </QueueSection>
      ) : null}

      {queue.reviews.length ? (
        <QueueSection title={`Reviews (${queue.reviews.length})`}>
          {queue.reviews.map((r) => (
            <li key={r.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="font-semibold">{r.rating} / 5 on {r.listingTitle}</p>
                <p className="text-sm text-ink-2">{r.authorName}, {relativeTime(r.createdAt)}</p>
                <p className="mt-2 text-sm">{r.body}</p>
              </div>
              <DecisionForm target="review" id={r.id} />
            </li>
          ))}
        </QueueSection>
      ) : null}
    </div>
  );
}

function QueueSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold">{title}</h2>
      {note ? <p className="mt-1 text-sm text-ink-2">{note}</p> : null}
      <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">{children}</ul>
    </section>
  );
}
