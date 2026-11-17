"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/** A header dropdown (e.g. Professionals). Closes when a link is chosen, on Escape and on outside click. */
export function NavMenu({ label, items }: { label: string; items: { href: string; label: string; hint: string }[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const active = items.some((i) => pathname === i.href);

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) {
        el.open = false;
        if (e instanceof KeyboardEvent) el.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details ref={ref} className="group relative">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-2 text-[0.95rem] font-medium hover:bg-surface-2 hover:text-ink [&::-webkit-details-marker]:hidden",
          active ? "text-ink" : "text-ink-2",
        )}
      >
        {label}
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="absolute left-0 top-full z-40 mt-2 w-64 rounded-2xl border border-line bg-surface p-2 shadow-[0_12px_40px_-12px_rgba(14,59,67,0.35)]">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              aria-current={pathname === i.href ? "page" : undefined}
              className="block rounded-xl px-3 py-2 hover:bg-surface-2 aria-[current=page]:bg-peacock-soft"
            >
              <span className="block font-semibold">{i.label}</span>
              <span className="block text-xs text-ink-2">{i.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
