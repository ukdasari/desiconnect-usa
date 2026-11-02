import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ListingForm } from "@/components/provider-forms";
import { PageHeader } from "@/components/ui";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "New listing" };

export default async function NewListingPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const me = await getMe();
  const { category } = await searchParams;
  if (!me) redirect(`/login?next=${encodeURIComponent(`/provider/listings/new${category ? `?category=${category}` : ""}`)}`);
  return (
    <div className="container-page max-w-3xl py-10">
      <PageHeader title="Create a listing" description="Pick a category and the form adapts: event times, job details or property facts." />
      <div className="mt-8 rounded-3xl border border-line bg-surface p-6 md:p-8">
        <ListingForm defaultCategory={category} canPostServices={!!me.providerId} />
      </div>
    </div>
  );
}
