import Link from "next/link";
import { Phone, Search } from "lucide-react";
import type { CategoryDto, ListingSummaryDto } from "@desiconnect/contracts";
import { smartSearch } from "@/app/actions/engagement";
import { CategoryIcon } from "@/components/category-icon";
import { DesiAi } from "@/components/desi-ai";
import { KolamPattern } from "@/components/kolam";
import { ListingMini } from "@/components/listing";
import { ButtonLink, EmptyState } from "@/components/ui";
import { api } from "@/lib/api";
import { getLocation } from "@/lib/session";

const POPULAR = [
  { label: "Immigration attorneys", href: "/c/immigration" },
  { label: "Tiffin services", href: "/search?category=tiffin" },
  { label: "Tax preparers", href: "/search?category=tax-preparation" },
  { label: "Rentals under $2,500", href: "/real-estate?transactionType=RENT&maxPrice=2500" },
  { label: "This month's events", href: "/events" },
];

async function safeList(path: string, query: Record<string, string | number | undefined>) {
  try {
    return (await api<ListingSummaryDto[]>(path, { query, auth: false, revalidate: 60 })).data;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const loc = await getLocation();
  const near = { city: loc.city, state: loc.state, zip: loc.zip, radiusMiles: 40 };
  const [categories, events, jobs, homes] = await Promise.all([
    api<CategoryDto[]>("/categories", { auth: false, revalidate: 300 }).then((r) => r.data).catch(() => null),
    safeList("/events", { ...near, pageSize: 4 }),
    safeList("/jobs", { ...near, pageSize: 4, sort: "newest" }),
    safeList("/properties", { ...near, pageSize: 4, sort: "newest" }),
  ]);

  return (
    <>
      {/* Hero: the sentence search is the page's one bold element. */}
      <section className="relative isolate overflow-hidden bg-peacock text-white">
        <KolamPattern className="absolute inset-0 -z-10 h-full w-full text-[#7fb7b4]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_40%,transparent_0%,var(--peacock)_70%)]" aria-hidden />
        <div className="container-page py-16 md:py-24">
          <div className="animate-settle max-w-4xl">
            <h1 className="text-[2.1rem] font-bold leading-[1.05] sm:text-5xl md:text-[3.9rem]">
              Find the people who get it, from your next tax preparer to tonight&rsquo;s garba.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-white/80">
              Services, events, jobs and homes from the Desi community, with verified professionals and a way to reach them in one step.
            </p>

            <form action={smartSearch} className="mt-9 rounded-[1.6rem] bg-white p-2 text-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,0.55)] dark:bg-surface">
              <div className="flex flex-col gap-1 md:flex-row md:items-center">
                <label className="flex flex-1 items-center gap-3 px-4 py-2">
                  <span className="shrink-0 font-display text-lg font-semibold text-ink-2">I need</span>
                  <input
                    name="q"
                    required
                    maxLength={160}
                    placeholder="a Telugu-speaking immigration lawyer"
                    className="h-12 w-full bg-transparent text-lg font-medium placeholder:text-ink-2/60 focus:outline-none"
                    aria-label="What do you need?"
                  />
                </label>
                <span className="hidden h-8 w-px bg-line md:block" aria-hidden />
                <label className="flex items-center gap-3 px-4 py-2 md:w-72">
                  <span className="shrink-0 font-display text-lg font-semibold text-ink-2">near</span>
                  <input
                    name="where"
                    maxLength={80}
                    defaultValue={loc.zip ?? loc.city ?? ""}
                    placeholder="Frisco or 75034"
                    className="h-12 w-full bg-transparent text-lg font-medium placeholder:text-ink-2/60 focus:outline-none"
                    aria-label="Near which city or ZIP code?"
                  />
                </label>
                <button className="inline-flex h-13 items-center justify-center gap-2 rounded-[1.2rem] bg-marigold px-7 text-base font-bold text-[#1b1206] hover:bg-marigold-strong hover:text-white">
                  <Search className="size-5" aria-hidden />
                  Search
                </button>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-white/70">Popular:</span>
              {POPULAR.map((p) => (
                <Link key={p.href} href={p.href} className="rounded-full border border-white/25 px-3 py-1 text-white/90 hover:border-white hover:text-white">
                  {p.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Category index */}
      <section className="container-page mt-14" aria-labelledby="browse-heading">
        <div className="flex items-end justify-between gap-4">
          <h2 id="browse-heading" className="text-2xl font-bold md:text-3xl">Browse by what you need</h2>
          <Link href="/search" className="text-sm font-semibold text-peacock-2 hover:underline dark:text-marigold">Search everything</Link>
        </div>
        {categories ? (
          <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/c/${c.slug}`} className="group flex items-center gap-3 rounded-2xl px-2 py-3 -mx-2 hover:bg-surface">
                  <CategoryIcon icon={c.icon} slug={c.slug} />
                  <span className="min-w-0">
                    <span className="block font-semibold leading-tight group-hover:underline">{c.name}</span>
                    <span className="block text-xs text-ink-2">{c.slug === "emergency" ? "911, 988 and help lines" : `${c.listingCount} listed`}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6">
            <EmptyState title="Categories are unavailable right now">Refresh the page in a moment. Search and the emergency page still work.</EmptyState>
          </div>
        )}
      </section>

      {/* Events + Desi AI */}
      <section className="container-page mt-16 grid gap-10 lg:grid-cols-[1fr_28rem]">
        <div>
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold md:text-3xl">Coming up near {loc.label}</h2>
            <Link href="/events" className="text-sm font-semibold text-peacock-2 hover:underline dark:text-marigold">All events</Link>
          </div>
          <div className="mt-5 space-y-2">
            {events?.length ? (
              events.map((e) => <ListingMini key={e.id} listing={e} />)
            ) : (
              <EmptyState title="No upcoming events nearby yet" action={<ButtonLink href="/provider/listings/new?category=festivals" variant="secondary" size="sm">Post an event</ButtonLink>}>
                Organizing something? Post it and we&rsquo;ll review it within a day.
              </EmptyState>
            )}
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-2">
            <div>
              <div className="flex items-end justify-between">
                <h2 className="text-xl font-bold">New jobs</h2>
                <Link href="/jobs" className="text-sm font-semibold text-peacock-2 hover:underline dark:text-marigold">All jobs</Link>
              </div>
              <div className="mt-3 space-y-1">
                {jobs?.length ? jobs.map((j) => <ListingMini key={j.id} listing={j} />) : <p className="text-ink-2">No jobs posted near you yet.</p>}
              </div>
            </div>
            <div>
              <div className="flex items-end justify-between">
                <h2 className="text-xl font-bold">Homes and rooms</h2>
                <Link href="/real-estate" className="text-sm font-semibold text-peacock-2 hover:underline dark:text-marigold">All listings</Link>
              </div>
              <div className="mt-3 space-y-1">
                {homes?.length ? homes.map((h) => <ListingMini key={h.id} listing={h} />) : <p className="text-ink-2">No homes listed near you yet.</p>}
              </div>
            </div>
          </div>
        </div>
        <DesiAi />
      </section>

      {/* Emergency */}
      <section className="container-page mt-16" aria-labelledby="emergency-heading">
        <div className="flex flex-col gap-5 rounded-3xl border border-kumkum/30 bg-kumkum-soft p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <h2 id="emergency-heading" className="text-xl font-bold">If someone is in danger, call 911 first.</h2>
            <p className="mt-1 text-ink-2">For emotional distress or suicidal thoughts, call or text 988. It&rsquo;s free, confidential and open 24/7.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <a href="tel:911" className="inline-flex h-11 items-center gap-2 rounded-full bg-kumkum px-5 font-bold text-white"><Phone className="size-4" aria-hidden />911</a>
            <a href="tel:988" className="inline-flex h-11 items-center gap-2 rounded-full border border-kumkum px-5 font-bold text-kumkum"><Phone className="size-4" aria-hidden />988</a>
            <Link href="/emergency" className="inline-flex h-11 items-center rounded-full px-4 font-semibold underline">Other help lines</Link>
          </div>
        </div>
      </section>

      {/* For providers: a real sequence, so numbered steps are appropriate. */}
      <section className="container-page mt-16" aria-labelledby="providers-heading">
        <div className="grid gap-8 rounded-3xl bg-surface p-6 md:grid-cols-[1fr_1.4fr] md:p-10">
          <div>
            <h2 id="providers-heading" className="text-2xl font-bold md:text-3xl">Run a Desi business? Get found by the people looking for you.</h2>
            <p className="mt-3 text-ink-2">Listing is free during the Dallas–Fort Worth pilot.</p>
            <ButtonLink href="/provider/onboarding" className="mt-6">List your business</ButtonLink>
          </div>
          <ol className="grid gap-6 sm:grid-cols-3">
            {[
              ["Create your profile", "Add your services, languages and the area you cover."],
              ["Get verified", "Licensed professionals submit their license; we check it with the state."],
              ["Receive requests", "Customers send requests with their contact details. You reply from your dashboard."],
            ].map(([title, body], i) => (
              <li key={title} className="border-t-2 border-marigold pt-4">
                <p className="font-display text-sm font-bold text-marigold-strong">Step {i + 1}</p>
                <p className="mt-1 font-semibold">{title}</p>
                <p className="mt-1 text-sm text-ink-2">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
