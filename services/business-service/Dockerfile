# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.json ./
COPY jest.preset.js ./

# Copy service-specific files
COPY services/business-service/package*.json ./services/business-service/
COPY services/business-service/tsconfig.json ./services/business-service/
COPY services/business-service/project.json ./services/business-service/

# Copy shared dependencies
COPY shared/ ./shared/

# Install all dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY services/business-service/src ./services/business-service/src
COPY services/business-service/prisma ./services/business-service/prisma

# Build shared packages first (using direct tsc commands)
WORKDIR /app/shared/types
RUN npm run build

WORKDIR /app/shared/utils
RUN npm run build

# Generate Prisma client
WORKDIR /app/services/business-service
RUN npx prisma generate

# Build the service using direct tsc command
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init and wget for proper signal handling and health checks
RUN apk add --no-cache dumb-init wget

# Create non-root user first
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

# Copy built application with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/services/business-service/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/services/business-service/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs

EXPOSE 8003

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
