import type { Metadata } from "next";
import { SearchView } from "@/components/search-view";
import { GetAlertsLink } from "@/components/get-alerts";
import { ButtonLink, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Jobs" };

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div className="container-page py-10">
      <PageHeader title="Jobs" description="Openings from employers in the community. Remote roles appear wherever you search. Apply with your resume in a minute.">
        <GetAlertsLink topic="jobs" />
        <ButtonLink href="/provider/listings/new?category=technology" variant="secondary">Post a job</ButtonLink>
      </PageHeader>
      <SearchView path="/jobs" searchParams={await searchParams} fixed={{ kind: "JOB" }} />
    </div>
  );
}
