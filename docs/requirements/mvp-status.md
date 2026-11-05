# MVP status against the blueprint

Scope of this build: **Prompt 1 (foundation)** and **Prompt 2 (website)**. Prompts 3–5 are partly started where the
foundation needed them; the rest is listed as remaining work.

## Prompt 1 — Foundation ✅

| Requirement | Status |
|---|---|
| pnpm + Turborepo monorepo with `apps/web`, `apps/mobile`, `apps/api`, `packages/*`, `tests`, `infrastructure`, `docs` | Done |
| Prisma models: users, roles, categories, providers, listings, events, jobs, properties, inquiries, verification, favorites, audit logs (+ registrations, applications, appointments, reviews, reports, notifications, consent, attachments, AI usage, markets, gazetteer) | Done |
| Migrations + seed with all 15 categories | Done (`20261102001629_init`, 15 categories / 64 subcategories) |
| Auth integration points, server-side RBAC, validation, standard errors, OpenAPI | Done (local JWT + OIDC/JWKS) |
| Shared design system | Done (`packages/ui` tokens; web components; mobile theme) |
| Health checks, env validation, structured logging, Docker Compose | Done (Docker files not built here: no daemon) |
| Lint, typecheck, test, build scripts | Done |
| README with exact startup instructions | Done |

Deviations: `packages/utils` was not needed (helpers live with their owners). `listing_locations` (multi-location listings)
is modeled as one primary location per listing plus multiple `provider_locations`; add the join table when needed.
Organization memberships are not modeled yet. shadcn/ui components were hand-authored in the same style because the
shadcn registry wasn't reachable from the build environment.

## Prompt 2 — Website ✅

| Page | Route |
|---|---|
| Homepage with location selector, sentence search and Desi AI | `/` |
| Category landing pages (15) | `/c/[slug]` (events/jobs/real-estate/emergency redirect to their sections) |
| Search with filters and pagination | `/search` |
| Service/provider detail | `/listings/[slug]`, `/providers/[id]` |
| Events list + detail + RSVP | `/events`, `/listings/[slug]` |
| Jobs search, detail, application | `/jobs`, `/listings/[slug]`, `/listings/[slug]/apply` |
| Real estate search, detail, inquiry | `/real-estate`, `/listings/[slug]` |
| Emergency information | `/emergency` |
| Login, registration, profile | `/login`, `/register`, `/account` |
| Saved listings, my inquiries | `/account/saved`, `/account/requests` |
| Provider onboarding + dashboard | `/provider/onboarding`, `/provider`, `/provider/listings/*`, `/provider/inquiries` |
| Admin moderation | `/admin`, `/admin/reports`, `/admin/users`, `/admin/audit` |
| Desi AI | `/ai` (also on the homepage) |

Responsive (tested at 390 px and 1360 px), light/dark mode, keyboard focus styles, reduced-motion support, loading, empty
and error states, real API integration (no hardcoded screens), Playwright tests for the main journeys.

## Mobile app (Prompt 3) ✅

| Blueprint item | Status |
|---|---|
| Onboarding, location permission (coarse only, with ZIP/city fallback) | Done |
| Home, Explore + filters, Desi AI, Saved, Profile tabs | Done |
| Listing detail: apply with résumé, RSVP with party size, requests with explicit consent, report, share | Done |
| Sign-in: local password or OIDC (PKCE, Keychain/Keystore storage, silent refresh, provider logout) | Done |
| My requests / applications / RSVPs, notifications inbox, profile edit, emergency resources | Done |
| Provider tools: dashboard, onboarding, new listing, lead inbox with reply, applications and RSVPs | Done |
| Push notifications (Expo push service, `POST/DELETE /me/devices`, dead tokens pruned) | Done — needs a device + EAS project |
| Light/dark mode, accessibility labels and roles, large touch targets | Done |
| Tests (jest-expo: API client, auth provider, helpers, components) | Done |
| Store release checklist | Done — [mobile-release.md](../deployment/mobile-release.md). Not submitted. |

Verified: iOS, Android and web bundles export cleanly; the web preview was driven end to end with Playwright
(onboarding → explore → listing → sign-in → request with consent → my requests; provider listing creation in dark mode).
Not verified here: running on a physical phone or simulator, push delivery, store builds.

## Restaurant directory (DFW) ✅

- **Restaurants** tab on the website (`/restaurants`) with cuisine filters (Indian, Pakistani, South Indian, vegetarian, halal,
  biryani, street food) on top of the usual search, location and distance filters. Also reachable in the app through Explore and Desi AI.
- 145 Indian and Pakistani restaurants across 25 DFW cities, compiled on 2026-11-05 from public listings (Yelp, TripAdvisor and
  OpenTable search pages, Visit Plano, Zabihah, local press). Source per restaurant in `packages/database/prisma/seed/restaurants.ts`.
- Street addresses and phone numbers appear only where a source stated them; otherwise the listing shows the city. Map pins are
  city-level (no geocoding yet).
- These listings are **unclaimed**: no business profile, no Verified badge, and no request form (the API refuses requests to them),
  because nobody at the restaurant would receive them. Pages tell people to check details before going and invite owners to claim.
- Desi AI understands restaurant questions ("Pakistani restaurants near Plano", "biryani in Irving") and keeps the cuisine as a filter.
- Re-running `pnpm db:seed` replaces the imported set with the current file (`SEED_RESTAURANTS=false` skips it).
- **Claiming:** an owner with a business profile opens the listing, chooses "Claim this listing" (`/listings/:slug/claim`), and gives
  their role, a phone number and how to confirm. Admins see claims at the top of `/admin`, confirm by calling the business on its
  public number, then approve or reject with a reason. Approval moves the listing to the claimant's business (it can then receive
  requests), closes competing claims, and notifies everyone. Claimants follow and withdraw claims on the business dashboard.
  Re-running the seed keeps claimed listings untouched (stable ids per name and city).
- Not done: geocoded addresses, hours, and a periodic re-check for closures.

## Partly done (from later prompts)

- **Prompt 4 (Desi AI):** intent + location + language + price extraction, database retrieval, structured result cards,
  safety routing, regulated disclaimers, history with deletion, daily quotas, token tracking, prompt-injection boundary,
  30+ automated query tests. Missing: Telugu and Hindi replies, multi-turn context (follow-ups don't reuse prior filters).
- **Prompt 5 (provider/admin/pilot):** provider registration, categories and service area, credential submission,
  listing create/edit/archive, lead management, admin approvals, reports, suspensions, audit log, market records.
  Missing: verification document upload, provider analytics beyond counts, category/market management UI, the DFW launch
  readiness dashboard, demo/live data separation tooling beyond the `isDemo` flag, Sentry, an accessibility audit.

## Authentication ✅

OIDC sign-in (required in production) with provider-neutral configuration, PKCE, silent refresh, provider logout,
verified-email enforcement and safe account linking; a local dev provider (`pnpm oidc:dev`); 9 API and 5 browser tests.
Local email/password remains for development and the demo accounts.

## Known limitations

- Geography uses an offline gazetteer (DFW + ~60 metros). Other US cities work as text filters without radius search.
- Email delivery is logged, not sent. (Sign-in emails such as verification and password reset come from the OIDC provider.)
- Event times are entered in Central time (DFW pilot); multi-timezone entry is needed before expanding.
- Next.js streams pages, so a non-admin opening `/admin` sees the not-found page but receives HTTP 200; the API returns 403
  for all admin data.
