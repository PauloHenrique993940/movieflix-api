# Stage 1: Builder
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files and tsconfig
COPY package.json package-lock.json* ./
COPY tsconfig.json ./


# Copy Prisma schema BEFORE npm install for postinstall & generate
COPY prisma ./prisma/

# Install all dependencies (dev + prod for build)
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/* && npm ci

# Copy source for TypeScript compilation
COPY src ./src

# Build the TypeScript project
RUN npm run build


# Stage 2: Runtime (slim, prod-only)
FROM node:22-slim AS runtime

WORKDIR /app

# Add non-root user for security
RUN groupadd --gid 1001 nodejs \
    && useradd --uid 1001 --gid 1001 -m nodejs

# Copy built artifacts from builder (prod deps only via prune)
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma/

# Prune dev deps for smaller image
RUN npm prune --prod

USER nodejs

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/movies || exit 1

CMD ["npm", "start"]

