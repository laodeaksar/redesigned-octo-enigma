# =============================================================================
# auth-service Dockerfile
# Multi-stage build: deps → build → runtime
# Final image: ~120MB (Bun distroless-based)
# =============================================================================

FROM oven/bun:1.1-alpine AS base
WORKDIR /app

# ── Stage 1: install dependencies ─────────────────────────────────────────────
FROM base AS deps
# Copy workspace manifests for dependency resolution
COPY package.json bun.lockb ./
COPY packages/common/package.json       ./packages/common/package.json
COPY packages/config/package.json       ./packages/config/package.json
COPY packages/database/package.json     ./packages/database/package.json
COPY apps/auth-service/package.json     ./apps/auth-service/package.json

RUN bun install --frozen-lockfile --production=false

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM deps AS build
# Copy source
COPY packages/common/   ./packages/common/
COPY packages/config/   ./packages/config/
COPY packages/database/ ./packages/database/
COPY apps/auth-service/ ./apps/auth-service/

WORKDIR /app/apps/auth-service
RUN bun run build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM oven/bun:1.1-alpine AS runtime
WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only the compiled output + runtime dependencies
COPY --from=build --chown=appuser:appgroup /app/apps/auth-service/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules           ./node_modules

USER appuser

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["bun", "run", "dist/index.js"]
