# 1StopDesi API image (NestJS). Build from the repository root:
#   docker build -f infrastructure/docker/api.Dockerfile -t desiconnect-api .
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @desiconnect/api... --ignore-scripts=false
RUN pnpm --filter @desiconnect/api... build
RUN pnpm deploy --filter @desiconnect/api --prod --legacy /out \
 && cp -r apps/api/dist /out/dist \
 && cp -r packages/database/prisma /out/prisma \
 && cd /out && npx prisma generate --schema prisma/schema.prisma

# Release job: apply migrations, then seed reference data (categories, places, restaurant directory).
# Demo data is skipped when NODE_ENV=production unless SEED_DEMO=true.
#   docker build -f infrastructure/docker/api.Dockerfile --target migrate -t desiconnect-migrate .
FROM build AS migrate
ENV NODE_ENV=production
WORKDIR /repo/packages/database
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed/index.ts"]

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
RUN useradd --system --uid 1001 desi && mkdir -p /app/storage && chown -R desi /app/storage
USER desi
EXPOSE 4000
# Apply pending migrations, then start. Seeding is a separate, explicit step.
CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/schema.prisma && node dist/main.js"]
