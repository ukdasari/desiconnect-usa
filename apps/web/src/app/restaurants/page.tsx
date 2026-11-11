import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  ChefHat,
  CookingPot,
  Flame,
  Info,
  Leaf,
  MapPin,
  Soup,
  Sparkles,
  Store,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { KolamPattern } from "@/components/kolam";
import { SearchView } from "@/components/search-view";
import { buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Indian & Pakistani restaurants" };

type Params = Record<string, string | string[] | undefined>;

interface Cuisine {
  label: string;
  q: string;
  hint: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon bubble. */
  tone: string;
}

const CUISINES: Cuisine[] = [
  { label: "All", q: "", hint: "Every restaurant", icon: UtensilsCrossed, tone: "bg-peacock-soft text-peacock-2 dark:text-marigold" },
  { label: "Indian", q: "Indian", hint: "North & South", icon: ChefHat, tone: "bg-haldi text-marigold-strong" },
  { label: "Pakistani", q: "Pakistani", hint: "Karahi, nihari, BBQ", icon: Flame, tone: "bg-kumkum-soft text-kumkum" },
  { label: "South Indian", q: "South Indian", hint: "Dosa, idli, meals", icon: Soup, tone: "bg-haldi text-marigold-strong" },
  { label: "Vegetarian", q: "Vegetarian", hint: "Meat-free menus", icon: Leaf, tone: "bg-leaf-soft text-leaf" },
  { label: "Halal", q: "Halal", hint: "Listed as halal", icon: BadgeCheck, tone: "bg-leaf-soft text-leaf" },
  { label: "Biryani", q: "Biryani", hint: "Biryani houses", icon: CookingPot, tone: "bg-kumkum-soft text-kumkum" },
  { label: "Street food", q: "Street food", hint: "Chaat & quick bites", icon: Store, tone: "bg-peacock-soft text-peacock-2 dark:text-marigold" },
];

const CITIES = ["Dallas", "Plano", "Irving", "Frisco", "Richardson", "Carrollton", "Allen", "McKinney", "Arlington", "Fort Worth"];

/** Number of restaurants matching a cuisine across DFW (cached; used for the tiles and banner stats). */
async function countFor(q: string): Promise<number | null> {
  try {
    const res = await api<unknown[]>("/search", {
      auth: false,
      revalidate: 600,
      query: { category: "restaurants", q: q || undefined, city: "Dallas", state: "TX", radiusMiles: 60, pageSize: 1 },
    });
    return res.meta?.total ?? null;
  } catch {
    return null;
  }
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function RestaurantsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = one(params.q);
  const city = one(params.city);
  const counts = await Promise.all(CUISINES.map((c) => countFor(c.q)));
  const total = counts[0];
  const countOf = (label: string) => counts[CUISINES.findIndex((c) => c.label === label)];

  const href = (extra: Record<string, string>) => {
    const next = new URLSearchParams();
    for (const k of ["q", "city", "state", "zip", "radiusMiles"]) {
      const v = one(params[k]);
      if (v) next.set(k, v);
    }
    for (const [k, v] of Object.entries(extra)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const s = next.toString();
    return s ? `/restaurants?${s}` : "/restaurants";
  };

  const stats = [
    { value: total, label: "restaurants" },
    { value: countOf("Pakistani"), label: "Pakistani" },
    { value: countOf("South Indian"), label: "South Indian" },
    { value: countOf("Halal"), label: "halal" },
  ].filter((s) => s.value);

  return (
    <>
      {/* ---- banner */}
      <section className="relative isolate overflow-hidden bg-peacock text-white" aria-labelledby="restaurants-heading">
        <KolamPattern className="absolute inset-0 -z-10 h-full w-full text-[#7fb7b4]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_30%,transparent_0%,var(--peacock)_72%)]" aria-hidden />
        <div className="container-page py-12 md:py-16">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/90">
                <MapPin className="size-4" aria-hidden /> Dallas–Fort Worth
              </p>
              <h1 id="restaurants-heading" className="mt-4 flex items-start gap-4 text-[2.1rem] font-bold leading-[1.05] sm:text-5xl">
                <span className="mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-marigold text-[#1b1206] shadow-lg sm:size-11" aria-hidden>
                  <UtensilsCrossed className="size-5" />
                </span>
                <span>Indian &amp; Pakistani restaurants</span>
              </h1>
              <p className="mt-4 text-lg text-white/80">
                Biryani and karahi spots, dosa houses, chaat counters and fine dining, across the metroplex.
              </p>
              {stats.length ? (
                <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
                  {stats.map((s) => (
                    <div key={s.label}>
                      <dt className="sr-only">{s.label}</dt>
                      <dd>
                        <span className="font-display text-3xl font-bold text-marigold">{s.value}</span>{" "}
                        <span className="text-white/80">{s.label}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/ai?q=Find%20Pakistani%20restaurants%20near%20me" className={buttonClass("primary", "md")}>
                <Sparkles className="size-4" aria-hidden /> Ask Desi AI
              </Link>
              <Link
                href="/provider/listings/new?category=restaurants"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 font-semibold text-white hover:bg-white/10"
              >
                <Store className="size-4" aria-hidden /> Add your restaurant
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page py-10">
        {/* ---- cuisines */}
        <section aria-labelledby="cuisine-heading">
          <h2 id="cuisine-heading" className="text-xl font-bold">What are you craving?</h2>
          <nav aria-label="Cuisine" className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {CUISINES.map((c, i) => {
              const active = q.toLowerCase() === c.q.toLowerCase();
              const Icon = c.icon;
              return (
                <Link
                  key={c.label}
                  href={href({ q: c.q, page: "" })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex min-w-0 items-center gap-3 rounded-2xl border p-3 transition-all",
                    active
                      ? "border-peacock bg-peacock text-white shadow-md dark:border-marigold dark:bg-surface-2"
                      : "border-line bg-surface hover:-translate-y-0.5 hover:border-ink-2 hover:shadow-sm",
                  )}
                >
                  <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-lg", active ? "bg-white/15 text-white" : c.tone)} aria-hidden>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-x-2 leading-tight">
                      <span className="font-semibold">{c.label}</span>
                      {counts[i] !== null ? <span className={cn("text-sm", active ? "text-white/75" : "text-ink-2")}>{counts[i]}</span> : null}
                    </span>
                    <span className={cn("mt-0.5 block truncate text-xs", active ? "text-white/75" : "text-ink-2")}>{c.hint}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </section>

        {/* ---- cities */}
        <section aria-labelledby="city-heading" className="mt-8">
          <h2 id="city-heading" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-2">
            <MapPin className="size-4" aria-hidden /> Popular areas
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {CITIES.map((c) => {
              const active = city.toLowerCase() === c.toLowerCase();
              return (
                <Link
                  key={c}
                  href={href({ city: active ? "" : c, state: active ? "" : "TX", zip: "", radiusMiles: active ? "" : "10", page: "" })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    active ? "border-marigold bg-haldi text-ink" : "border-line bg-surface text-ink-2 hover:border-ink-2 hover:text-ink",
                  )}
                >
                  {c}
                </Link>
              );
            })}
          </div>
        </section>

        {/* ---- notice */}
        <p className="mt-8 flex items-start gap-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-3 text-sm text-ink-2">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Most restaurants here are listed from public information and haven&apos;t claimed their listing yet, so check hours and the
            address before you go. Own one? <Link href="/provider/onboarding" className="font-semibold text-ink underline">Claim it</Link>.
          </span>
        </p>

        <div className="mt-8">
          <SearchView path="/restaurants" searchParams={params} fixed={{ category: "restaurants" }} layout="cards" />
        </div>
      </div>
    </>
  );
}
