import { cn } from "@/lib/cn";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import {
  CATEGORIES,
  EMPLOYMENT_TYPES,
  LANGUAGES,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
  US_STATES,
  WORK_ARRANGEMENTS,
  getCategory,
  type ListingKind,
  type ListingSummaryDto,
} from "@desiconnect/contracts";
import { api, ApiError } from "@/lib/api";
import { enumText } from "@/lib/format";
import { getLocation, getMe } from "@/lib/session";
import { ListingRow } from "./listing";
import { RestaurantCard } from "./restaurant-card";
import { Alert, Button, EmptyState, Input, Select } from "./ui";

type Params = Record<string, string | string[] | undefined>;

interface Props {
  path: string;
  searchParams: Params;
  /** Fixed filters for section pages (e.g. kind=JOB on /jobs). */
  fixed?: { kind?: ListingKind; category?: string };
  /** "cards" shows restaurant cards in a grid instead of rows. */
  layout?: "rows" | "cards";
  /** Page-level query values the filter form must keep (for example the practice area on /attorneys). */
  keep?: Record<string, string>;
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function SearchView({ path, searchParams, fixed = {}, layout = "rows", keep = {} }: Props) {
  const [me, savedLoc] = await Promise.all([getMe(), getLocation()]);
  const p = (k: string) => one(searchParams[k]);
  const hasLocationParam = ["city", "state", "zip"].some((k) => p(k));
  const category = fixed.category ?? p("category");
  const kind = fixed.kind ?? getCategory(category)?.kind;

  const query: Record<string, string | undefined> = {
    q: p("q") || undefined,
    category: category || undefined,
    kind: fixed.kind,
    city: hasLocationParam ? p("city") || undefined : savedLoc.city,
    state: hasLocationParam ? p("state") || undefined : savedLoc.state,
    zip: hasLocationParam ? p("zip") || undefined : savedLoc.zip,
    radiusMiles: p("radiusMiles") || "40",
    language: p("language") || undefined,
    verifiedOnly: p("verifiedOnly") || undefined,
    from: p("from") || undefined,
    to: p("to") || undefined,
    employmentType: p("employmentType") || undefined,
    workArrangement: p("workArrangement") || undefined,
    transactionType: p("transactionType") || undefined,
    propertyType: p("propertyType") || undefined,
    minPrice: p("minPrice") || undefined,
    maxPrice: p("maxPrice") || undefined,
    minBeds: p("minBeds") || undefined,
    sort: p("sort") || undefined,
    page: p("page") || "1",
    pageSize: "15",
  };
  if (p("anywhere") === "1") Object.assign(query, { city: undefined, state: undefined, zip: undefined });

  let results: ListingSummaryDto[] = [];
  let meta: { total: number; page: number; totalPages: number; locationNote?: string | null } = { total: 0, page: 1, totalPages: 1 };
  let error: ApiError | null = null;
  try {
    const res = await api<ListingSummaryDto[]>("/search", { query });
    results = res.data;
    meta = res.meta as typeof meta;
  } catch (err) {
    if (err instanceof ApiError) error = err;
    else throw err;
  }

  const qs = new URLSearchParams(Object.entries(searchParams).flatMap(([k, v]) => (v === undefined ? [] : [[k, one(v)]])));
  const back = `${path}${qs.toString() ? `?${qs}` : ""}`;
  const cards = layout === "cards";
  const pageHref = (n: number) => {
    const next = new URLSearchParams(qs);
    next.set("page", String(n));
    return `${path}?${next}`;
  };

  return (
    <div className={cards ? "mt-8 grid gap-6" : "mt-8 grid gap-8 lg:grid-cols-[17rem_1fr]"}>
      <aside aria-label="Filters">
        <details className="group rounded-3xl border border-line bg-surface lg:open:block" open={!cards}>
          <summary className={cn("flex cursor-pointer list-none items-center gap-2 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden", !cards && "lg:hidden")}>
            <SlidersHorizontal className="size-4" aria-hidden /> Filters
            {cards ? <span className="text-sm font-normal text-ink-2">: keyword, location, distance, sort</span> : null}
          </summary>
          <form action={path} method="get" className={cards ? "grid items-start gap-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0" : "space-y-4 px-5 pb-5 lg:pt-5"}>
            {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
            <FilterField label="Keywords" id="f-q">
              <Input id="f-q" name="q" defaultValue={p("q")} placeholder={kind === "JOB" ? "Java, SDET, nurse" : "Name or keyword"} />
            </FilterField>
            {!fixed.category ? (
              <FilterField label="Category" id="f-category">
                <Select id="f-category" name="category" defaultValue={category}>
                  <option value="">All categories</option>
                  {CATEGORIES.filter((c) => !fixed.kind || c.kind === fixed.kind).map((c) => (
                    <optgroup key={c.slug} label={c.name}>
                      <option value={c.slug}>All {c.name.toLowerCase()}</option>
                      {c.subcategories.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                    </optgroup>
                  ))}
                </Select>
              </FilterField>
            ) : null}
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Location</legend>
              <Input name="city" aria-label="City" defaultValue={hasLocationParam ? p("city") : (savedLoc.city ?? "")} placeholder="City" />
              <div className="grid grid-cols-2 gap-2">
                <Select name="state" aria-label="State" defaultValue={hasLocationParam ? p("state") : (savedLoc.state ?? "")}>
                  <option value="">State</option>
                  {US_STATES.map(([code]) => <option key={code} value={code}>{code}</option>)}
                </Select>
                <Input name="zip" aria-label="ZIP code" inputMode="numeric" maxLength={5} defaultValue={hasLocationParam ? p("zip") : (savedLoc.zip ?? "")} placeholder="ZIP" />
              </div>
              <Select name="radiusMiles" aria-label="Distance" defaultValue={p("radiusMiles") || "40"}>
                {[5, 10, 25, 40, 60, 100, 250].map((m) => <option key={m} value={m}>Within {m} miles</option>)}
              </Select>
            </fieldset>
            <FilterField label="Language spoken" id="f-language">
              <Select id="f-language" name="language" defaultValue={p("language")}>
                <option value="">Any language</option>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </Select>
            </FilterField>

            {kind === "EVENT" ? (
              <div className="grid grid-cols-2 gap-2">
                <FilterField label="From" id="f-from"><Input id="f-from" type="date" name="from" defaultValue={p("from").slice(0, 10)} /></FilterField>
                <FilterField label="To" id="f-to"><Input id="f-to" type="date" name="to" defaultValue={p("to").slice(0, 10)} /></FilterField>
              </div>
            ) : null}
            {kind === "JOB" ? (
              <>
                <EnumSelect label="Job type" name="employmentType" values={EMPLOYMENT_TYPES} current={p("employmentType")} />
                <EnumSelect label="Work arrangement" name="workArrangement" values={WORK_ARRANGEMENTS} current={p("workArrangement")} />
              </>
            ) : null}
            {kind === "PROPERTY" ? (
              <>
                <EnumSelect label="Looking to" name="transactionType" values={TRANSACTION_TYPES} current={p("transactionType")} labels={{ RENT: "Rent", SALE: "Buy", ROOMMATE: "Find a room" }} />
                <EnumSelect label="Property type" name="propertyType" values={PROPERTY_TYPES} current={p("propertyType")} />
                <div className="grid grid-cols-2 gap-2">
                  <FilterField label="Min price" id="f-min"><Input id="f-min" name="minPrice" inputMode="numeric" defaultValue={p("minPrice")} /></FilterField>
                  <FilterField label="Max price" id="f-max"><Input id="f-max" name="maxPrice" inputMode="numeric" defaultValue={p("maxPrice")} /></FilterField>
                </div>
                <FilterField label="Bedrooms" id="f-beds">
                  <Select id="f-beds" name="minBeds" defaultValue={p("minBeds")}>
                    <option value="">Any</option>
                    {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}
                  </Select>
                </FilterField>
              </>
            ) : null}
            {kind === "SERVICE" || !kind ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="verifiedOnly" value="true" defaultChecked={p("verifiedOnly") === "true"} className="size-4 accent-[var(--peacock-2)]" />
                Verified providers only
              </label>
            ) : null}
            <FilterField label="Sort by" id="f-sort">
              <Select id="f-sort" name="sort" defaultValue={p("sort") || (kind === "EVENT" ? "start_date" : "relevance")}>
                <option value="relevance">Best match</option>
                <option value="distance">Nearest</option>
                <option value="newest">Newest</option>
                {kind === "EVENT" ? <option value="start_date">Soonest</option> : null}
                {kind === "PROPERTY" || kind === "JOB" ? (
                  <>
                    <option value="price_asc">{kind === "JOB" ? "Pay: low to high" : "Price: low to high"}</option>
                    <option value="price_desc">{kind === "JOB" ? "Pay: high to low" : "Price: high to low"}</option>
                  </>
                ) : null}
              </Select>
            </FilterField>
            <div className={cn("flex gap-2 pt-1", cards && "self-end")}>
              <Button type="submit" className="flex-1">Show results</Button>
              <Link href={path} className="inline-flex h-11 items-center rounded-full px-3 text-sm font-semibold text-ink-2 hover:text-ink">Reset</Link>
            </div>
          </form>
        </details>
      </aside>

      <section aria-label="Results" aria-live="polite">
        {error ? (
          <Alert tone="danger" title="Search isn't available right now">{error.message}</Alert>
        ) : (
          <>
            <p className="text-sm text-ink-2">
              <span className="font-semibold text-ink">{meta.total.toLocaleString("en-US")} {meta.total === 1 ? "result" : "results"}</span>
              {meta.locationNote ? ` ${meta.locationNote.charAt(0).toLowerCase()}${meta.locationNote.slice(1)}` : " across the USA"}
            </p>
            {results.length ? (
              layout === "cards" ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {results.map((l) => <RestaurantCard key={l.id} listing={l} back={back} signedIn={!!me} />)}
                </div>
              ) : (
                <div className="mt-2">
                  {results.map((l) => <ListingRow key={l.id} listing={l} back={back} signedIn={!!me} />)}
                </div>
              )
            ) : (
              <div className="mt-4">
                <EmptyState
                  title="Nothing matches these filters yet"
                  action={
                    <>
                      <Link href={`${path}?${new URLSearchParams({ ...Object.fromEntries(qs), radiusMiles: "100", page: "1" })}`} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink-2">Search within 100 miles</Link>
                      <Link href={`${path}?${new URLSearchParams({ ...Object.fromEntries(qs), anywhere: "1", page: "1" })}`} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink-2">Search the whole USA</Link>
                    </>
                  }
                >
                  Try a wider distance, a different language, or fewer keywords. We only show real, reviewed listings.
                </EmptyState>
              </div>
            )}
            {meta.totalPages > 1 ? (
              <nav aria-label="Pagination" className="mt-6 flex items-center justify-between">
                {meta.page > 1 ? <Link href={pageHref(meta.page - 1)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold">Previous</Link> : <span />}
                <span className="text-sm text-ink-2">Page {meta.page} of {meta.totalPages}</span>
                {meta.page < meta.totalPages ? <Link href={pageHref(meta.page + 1)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold">Next</Link> : <span />}
              </nav>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function FilterField({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}

function EnumSelect({ label, name, values, current, labels = {} }: { label: string; name: string; values: readonly string[]; current: string; labels?: Record<string, string> }) {
  const id = `f-${name}`;
  return (
    <FilterField label={label} id={id}>
      <Select id={id} name={name} defaultValue={current}>
        <option value="">Any</option>
        {values.map((v) => <option key={v} value={v}>{labels[v] ?? enumText(v)}</option>)}
      </Select>
    </FilterField>
  );
}
