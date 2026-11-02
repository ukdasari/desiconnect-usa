import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ListingDetailDto } from "@desiconnect/contracts";
import { ApplyForm } from "@/components/forms";
import { Alert } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { enumText, salary } from "@/lib/format";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "Apply" };

export default async function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await getMe();
  if (!me) redirect(`/login?next=${encodeURIComponent(`/listings/${slug}/apply`)}`);
  const listing = (await apiOrNull<ListingDetailDto>(`/listings/${encodeURIComponent(slug)}`))?.data;
  if (!listing || listing.kind !== "JOB" || !listing.job) notFound();

  return (
    <div className="container-page max-w-3xl py-10">
      <Link href={`/listings/${listing.slug}`} className="text-sm text-ink-2 hover:underline">Back to the job</Link>
      <h1 className="mt-3 text-3xl font-bold">Apply: {listing.title}</h1>
      <p className="mt-2 text-ink-2">
        {listing.job.company}, {listing.job.workArrangement === "REMOTE" ? "remote" : `${listing.location.city}, ${listing.location.state}`},{" "}
        {enumText(listing.job.employmentType).toLowerCase()}
        {salary(listing.job) ? `, ${salary(listing.job)}` : ""}
      </p>
      {listing.isDemo ? <Alert className="mt-5" tone="info" title="Demo job">This posting is sample data. Applying works, but no real employer will receive it.</Alert> : null}
      {me.id === listing.ownerId ? (
        <Alert className="mt-5" tone="warning">You posted this job, so you can&rsquo;t apply to it.</Alert>
      ) : (
        <div className="mt-8 rounded-3xl border border-line bg-surface p-6 md:p-8">
          <p className="mb-6 text-sm text-ink-2">Applying as <span className="font-semibold text-ink">{me.name ?? me.email}</span> ({me.email}).</p>
          <ApplyForm listingId={listing.id} back={`/listings/${listing.slug}/apply`} />
        </div>
      )}
    </div>
  );
}
