# DesiConnect website image (Next.js standalone output). Build from the repository root:
#   docker build -f infrastructure/docker/web.Dockerfile -t desiconnect-web .
FROM node:22-bookworm-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile --filter @desiconnect/web...
RUN pnpm --filter @desiconnect/web... build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
RUN useradd --system --uid 1001 desi
USER desi
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
