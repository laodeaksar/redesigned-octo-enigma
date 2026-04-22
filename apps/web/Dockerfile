FROM oven/bun:1.1-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lockb ./
COPY packages/config/package.json ./packages/config/package.json
COPY packages/ui/package.json     ./packages/ui/package.json
COPY apps/admin/package.json      ./apps/admin/package.json
RUN bun install --frozen-lockfile --production=false

FROM deps AS build
COPY packages/config/ ./packages/config/
COPY packages/ui/     ./packages/ui/
COPY apps/admin/      ./apps/admin/

ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app/apps/admin
RUN bun run build

FROM oven/bun:1.1-alpine AS runtime
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=build --chown=appuser:appgroup /app/apps/admin/.output ./output
COPY --from=build --chown=appuser:appgroup /app/node_modules       ./node_modules
USER appuser
ENV NODE_ENV=production
EXPOSE 3011
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3011/ || exit 1
CMD ["bun", "run", "./output/server/index.mjs"]
