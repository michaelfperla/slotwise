# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for monorepo setup
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.json ./

# Install root dependencies (includes Nx)
RUN npm install

# Copy frontend package files
COPY frontend/package*.json ./frontend/

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install

# Copy frontend source code
WORKDIR /app
COPY frontend/ ./frontend/

# Build the application using Nx from root (skip linting for Docker build)
ENV NEXT_LINT=false
RUN npx nx build frontend --skip-nx-cache

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init and wget for proper signal handling and health checks
RUN apk add --no-cache dumb-init wget

# Create non-root user first
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy built application from frontend directory with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/frontend/public ./public

USER nextjs

EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
