import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isUnclaimedListing, type ClaimDto, type ListingDetailDto } from "@desiconnect/contracts";
import { ClaimForm } from "@/components/forms";
import { Alert, ButtonLink } from "@/components/ui";
import { api, apiOrNull } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "Claim this listing" };

export default async function ClaimPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const path = `/listings/${slug}/claim`;
  const me = await getMe();
  if (!me) redirect(`/login?next=${encodeURIComponent(path)}`);
  const listing = (await apiOrNull<ListingDetailDto>(`/listings/${encodeURIComponent(slug)}`))?.data;
  if (!listing) notFound();
  const unclaimed = isUnclaimedListing(listing);
  const pending = me.providerId
    ? (await api<ClaimDto[]>("/me/claims")).data.find((c) => c.listing.id === listing.id && c.status === "PENDING")
    : undefined;

  return (
    <div className="container-page max-w-3xl py-10">
      <Link href={`/listings/${listing.slug}`} className="text-sm text-ink-2 hover:underline">Back to the listing</Link>
      <h1 className="mt-3 text-3xl font-bold">Claim {listing.title}</h1>
      <p className="mt-2 text-ink-2">
        Once confirmed, the listing moves to your business profile. You can update its details, and customers can send you requests through DesiConnect.
      </p>

      {!unclaimed ? (
        <Alert className="mt-6" tone="info" title="Already managed">This listing is already linked to a business. If you think that&rsquo;s wrong, use &ldquo;Report this listing&rdquo; on its page.</Alert>
      ) : !me.providerId ? (
        <div className="mt-8 rounded-3xl border border-line bg-surface p-6 md:p-8">
          <h2 className="text-lg font-bold">Step 1: create your business profile</h2>
          <p className="mt-1 text-sm text-ink-2">Claims are linked to a business profile, so set one up first (it takes about two minutes). Then come back to this page.</p>
          <ButtonLink href="/provider/onboarding" className="mt-4">Create a business profile</ButtonLink>
        </div>
      ) : pending ? (
        <Alert className="mt-6" tone="info" title="Claim waiting for review">
          You sent a claim {relativeTime(pending.createdAt)}. We&rsquo;ll call {pending.phone} to confirm and let you know. You can follow it on your <Link href="/provider" className="font-semibold underline">business dashboard</Link>.
        </Alert>
      ) : (
        <div className="mt-8 rounded-3xl border border-line bg-surface p-6 md:p-8">
          <p className="mb-6 text-sm text-ink-2">
            Claiming as <span className="font-semibold text-ink">{me.name ?? me.email}</span>. A DesiConnect admin checks every claim, usually by calling the business on its public number.
          </p>
          <ClaimForm listingId={listing.id} back={path} defaultPhone={me.phone} />
        </div>
      )}
    </div>
  );
}
