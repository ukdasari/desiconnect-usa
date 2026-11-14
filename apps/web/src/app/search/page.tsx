import type { Metadata } from "next";
import { getCategory } from "@desiconnect/contracts";
import { SearchView } from "@/components/search-view";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const cat = typeof sp.category === "string" ? getCategory(sp.category) : undefined;
  const sub = cat?.subcategories.find((s) => s.slug === sp.category);
  const title = q ? `Results for “${q}”` : sub ? sub.name : cat ? cat.name : "Explore 1StopDesi";
  return (
    <div className="container-page py-10">
      <PageHeader title={title} description="Every result is a reviewed listing. Verified means we checked the provider's license or business registration." />
      <SearchView path="/search" searchParams={sp} />
    </div>
  );
}
