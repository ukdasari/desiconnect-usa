import Link from "next/link";
import { CATEGORIES } from "@desiconnect/contracts";
import { Logo } from "./logo";

export function SiteFooter() {
  const half = Math.ceil(CATEGORIES.length / 2);
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-ink-2">
            A community marketplace for Indians and South Asians in the United States, starting in Dallas–Fort Worth.
          </p>
          <p className="text-sm text-ink-2">In an emergency, call 911. For mental health crisis support, call or text 988.</p>
        </div>
        <FooterList title="Browse" items={CATEGORIES.slice(0, half).map((c) => ({ href: `/c/${c.slug}`, label: c.name }))} />
        <FooterList title="More" items={CATEGORIES.slice(half).map((c) => ({ href: `/c/${c.slug}`, label: c.name }))} />
        <FooterList
          title="For businesses"
          items={[
            { href: "/provider/onboarding", label: "List your business" },
            { href: "/provider/listings/new", label: "Post an event, job or rental" },
            { href: "/provider", label: "Provider dashboard" },
            { href: "/ai", label: "Ask Desi AI" },
          ]}
        />
      </div>
      <div className="border-t border-line">
        <p className="container-page py-5 text-xs text-ink-2">
          1StopDesi is a directory. It does not provide legal, insurance, medical or tax advice, and it does not guarantee any provider.
          Listings marked Demo are sample data.
          <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/privacy" className="hover:text-ink hover:underline">Privacy policy</Link>
            <Link href="/terms" className="hover:text-ink hover:underline">Terms of service</Link>
            <Link href="/data-deletion" className="hover:text-ink hover:underline">Delete your data</Link>
          </span>
        </p>
      </div>
    </footer>
  );
}

function FooterList({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="hover:text-ink hover:underline">{i.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
