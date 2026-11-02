import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ListingDetailDto } from "@desiconnect/contracts";
import { ListingForm } from "@/components/provider-forms";
import { PageHeader } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMe();
  if (!me) redirect(`/login?next=/provider/listings/${id}/edit`);
  const listing = (await apiOrNull<ListingDetailDto>(`/listings/${id}`))?.data;
  if (!listing || (listing.ownerId !== me.id && !me.roles.includes("ADMIN"))) notFound();
  return (
    <div className="container-page max-w-3xl py-10">
      <PageHeader title="Edit listing" description={listing.title} />
      <div className="mt-8 rounded-3xl border border-line bg-surface p-6 md:p-8">
        <ListingForm listing={listing} canPostServices={!!me.providerId} />
      </div>
    </div>
  );
}
