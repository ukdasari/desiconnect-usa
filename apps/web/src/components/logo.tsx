import Link from "next/link";
import { cn } from "@/lib/cn";

/** Wordmark with a kolam-dot mark: four dots around a center, joined by one loop. */
export function Logo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5 rounded-lg", className)} aria-label="DesiConnect USA home">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--marigold)" />
        <path d="M16 5.5c5.8 0 10.5 4.7 10.5 10.5S21.8 26.5 16 26.5 5.5 21.8 5.5 16 10.2 5.5 16 5.5Z" fill="none" stroke="#1b1206" strokeWidth="1.6" opacity=".55" />
        <g fill="#1b1206">
          <circle cx="16" cy="9.5" r="2" />
          <circle cx="22.5" cy="16" r="2" />
          <circle cx="16" cy="22.5" r="2" />
          <circle cx="9.5" cy="16" r="2" />
          <circle cx="16" cy="16" r="2.4" />
        </g>
      </svg>
      <span className={cn("font-display text-[1.3rem] font-bold tracking-tight", inverse ? "text-white" : "text-ink")}>
        DesiConnect
      </span>
    </Link>
  );
}
