# ==========================================
# Workspace OS — Google Cloud Run Dockerfile
# Multi-stage production container build
# ==========================================

# Stage 1: Build & Compilation
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies required for vite & esbuild)
RUN npm ci || npm install

# Copy application source files
COPY . .

# Build frontend and backend production bundles
ENV NODE_ENV=production
RUN npm run build

# Prune devDependencies to reduce image footprint
RUN npm prune --production

# ------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Create non-root system user for container security
RUN addgroup -S workspaceos && adduser -S workspaceos -G workspaceos

# Copy node_modules, package manifest, and built artifacts from builder
COPY --from=builder --chown=workspaceos:workspaceos /app/package.json ./package.json
COPY --from=builder --chown=workspaceos:workspaceos /app/node_modules ./node_modules
COPY --from=builder --chown=workspaceos:workspaceos /app/dist ./dist

# Switch to non-root user
USER workspaceos

# Expose default HTTP ingress port (Cloud Run dynamically sets PORT at runtime)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://0.0.0.0:${PORT:-3000}/health || exit 1

# Start full-stack Node.js server
CMD ["node", "dist/server.cjs"]
