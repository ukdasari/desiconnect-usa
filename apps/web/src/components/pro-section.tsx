import Link from "next/link";
import { Briefcase, Info, MapPin, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { REGULATED_DISCLAIMER } from "@desiconnect/contracts";
import { KolamPattern } from "@/components/kolam";
import { GetAlertsLink } from "@/components/get-alerts";
import { SearchView } from "@/components/search-view";
import { buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

type Params = Record<string, string | string[] | undefined>;

export interface ProArea {
  /** Value of the `area` query parameter ("" = everything in the section). */
  key: string;
  label: string;
  /** Category slug(s) searched for this area. */
  category: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
}

export interface ProSectionConfig {
  path: string;
  title: string;
  icon: LucideIcon;
  blurb: string;
  /** "attorneys listed" */
  countNoun: string;
  areaHeading: string;
  areaLabel: string;
  areas: ProArea[];
  aiPrompt: string;
  listCta: string;
  alertTopic: string;
  license: { lead: string; body: string; linkLabel: string; href: string };
  /** Shown before the general disclaimer (e.g. "For an emergency, call 911."). */
  notePrefix?: string;
}

export const TONES = {
  peacock: "bg-peacock-soft text-peacock-2 dark:text-marigold",
  haldi: "bg-haldi text-marigold-strong",
  leaf: "bg-leaf-soft text-leaf",
  kumkum: "bg-kumkum-soft text-kumkum",
};

/** Listings in an area across DFW (cached; used for the tiles). */
async function countFor(category: string): Promise<number | null> {
  try {
    const res = await api<unknown[]>("/search", {
      auth: false,
      revalidate: 600,
      query: { category, kind: "SERVICE", city: "Dallas", state: "TX", radiusMiles: 60, pageSize: 1 },
    });
    return res.meta?.total ?? null;
  } catch {
    return null;
  }
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** A professionals section (Attorneys, Realtors, Medical): banner, specialty tiles, license note and results. */
export async function ProSection({ config: c, searchParams }: { config: ProSectionConfig; searchParams: Promise<Params> }) {
  const params = await searchParams;
  const area = c.areas.find((a) => a.key === one(params.area)) ?? c.areas[0]!;
  const counts = await Promise.all(c.areas.map((a) => countFor(a.category)));
  const Icon = c.icon;
  const headingId = `${c.path.slice(1)}-heading`;

  const href = (key: string) => {
    const next = new URLSearchParams();
    for (const k of ["q", "city", "state", "zip", "radiusMiles", "language", "verifiedOnly", "sort"]) {
      const v = one(params[k]);
      if (v) next.set(k, v);
    }
    if (key) next.set("area", key);
    const s = next.toString();
    return s ? `${c.path}?${s}` : c.path;
  };

  return (
    <>
      {/* ---- banner */}
      <section className="relative isolate overflow-hidden bg-peacock text-white" aria-labelledby={headingId}>
        <KolamPattern className="absolute inset-0 -z-10 h-full w-full text-[#7fb7b4]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_30%,transparent_0%,var(--peacock)_72%)]" aria-hidden />
        <div className="container-page py-12 md:py-16">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/90">
                <MapPin className="size-4" aria-hidden /> Dallas–Fort Worth
              </p>
              <h1 id={headingId} className="mt-4 flex items-start gap-4 text-[2.1rem] font-bold leading-[1.05] sm:text-5xl">
                <span className="mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-marigold text-[#1b1206] shadow-lg sm:size-11" aria-hidden>
                  <Icon className="size-5" />
                </span>
                <span>{c.title}</span>
              </h1>
              <p className="mt-4 text-lg text-white/80">{c.blurb}</p>
              {counts[0] ? (
                <p className="mt-6">
                  <span className="font-display text-3xl font-bold text-marigold">{counts[0]}</span>{" "}
                  <span className="text-white/80">{c.countNoun}</span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/ai?q=${encodeURIComponent(c.aiPrompt)}`} className={buttonClass("primary", "md")}>
                <Sparkles className="size-4" aria-hidden /> Ask Desi AI
              </Link>
              <Link
                href="/provider/onboarding"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 font-semibold text-white hover:bg-white/10"
              >
                <Briefcase className="size-4" aria-hidden /> {c.listCta}
              </Link>
              <GetAlertsLink topic={c.alertTopic} city={one(params.city) || undefined} state={one(params.city) ? one(params.state) || "TX" : undefined} onDark />
            </div>
          </div>
        </div>
      </section>

      <div className="container-page py-10">
        {/* ---- practice areas */}
        <section aria-labelledby="area-heading">
          <h2 id="area-heading" className="text-xl font-bold">{c.areaHeading}</h2>
          <nav aria-label={c.areaLabel} className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {c.areas.map((a, i) => {
              const active = a.key === area.key;
              const AreaIcon = a.icon;
              return (
                <Link
                  key={a.label}
                  href={href(a.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex min-w-0 items-center gap-3 rounded-2xl border p-3 transition-all",
                    active
                      ? "border-peacock bg-peacock text-white shadow-md dark:border-marigold dark:bg-surface-2"
                      : "border-line bg-surface hover:-translate-y-0.5 hover:border-ink-2 hover:shadow-sm",
                  )}
                >
                  <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-lg", active ? "bg-white/15 text-white" : a.tone)} aria-hidden>
                    <AreaIcon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-x-2 leading-tight">
                      <span className="font-semibold">{a.label}</span>
                      {counts[i] ? <span className={cn("text-sm", active ? "text-white/75" : "text-ink-2")}>{counts[i]}</span> : null}
                    </span>
                    <span className={cn("mt-0.5 block truncate text-xs", active ? "text-white/75" : "text-ink-2")}>{a.hint}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </section>

        {/* ---- notices */}
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          <p className="flex items-start gap-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-3 text-sm text-ink-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden />
            <span>
              <span className="font-semibold text-ink">{c.license.lead}</span> {c.license.body}{" "}
              <a href={c.license.href} {...(c.license.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="font-semibold text-ink underline">
                {c.license.linkLabel}
              </a>
              .
            </span>
          </p>
          <p className="flex items-start gap-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-3 text-sm text-ink-2">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{c.notePrefix ? <strong className="text-ink">{c.notePrefix} </strong> : null}{REGULATED_DISCLAIMER}</span>
          </p>
        </div>

        <div className="mt-8">
          <SearchView
            path={c.path}
            searchParams={params}
            fixed={{ kind: "SERVICE", category: area.category }}
            keep={{ area: area.key }}
          />
        </div>
      </div>
    </>
  );
}
