"use client";

import type { CSSProperties } from "react";

import { usePathname } from "next/navigation";
import { imageSrc, PARTNERS, PARTNERS_HEADING, type Partner } from "@/lib/partners";
import { cn } from "@/lib/cn";

// Not shown in account, business, admin and sign-in areas.
const HIDDEN = [/^\/account(\/|$)/, /^\/provider(\/|$)/, /^\/admin(\/|$)/, /^\/login$/, /^\/register$/, /^\/auth(\/|$)/];

function Tile({ p, compact }: { p: Partner; compact?: boolean }) {
  const body = p.logo ? (
    <img src={imageSrc(p.logo)} alt={p.name} className={cn("mx-auto w-full object-contain", compact ? "h-10" : p.tall ? "h-20" : "h-12")} loading="lazy" />
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
  const tileStyle = p.logo && p.tile ? { backgroundColor: p.tile, borderColor: p.tile } : undefined;
  return p.href ? (
    <a href={p.href} target="_blank" rel="noopener noreferrer" className={cls} style={tileStyle} aria-label={`${p.name} (opens their website)`}>
      {body}
    </a>
  ) : (
    <div className={cls} style={tileStyle}>{body}</div>
  );
}

/** "rail": sticky column beside the content on wide screens. "strip": scrolling row above the footer on smaller screens. */
export function PartnerRail({ variant }: { variant: "rail" | "strip" }) {
  const pathname = usePathname();
  if (HIDDEN.some((re) => re.test(pathname))) return null;

  if (variant === "rail") {
    return (
      <aside aria-label={PARTNERS_HEADING} className="hidden w-52 shrink-0 self-stretch py-10 xl:block">
        <div className="sticky top-24">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-2">{PARTNERS_HEADING}</h2>
          {/* Endless vertical loop: the list is drawn twice and slides up by one copy. Pauses on hover/focus. */}
          <div className="partner-window partner-window-y mt-3 h-[calc(100vh-9rem)] max-h-[44rem] overflow-hidden">
            <div className="partner-loop partner-loop-y" style={{ "--loop-duration": `${PARTNERS.length * 4.5}s` } as CSSProperties}>
              {[0, 1].map((copy) => (
                <ul key={copy} aria-hidden={copy === 1 || undefined} inert={copy === 1 || undefined}>
                  {PARTNERS.map((p) => <li key={p.name} className="pb-3"><Tile p={p} /></li>)}
                </ul>
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }
  return (
    <section aria-label={PARTNERS_HEADING} className="border-t border-line py-6 xl:hidden">
      <div className="container-page">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-2">{PARTNERS_HEADING}</h2>
        <div className="partner-window partner-window-x mt-3 overflow-hidden pb-2">
          <div className="partner-loop partner-loop-x flex w-max" style={{ "--loop-duration": `${PARTNERS.length * 4}s` } as CSSProperties}>
            {[0, 1].map((copy) => (
              <ul key={copy} className="flex" aria-hidden={copy === 1 || undefined} inert={copy === 1 || undefined}>
                {PARTNERS.map((p) => <li key={p.name} className="pr-3"><Tile p={p} compact /></li>)}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
