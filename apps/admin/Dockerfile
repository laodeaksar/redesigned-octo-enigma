FROM oven/bun:1.1-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lockb ./
COPY packages/config/package.json ./packages/config/package.json
COPY packages/ui/package.json     ./packages/ui/package.json
COPY apps/web/package.json        ./apps/web/package.json
RUN bun install --frozen-lockfile --production=false

FROM deps AS build
COPY packages/config/ ./packages/config/
COPY packages/ui/     ./packages/ui/
COPY apps/web/        ./apps/web/

# Build-time public env vars (baked into static assets by Vite/Astro)
ARG PUBLIC_API_URL=http://localhost:3000
ARG PUBLIC_MIDTRANS_CLIENT_KEY=""
ARG PUBLIC_MIDTRANS_IS_PRODUCTION=false

ENV PUBLIC_API_URL=$PUBLIC_API_URL
ENV PUBLIC_MIDTRANS_CLIENT_KEY=$PUBLIC_MIDTRANS_CLIENT_KEY
ENV PUBLIC_MIDTRANS_IS_PRODUCTION=$PUBLIC_MIDTRANS_IS_PRODUCTION

WORKDIR /app/apps/web
RUN bun run build

FROM oven/bun:1.1-alpine AS runtime
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Astro SSR output — copy the server bundle and client assets
COPY --from=build --chown=appuser:appgroup /app/apps/web/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules  ./node_modules

USER appuser
ENV NODE_ENV=production
EXPOSE 3010
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3010/ || exit 1
CMD ["bun", "run", "./dist/server/entry.mjs"]
