FROM oven/bun:1.1-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lockb ./
COPY packages/common/package.json       ./packages/common/package.json
COPY packages/config/package.json       ./packages/config/package.json
COPY apps/email-worker/package.json     ./apps/email-worker/package.json
RUN bun install --frozen-lockfile --production=false

FROM deps AS build
COPY packages/common/   ./packages/common/
COPY packages/config/   ./packages/config/
COPY apps/email-worker/ ./apps/email-worker/
WORKDIR /app/apps/email-worker
RUN bun run build

FROM oven/bun:1.1-alpine AS runtime
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=build --chown=appuser:appgroup /app/apps/email-worker/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules           ./node_modules
USER appuser
ENV NODE_ENV=production
# No EXPOSE — pure BullMQ worker process, no HTTP server
# No HEALTHCHECK via HTTP — rely on process exit code + Docker restart policy
CMD ["bun", "run", "dist/index.js"]
