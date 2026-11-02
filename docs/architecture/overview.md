# Architecture

## Shape

```
 Browser ──► Next.js (apps/web) ──server-side fetch + bearer token──► NestJS API (apps/api) ──► PostgreSQL + PostGIS
                 │  httpOnly session cookie                                │        │
 Expo app ───────┼─────────────────────── HTTPS /api/v1 ──────────────────┘        ├──► Redis (BullMQ queue)
                 │                                                                  └──► S3-compatible storage
            packages/contracts (Zod schemas, enums, DTO types) shared by all three
```

- **Modular monolith.** One deployable API organized by domain module: `auth`, `search`, `categories`, `listings`,
  `engagement` (inquiries, RSVPs, applications, favorites), `providers`, `admin` (moderation, reports, users, audit),
  `ai`, `notifications`, `storage`, `audit`, `health`. Modules talk through injected services, not HTTP.
- **The website never exposes tokens.** Sign-in happens in a server action; the JWT is stored in an httpOnly,
  SameSite=Lax cookie and attached server-side to API calls. Mutations are server actions. Resume downloads stream
  through a Next route handler (`/api/resume/[id]`).
- **One validation source.** Request schemas live in `packages/contracts` (Zod 4). The API validates every body and query
  with them (and documents them in OpenAPI via `z.toJSONSchema`); the web and mobile apps use the same types.

## Data model highlights

- `listings` holds shared fields (owner, category, location, status, moderation, provenance, demo flag). Kind-specific data
  lives in `events`, `jobs` and `properties` (1:1 by `listingId`). Search, ownership and moderation are written once.
- `locations.geog` is a **generated** PostGIS `geography(Point,4326)` column from latitude/longitude with a GiST index;
  radius search uses `ST_DWithin` / `ST_Distance`.
- `listings.searchVector` is a **generated** weighted `tsvector` (title A, description B) with a GIN index, plus a trigram
  index on titles.
- Database CHECK constraints back key rules (rating 1–5, salary order, event end ≥ start, guest count, coordinate ranges).
- Provenance: `listings.source` (`user`, `seed:demo`, future `import:<source>`) and `isDemo`.
- Trust & safety: `provider_credentials` (reviewed by admins), `reports`, `audit_logs`, `consent_records`.
- AI: `ai_conversations`, `ai_messages`, `ai_usage` (quota and cost tracking).

Prisma can't express generated columns; they are created in the migration SQL and declared in `schema.prisma` with
`dbgenerated(...)` so `prisma migrate` sees no drift. **Always create schema changes with migrations** (`pnpm db:migrate:dev`),
never `prisma db push`.

## Geography

Locations are resolved with an offline gazetteer (`geo_places`): DFW cities and common ZIP codes plus ~60 US metros with
large South Asian communities. A city or ZIP outside the gazetteer still works as a text filter but has no radius search.
Before expanding markets, load a full gazetteer (for example US Census ZCTA centroids) or plug a geocoder into
`GeoService`.

## Desi AI

1. `detectSafety` runs first: emergencies → 911 guidance, crisis language → 988. Nothing is searched.
2. `parseIntent` (rules) extracts category/subcategory, city/state/ZIP, radius, language, price cap, rent/buy/roommate and
   timeframe. With `AI_PROVIDER=anthropic`, Claude may fill gaps; its JSON output is schema-validated and the user text is
   wrapped as data. The model never sees other users' data and has no tools.
3. The intent runs through the same `SearchService` as the website. Replies are composed from real results; zero results
   produce an honest message with widening suggestions. Regulated categories carry a disclaimer.
4. Signed-in users get persisted history (deletable via `DELETE /me/ai-history`) and a daily quota; anonymous use is
   rate-limited per IP and not stored.
5. Desi AI never sends inquiries or applications. Those always require the user to submit a form with explicit consent.

`GET /ai/interpret` exposes step 2 alone for the homepage sentence search ("I need ___ near ___").

## Notifications

Inquiries, replies, RSVPs, application updates and moderation decisions enqueue a BullMQ job. The worker writes an in-app
notification and hands email to a transport that currently logs (plug in SES/Postmark/SendGrid in
`NotificationsService.deliver`). Without Redis, or with `NOTIFICATIONS_INLINE=true`, delivery is synchronous.
