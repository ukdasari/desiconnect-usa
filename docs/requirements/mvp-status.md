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

## Partly done (from later prompts)

- **Prompt 3 (mobile):** Expo shell with the five tabs, live categories, search, AI chat and listing detail. Missing:
  sign-in with secure token storage, RSVP/apply/inquiry flows, saved listings, provider tools, push notifications,
  onboarding/location permission, store release checklist.
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
