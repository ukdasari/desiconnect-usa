import Link from "next/link";
import { ChevronDown, MapPin, Menu, Sparkles, UserRound } from "lucide-react";
import { PILOT_MARKET } from "@desiconnect/contracts";
import { logout, setLocation } from "@/app/actions/auth";
import { getLocation, getMe } from "@/lib/session";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme";
import { buttonClass } from "./ui";

const NAV = [
  { href: "/search", label: "Explore" },
  { href: "/events", label: "Events" },
  { href: "/jobs", label: "Jobs" },
  { href: "/real-estate", label: "Real estate" },
  { href: "/emergency", label: "Emergency" },
];

const popover = "fixed inset-x-4 top-16 z-40 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 mt-2 sm:w-72 rounded-2xl border border-line bg-surface p-4 shadow-[0_12px_40px_-12px_rgba(14,59,67,0.35)]";

export async function SiteHeader() {
  const [me, loc] = await Promise.all([getMe(), getLocation()]);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center gap-2 sm:gap-3">
        <Logo />
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-[0.95rem] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
              {n.label}
            </Link>
          ))}
          <Link href="/ai" className="ml-1 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[0.95rem] font-semibold text-peacock-2 hover:bg-peacock-soft dark:text-marigold">
            <Sparkles className="size-4" aria-hidden />
            Desi AI
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <details className="group relative">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-sm font-medium sm:px-3 [&::-webkit-details-marker]:hidden">
              <MapPin className="size-4 text-marigold-strong" aria-hidden />
              <span className="hidden max-w-32 truncate sm:inline">{loc.label}</span>
              <ChevronDown className="size-3.5 text-ink-2 transition-transform group-open:rotate-180" aria-hidden />
              <span className="sr-only">Change location</span>
            </summary>
            <form action={setLocation} className={popover}>
              <p className="font-semibold">Where should we look?</p>
              <p className="mt-0.5 text-sm text-ink-2">We start with {PILOT_MARKET.name}. Any US city works for search.</p>
              <label htmlFor="loc-place" className="mt-3 block text-sm font-medium">DFW city</label>
              <select id="loc-place" name="place" defaultValue={loc.city && loc.state ? `${loc.city}|${loc.state}` : ""} className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-3">
                <option value="">Choose a city</option>
                {PILOT_MARKET.cities.map((c) => (
                  <option key={c} value={`${c}|TX`}>{c}, TX</option>
                ))}
              </select>
              <label htmlFor="loc-zip" className="mt-3 block text-sm font-medium">Or ZIP code</label>
              <input id="loc-zip" name="zip" inputMode="numeric" pattern="\d{5}" maxLength={5} placeholder="75034" defaultValue={loc.zip ?? ""} className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-3" />
              <button className={buttonClass("primary", "sm", "mt-4 w-full")}>Use this location</button>
            </form>
          </details>

          <ThemeToggle />

          {me ? (
            <details className="group relative">
              <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full bg-peacock text-sm font-bold text-white [&::-webkit-details-marker]:hidden" aria-label="Account menu">
                {(me.name ?? me.email).charAt(0).toUpperCase()}
              </summary>
              <div className={popover}>
                <p className="truncate font-semibold">{me.name ?? "Your account"}</p>
                <p className="truncate text-sm text-ink-2">{me.email}</p>
                <ul className="mt-3 space-y-0.5 text-[0.95rem]">
                  <MenuLink href="/account">Profile</MenuLink>
                  <MenuLink href="/account/requests">My requests</MenuLink>
                  <MenuLink href="/account/saved">Saved</MenuLink>
                  <MenuLink href="/provider">{me.providerId || me.roles.some((r) => r !== "CONSUMER" && r !== "ADMIN") ? "Provider dashboard" : "List your business"}</MenuLink>
                  {me.roles.includes("ADMIN") ? <MenuLink href="/admin">Moderation</MenuLink> : null}
                </ul>
                <form action={logout} className="mt-3 border-t border-line pt-3">
                  <button className="w-full rounded-lg px-2 py-1.5 text-left text-[0.95rem] text-ink-2 hover:bg-surface-2 hover:text-ink">Sign out</button>
                </form>
              </div>
            </details>
          ) : (
            <Link href="/login" className={buttonClass("secondary", "sm", "ml-1 hidden sm:inline-flex")}>
              <UserRound className="size-4" aria-hidden />
              Sign in
            </Link>
          )}

          <details className="relative lg:hidden">
            <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full hover:bg-surface-2 [&::-webkit-details-marker]:hidden" aria-label="Open menu">
              <Menu className="size-5" aria-hidden />
            </summary>
            <nav aria-label="Mobile" className={popover}>
              <ul className="space-y-0.5">
                {NAV.map((n) => <MenuLink key={n.href} href={n.href}>{n.label}</MenuLink>)}
                <MenuLink href="/ai">Desi AI</MenuLink>
                {!me ? <MenuLink href="/login">Sign in</MenuLink> : null}
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="block rounded-lg px-2 py-1.5 hover:bg-surface-2">{children}</Link>
    </li>
  );
}
