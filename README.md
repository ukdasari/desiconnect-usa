# DesiConnect USA

A community marketplace for Indians and South Asians in the United States: services, events, jobs, real estate and
help lines in one place, with an AI assistant that only answers from real listings. Built nationwide-ready, piloting in
Dallas–Fort Worth.

| | |
|---|---|
| **Website** | Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn-style components |
| **Mobile** | Expo SDK 58, React Native 0.88, Expo Router — iOS and Android app (with a web preview) using the same API and contracts |
| **API** | NestJS 11 modular monolith, REST `/api/v1`, OpenAPI at `/api/docs` |
| **Data** | PostgreSQL 16 + PostGIS, Prisma 6, full-text search (generated `tsvector`) |
| **Jobs** | Redis + BullMQ (notifications) |
| **Tests** | Vitest, Jest + Supertest (against real PostGIS), Playwright |

## Repository layout

```
apps/
  api/        NestJS API: auth, RBAC, listings, search, inquiries, events, jobs, providers, admin, AI
  web/        Next.js website (all MVP pages, provider portal, admin moderation)
  mobile/     Expo iOS/Android app using the same API and contracts
packages/
  contracts/  Shared enums, the 15-category taxonomy, Zod validation schemas, API response types
  database/   Prisma schema, SQL migrations, seed script (categories, gazetteer, demo data)
  ui/         Design tokens shared by web and mobile
  config/     Shared TypeScript and ESLint configuration
tests/e2e/    Playwright journeys (web → API → database)
infrastructure/
  docker/     API and web Dockerfiles
docs/         Architecture, API (openapi.json), security, deployment, requirements status
```

## Prerequisites

- Node.js 22+ and pnpm 10 (`corepack enable`)
- PostgreSQL 16 with PostGIS 3, and Redis 7. The easiest way is Docker: `docker compose up -d postgres redis`

## Run it locally

```bash
corepack enable
pnpm install
cp .env.example .env                 # set JWT_SECRET to a random 32+ character string
docker compose up -d postgres redis  # or point DATABASE_URL / REDIS_URL at your own servers

pnpm build                           # builds packages, API and web (also generates the Prisma client)
pnpm db:migrate                      # applies migrations (PostGIS, generated columns, constraints)
pnpm db:seed                         # 15 categories, offline gazetteer, DFW market, labeled demo data

pnpm dev                             # API on http://localhost:4000, website on http://localhost:3000
```

- API docs: http://localhost:4000/api/docs (JSON: `/api/docs/openapi.json`, also committed at `docs/api/openapi.json`)
- Health: `GET /api/v1/health` (liveness) and `GET /api/v1/health/ready` (database, PostGIS, Redis)

Demo sign-ins created by the seed (development only, password `DemoPass123!`):

| Email | Can do |
|---|---|
| `user@desiconnect.example` | Browse, send requests, RSVP, apply, save |
| `provider@desiconnect.example` | Owns the demo HVAC business, demo events, jobs and properties; has a demo inquiry |
| `admin@desiconnect.example` | Moderation dashboard, reports, users, audit log |

Every seeded business, person and listing is fictional, flagged `isDemo`, labeled "(Demo)" in the UI, and uses
`example.com`-style contact details and `DEMO-` license numbers. Disable demo data with `SEED_DEMO=false pnpm db:seed`;
it is never seeded when `NODE_ENV=production` unless you set `SEED_DEMO=true` explicitly.

### Full stack in Docker

```bash
docker compose up --build            # postgres, redis, api (runs migrations on start), web
docker compose run --rm seed         # one-off: categories, gazetteer and demo data
```

### Mobile app

```bash
cp apps/mobile/.env.example apps/mobile/.env   # set EXPO_PUBLIC_API_URL to http://<your-LAN-IP>:4000/api/v1
pnpm --filter @desiconnect/mobile start         # i = iOS Simulator, a = Android Emulator, or scan the QR code
pnpm --filter @desiconnect/mobile web           # browser preview (add http://localhost:8081 to CORS_ORIGINS)
```

What's in it: onboarding and location (coarse device location, ZIP or city — never precise or background), Home,
Explore with filters, Desi AI, Saved, Profile, listing detail with apply (résumé upload), RSVP and requests (explicit
consent before contact details are shared), reports, notifications, emergency resources, and provider tools (dashboard,
onboarding, new listing, lead inbox, applications and RSVPs). Sign-in follows the API: email + password in `local`
mode, or the OIDC provider (PKCE, tokens in the Keychain/Keystore) in `oidc` mode. Push needs a physical device and an
EAS project — see [docs/deployment/mobile-release.md](docs/deployment/mobile-release.md). The app has **not** been
published to any store.

## Quality commands

```bash
pnpm lint          # ESLint across all workspaces
pnpm typecheck     # TypeScript across all workspaces (including mobile)
pnpm test          # contracts (Vitest), API unit + integration (Jest + Supertest), mobile (jest-expo)
pnpm test:e2e      # Playwright; needs API on :4000 and web on :3000 with seeded data
E2E_AUTH_MODE=oidc pnpm test:e2e   # OIDC journeys (stack in OIDC mode + pnpm oidc:dev)
```

API integration tests create and reset a separate database (`desiconnect_test` by default; override with
`TEST_DATABASE_URL`). They refuse to reset any database whose name doesn't end in `_test`.

## Configuration

All variables are documented in [`.env.example`](.env.example) and validated at API startup (the API refuses to boot
with invalid configuration). Key choices:

- `AUTH_MODE=oidc` (**required in production**) — sign-in through any OpenID Connect provider (Auth0, Cognito, Entra ID,
  Okta…): code flow with PKCE, httpOnly cookies, silent token refresh, provider logout. `AUTH_MODE=local` (email +
  password, demo accounts) is for development and tests. Setup guide: [docs/security/authentication.md](docs/security/authentication.md).
  Try OIDC locally with `pnpm oidc:dev`.
- `STORAGE_DRIVER=local|s3` — resumes and verification documents; S3-compatible buckets with server-side encryption.
- `AI_PROVIDER=none|anthropic` — `none` uses the built-in rule-based intent parser. `anthropic` uses Claude only to
  extract search filters; results always come from the database.

## Documentation

- [Architecture](docs/architecture/overview.md)
- [Authentication (OIDC setup)](docs/security/authentication.md)
- [Security and privacy](docs/security/security.md)
- [Deployment and rollback](docs/deployment/deployment.md)
- [MVP scope and status against the blueprint](docs/requirements/mvp-status.md)
- [API reference (OpenAPI)](docs/api/openapi.json)
