# Deployment

## Components

| Component | Image / runtime | Notes |
|---|---|---|
| API | `infrastructure/docker/api.Dockerfile` | Runs `prisma migrate deploy` then `node dist/main.js`. Stateless; scale horizontally. |
| Website | `infrastructure/docker/web.Dockerfile` | Next.js standalone server. Needs `API_URL` (server-side URL of the API). |
| PostgreSQL 16 + PostGIS 3 | Managed (RDS / Cloud SQL / Azure Flexible Server) | PostGIS and pg_trgm extensions are created by the first migration. |
| Redis 7 | Managed (ElastiCache / Memorystore / Upstash) | BullMQ notifications. |
| Object storage | S3-compatible bucket | Private bucket; set `STORAGE_DRIVER=s3`. |

`infrastructure/terraform/` is reserved for environment definitions; no Terraform has been written yet.

## Production checklist

1. Set `NODE_ENV=production`, a strong `JWT_SECRET` (or `AUTH_MODE=oidc` + `OIDC_ISSUER`/`OIDC_AUDIENCE`),
   `CORS_ORIGINS`, `SESSION_COOKIE_SECURE=true`, `STORAGE_DRIVER=s3` + bucket settings, `REDIS_URL`.
2. Run migrations (the API container does this on start; for zero-downtime, run them as a separate release step).
3. Seed reference data only: `SEED_DEMO=false pnpm db:seed` (categories, gazetteer, markets).
4. Create the first admin: add their email to `BOOTSTRAP_ADMIN_EMAILS` before they register/sign in.
5. Put the website and API behind HTTPS; forward `x-request-id` for tracing.

## Release

CI (`.github/workflows/ci.yml`) builds, lints, typechecks, runs unit/integration tests against PostGIS, runs Playwright
end-to-end tests, then builds both Docker images on `main`. Tag images with the commit SHA and deploy the same SHA to
staging, then production.

## Rollback

- **Application**: redeploy the previous image tag for API and web. Both are stateless.
- **Database**: migrations are forward-only. Write migrations to be backward compatible with the previous release
  (expand → deploy → contract). If a migration must be reverted, write a new corrective migration; restore from a
  point-in-time backup only as a last resort.
- **Feature flags**: AI can be switched to the rule-based parser instantly with `AI_PROVIDER=none`.

## Not verified in this build

The Dockerfiles and docker-compose were written but could not be built here (no Docker daemon in the build environment).
Run `docker compose up --build` once locally or in CI and fix any path issues before relying on them.
