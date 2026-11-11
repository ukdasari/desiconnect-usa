import Link from "next/link";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/account", label: "Profile" },
  { href: "/account/requests", label: "My requests" },
  { href: "/account/saved", label: "Saved" },
  { href: "/account/alerts", label: "Alerts" },
];

export function AccountNav({ current }: { current: string }) {
  return (
    <nav aria-label="Account" className="mt-6 flex gap-1 border-b border-line">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={current === l.href ? "page" : undefined}
          className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold", current === l.href ? "border-marigold text-ink" : "border-transparent text-ink-2 hover:text-ink")}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
