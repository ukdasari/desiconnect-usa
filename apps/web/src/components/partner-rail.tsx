"use client";

import { usePathname } from "next/navigation";
import { imageSrc, PARTNERS, PARTNERS_HEADING, type Partner } from "@/lib/partners";
import { cn } from "@/lib/cn";

// Not shown in account, business, admin and sign-in areas.
const HIDDEN = [/^\/account(\/|$)/, /^\/provider(\/|$)/, /^\/admin(\/|$)/, /^\/login$/, /^\/register$/, /^\/auth(\/|$)/];

function Tile({ p, compact }: { p: Partner; compact?: boolean }) {
  const body = p.logo ? (
    <img src={imageSrc(p.logo)} alt={p.name} className={cn("mx-auto w-full object-contain", compact ? "h-10" : "h-12")} loading="lazy" />
  ) : (
    <span className="block text-center">
      <span className="block font-display text-[0.95rem] font-bold leading-tight text-ink">{p.name}</span>
      <span className="mt-0.5 block text-xs text-ink-2">{p.kind}</span>
    </span>
  );
  const cls = cn(
    "flex items-center justify-center rounded-2xl border border-line px-3 transition-colors",
    compact ? "h-16 w-44 shrink-0" : "min-h-20 w-full py-3",
    p.logo && p.dark ? "bg-[#17396e]" : p.logo ? "bg-white" : "bg-surface",
    p.href ? "hover:border-ink-2" : null,
  );
  return p.href ? (
    <a href={p.href} target="_blank" rel="noopener noreferrer" className={cls} aria-label={`${p.name} (opens their website)`}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** "rail": sticky column beside the content on wide screens. "strip": scrolling row above the footer on smaller screens. */
export function PartnerRail({ variant }: { variant: "rail" | "strip" }) {
  const pathname = usePathname();
  if (HIDDEN.some((re) => re.test(pathname))) return null;

  if (variant === "rail") {
    return (
      <aside aria-label={PARTNERS_HEADING} className="hidden w-52 shrink-0 py-10 xl:block">
        <div className="sticky top-24">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-2">{PARTNERS_HEADING}</h2>
          <ul className="mt-3 space-y-3">
            {PARTNERS.map((p) => <li key={p.name}><Tile p={p} /></li>)}
          </ul>
        </div>
      </aside>
    );
  }
  return (
    <section aria-label={PARTNERS_HEADING} className="border-t border-line py-6 xl:hidden">
      <div className="container-page">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-2">{PARTNERS_HEADING}</h2>
        <ul className="-mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-2">
          {PARTNERS.map((p) => <li key={p.name}><Tile p={p} compact /></li>)}
        </ul>
      </div>
    </section>
  );
}
