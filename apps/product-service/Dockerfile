FROM oven/bun:1.1-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lockb ./
COPY packages/common/package.json       ./packages/common/package.json
COPY packages/config/package.json       ./packages/config/package.json
COPY packages/database/package.json     ./packages/database/package.json
COPY apps/product-service/package.json  ./apps/product-service/package.json
RUN bun install --frozen-lockfile --production=false

FROM deps AS build
COPY packages/common/    ./packages/common/
COPY packages/config/    ./packages/config/
COPY packages/database/  ./packages/database/
COPY apps/product-service/ ./apps/product-service/
WORKDIR /app/apps/product-service
RUN bun run build

FROM oven/bun:1.1-alpine AS runtime
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=build --chown=appuser:appgroup /app/apps/product-service/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules              ./node_modules
USER appuser
ENV NODE_ENV=production
EXPOSE 3002
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3002/health || exit 1
CMD ["bun", "run", "dist/index.js"]
