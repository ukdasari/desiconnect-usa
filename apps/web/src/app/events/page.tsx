import type { Metadata } from "next";
import { SearchView } from "@/components/search-view";
import { ButtonLink, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div className="container-page py-10">
      <PageHeader title="Events" description="Festivals, concerts, pujas, networking and family events, soonest first. RSVP in one step.">
        <ButtonLink href="/provider/listings/new?category=festivals" variant="secondary">Post an event</ButtonLink>
      </PageHeader>
      <SearchView path="/events" searchParams={await searchParams} fixed={{ kind: "EVENT" }} />
    </div>
  );
}
