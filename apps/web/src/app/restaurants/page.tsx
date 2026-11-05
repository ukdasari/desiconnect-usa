import type { Metadata } from "next";
import Link from "next/link";
import { SearchView } from "@/components/search-view";
import { Alert, ButtonLink, PageHeader } from "@/components/ui";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Indian & Pakistani restaurants" };

const CUISINES = [
  { label: "All", q: "" },
  { label: "Indian", q: "Indian" },
  { label: "Pakistani", q: "Pakistani" },
  { label: "South Indian", q: "South Indian" },
  { label: "Vegetarian", q: "Vegetarian" },
  { label: "Halal", q: "Halal" },
  { label: "Biryani", q: "Biryani" },
  { label: "Street food", q: "Street food" },
];

export default async function RestaurantsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q) ?? "";
  const keep = (extra: Record<string, string>) => {
    const next = new URLSearchParams();
    for (const k of ["city", "state", "zip", "radiusMiles"]) {
      const v = params[k];
      if (typeof v === "string" && v) next.set(k, v);
    }
    for (const [k, v] of Object.entries(extra)) if (v) next.set(k, v);
    const s = next.toString();
    return s ? `/restaurants?${s}` : "/restaurants";
  };

  return (
    <div className="container-page py-10">
      <PageHeader
        title="Indian & Pakistani restaurants"
        description="Restaurants across Dallas–Fort Worth, from biryani and karahi spots to dosa houses and fine dining."
      >
        <ButtonLink href="/provider/listings/new?category=restaurants" variant="secondary">Add your restaurant</ButtonLink>
      </PageHeader>

      <nav aria-label="Cuisine" className="mt-6 flex flex-wrap gap-2">
        {CUISINES.map((c) => {
          const active = q.toLowerCase() === c.q.toLowerCase();
          return (
            <Link
              key={c.label}
              href={keep({ q: c.q })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
                active ? "border-peacock bg-peacock text-white" : "border-line bg-surface text-ink hover:border-ink-2",
              )}
            >
              {c.label}
            </Link>
          );
        })}
      </nav>

      <Alert className="mt-6" title="Listed from public information">
        Most of these restaurants haven&apos;t claimed their listing yet, so we haven&apos;t confirmed addresses or hours with them. Check before
        you go. Restaurant owners can claim a listing to correct it.
      </Alert>

      <SearchView path="/restaurants" searchParams={params} fixed={{ category: "restaurants" }} />
    </div>
  );
}
