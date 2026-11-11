import type { Metadata } from "next";
import { SearchView } from "@/components/search-view";
import { GetAlertsLink } from "@/components/get-alerts";
import { ButtonLink, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Real estate" };

export default async function RealEstatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div className="container-page py-10">
      <PageHeader title="Homes, rentals and roommates" description="Rent a home, find a room in a like-minded household, or buy. Contact the owner or agent directly.">
        <GetAlertsLink topic="real-estate" />
        <ButtonLink href="/provider/listings/new?category=rentals" variant="secondary">List a property</ButtonLink>
      </PageHeader>
      <SearchView path="/real-estate" searchParams={await searchParams} fixed={{ kind: "PROPERTY" }} />
    </div>
  );
}
