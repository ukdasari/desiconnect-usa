import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { CATEGORIES, type ClaimDto, type ProviderDashboardDto } from "@desiconnect/contracts";
import { withdrawClaim } from "@/app/actions/engagement";
import { CredentialForm } from "@/components/provider-forms";
import { Alert, Badge, ButtonLink, EmptyState, PageHeader, Stat, VerificationBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { enumText, formatDate, relativeTime } from "@/lib/format";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "Provider dashboard" };

const claimTone = { PENDING: "marigold", APPROVED: "leaf", REJECTED: "kumkum", WITHDRAWN: "neutral" } as const;
const statusTone = { PUBLISHED: "leaf", PENDING_REVIEW: "marigold", REJECTED: "kumkum", DRAFT: "neutral", ARCHIVED: "neutral" } as const;

export default async function ProviderDashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const me = await getMe();
  if (!me) redirect("/login?next=/provider");
  const { welcome } = await searchParams;
  const { data } = await api<ProviderDashboardDto | (Omit<ProviderDashboardDto, "provider"> & { provider: null })>("/provider/dashboard");
  const { provider, listings, stats } = data;
  const claims = provider ? (await api<ClaimDto[]>("/me/claims")).data.filter((c) => c.status !== "WITHDRAWN") : [];
  const regulated = provider?.categories.some((c) => CATEGORIES.find((x) => x.slug === c.slug)?.regulated);

  if (!provider && !listings.length) {
    return (
      <div className="container-page py-10">
        <PageHeader title="Share with the community" description="Choose what you'd like to post. Both are free during the Dallas–Fort Worth pilot." />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-line bg-surface p-6">
            <h2 className="text-xl font-bold">List a business or professional service</h2>
            <p className="mt-2 text-ink-2">Lawyers, agents, doctors, caterers, tutors, contractors and more. Customers send you requests directly.</p>
            <ButtonLink href="/provider/onboarding" className="mt-5">Create business profile</ButtonLink>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-6">
            <h2 className="text-xl font-bold">Post an event, job or property</h2>
            <p className="mt-2 text-ink-2">Organizers, employers and landlords can post without a business profile.</p>
            <ButtonLink href="/provider/listings/new" variant="secondary" className="mt-5">Create a listing</ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <PageHeader title={provider?.businessName ?? "Your listings"} description={provider ? <span className="inline-flex items-center gap-2"><VerificationBadge status={provider.verification} />{provider.verification === "UNVERIFIED" || provider.verification === "REJECTED" ? "Not verified" : null}</span> : "Events, jobs and properties you've posted."}>
        <ButtonLink href="/provider/inquiries" variant="secondary">Requests{stats.newInquiries ? ` (${stats.newInquiries} new)` : ""}</ButtonLink>
        <ButtonLink href="/provider/listings/new"><Plus className="size-4" aria-hidden />New listing</ButtonLink>
      </PageHeader>

      {welcome ? <Alert className="mt-6" tone="success" title="Your business profile is in review">An administrator will verify it shortly. Meanwhile you can create listings; they go live after review.</Alert> : null}
      {provider?.verification === "REJECTED" ? <Alert className="mt-6" tone="danger" title="Verification was not approved">Update your details or submit a valid license below, and we&rsquo;ll review it again.</Alert> : null}

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Live listings" value={stats.activeListings} />
        <Stat label="Waiting for review" value={stats.pendingListings} />
        <Stat label="New requests" value={stats.newInquiries} />
        <Stat label="All requests" value={stats.totalInquiries} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="listings-h">
          <h2 id="listings-h" className="text-xl font-bold">Listings</h2>
          {listings.length ? (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-ink-2">
                  <tr><th className="px-4 py-3 font-semibold">Listing</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Requests</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {listings.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{l.title}</p>
                        <p className="text-ink-2">{l.subcategory?.name ?? l.category.name}{l.isDemo ? ", demo" : ""}</p>
                      </td>
                      <td className="px-4 py-3"><Badge tone={statusTone[l.status]}>{enumText(l.status)}</Badge></td>
                      <td className="px-4 py-3">{l.inquiryCount}</td>
                      <td className="px-4 py-3 text-right"><Link href={`/provider/listings/${l.id}`} className="font-semibold underline">Manage</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-3"><EmptyState title="No listings yet" action={<ButtonLink href="/provider/listings/new">Create your first listing</ButtonLink>} /></div>
          )}
        </section>

        {provider ? (
          <aside className="space-y-6">
            {claims.length ? (
              <section className="rounded-3xl border border-line bg-surface p-5" aria-labelledby="claims-h">
                <h2 id="claims-h" className="font-bold">Listing claims</h2>
                <ul className="mt-3 space-y-3 text-sm">
                  {claims.map((c) => (
                    <li key={c.id}>
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/listings/${c.listing.slug}`} className="font-semibold hover:underline">{c.listing.title}</Link>
                        <Badge tone={claimTone[c.status]}>{c.status === "PENDING" ? "In review" : enumText(c.status)}</Badge>
                      </div>
                      <p className="text-ink-2">Sent {relativeTime(c.createdAt)}{c.reviewNote ? `. ${c.reviewNote}` : ""}</p>
                      {c.status === "PENDING" ? (
                        <form action={withdrawClaim} className="mt-1">
                          <input type="hidden" name="claimId" value={c.id} />
                          <button type="submit" className="text-ink-2 underline hover:text-ink">Withdraw</button>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section className="rounded-3xl border border-line bg-surface p-5">
              <h2 className="font-bold">Licenses and credentials</h2>
              {regulated ? <p className="mt-1 text-sm text-ink-2">Your categories require a state license to be verified.</p> : null}
              {provider.credentials.length ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {provider.credentials.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <span>{enumText(c.type)}, {c.jurisdiction} {c.licenseNumber}{c.expiresAt ? ` (exp. ${formatDate(c.expiresAt)})` : ""}</span>
                      <Badge tone={c.reviewStatus === "VERIFIED" ? "leaf" : c.reviewStatus === "REJECTED" ? "kumkum" : "marigold"}>{enumText(c.reviewStatus)}</Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold underline">Add a credential</summary>
                <div className="mt-3"><CredentialForm /></div>
              </details>
            </section>
            <section className="rounded-3xl border border-line p-5 text-sm">
              <h2 className="font-bold">Public profile</h2>
              <p className="mt-1 text-ink-2">{provider.categories.map((c) => c.name).join(", ")} in {provider.location?.city}, {provider.location?.state}.</p>
              <Link href={`/providers/${provider.id}`} className="mt-2 inline-block font-semibold underline">View as customers see it</Link>
            </section>
          </aside>
        ) : (
          <aside className="rounded-3xl border border-line bg-surface p-5 text-sm">
            <h2 className="font-bold">Offer a professional service?</h2>
            <p className="mt-1 text-ink-2">Create a business profile to list services and get verified.</p>
            <ButtonLink href="/provider/onboarding" variant="secondary" size="sm" className="mt-3">Create business profile</ButtonLink>
          </aside>
        )}
      </div>
    </div>
  );
}
