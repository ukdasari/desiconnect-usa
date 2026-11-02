import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CATEGORIES, REGULATED_DISCLAIMER } from "@desiconnect/contracts";
import { CategoryIcon } from "@/components/category-icon";
import { SearchView } from "@/components/search-view";
import { Alert, ButtonLink } from "@/components/ui";

const SECTION: Record<string, string> = { events: "/events", jobs: "/jobs", "real-estate": "/real-estate", emergency: "/emergency" };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = CATEGORIES.find((x) => x.slug === slug);
  return { title: c?.name ?? "Category", description: c?.tagline };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  if (SECTION[slug]) redirect(SECTION[slug]);
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) notFound();
  const sp = await searchParams;
  const activeSub = typeof sp.category === "string" ? sp.category : "";

  return (
    <div className="container-page py-10">
      <div className="flex flex-col gap-6 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4">
          <CategoryIcon icon={category.icon} slug={category.slug} size="lg" />
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">{category.name}</h1>
            <p className="mt-1 text-ink-2">{category.tagline}</p>
          </div>
        </div>
        <ButtonLink href="/provider/onboarding" variant="secondary">List your {category.name.toLowerCase()} business</ButtonLink>
      </div>

      <nav aria-label={`${category.name} subcategories`} className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/c/${slug}`}
          aria-current={!activeSub ? "page" : undefined}
          className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium hover:border-ink-2 aria-[current=page]:border-peacock aria-[current=page]:bg-peacock aria-[current=page]:text-white"
        >
          All
        </Link>
        {category.subcategories.map((s) => (
          <Link
            key={s.slug}
            href={`/c/${slug}?category=${s.slug}`}
            aria-current={activeSub === s.slug ? "page" : undefined}
            className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium hover:border-ink-2 aria-[current=page]:border-peacock aria-[current=page]:bg-peacock aria-[current=page]:text-white"
          >
            {s.name}
          </Link>
        ))}
      </nav>

      {category.regulated ? <Alert className="mt-5" tone="info" title="Check credentials before you hire">{REGULATED_DISCLAIMER}</Alert> : null}

      <SearchView path={`/c/${slug}`} searchParams={sp} fixed={{ category: activeSub && category.subcategories.some((s) => s.slug === activeSub) ? activeSub : slug }} />
    </div>
  );
}
