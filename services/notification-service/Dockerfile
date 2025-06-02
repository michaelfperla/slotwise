# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy workspace package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.json ./

# Copy service-specific files
COPY services/notification-service/package*.json ./services/notification-service/
COPY services/notification-service/tsconfig.json ./services/notification-service/
COPY services/notification-service/project.json ./services/notification-service/

# Copy shared dependencies
COPY shared/ ./shared/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY services/notification-service/src ./services/notification-service/src
COPY services/notification-service/prisma ./services/notification-service/prisma

# Generate Prisma client
WORKDIR /app/services/notification-service
RUN npx prisma generate

# Build using Nx
WORKDIR /app
RUN npx nx build @slotwise/notification-service

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy package files
COPY --from=builder /app/services/notification-service/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/services/notification-service/dist ./dist
COPY --from=builder /app/services/notification-service/prisma ./prisma
COPY --from=builder /app/services/notification-service/node_modules/.prisma ./node_modules/.prisma

# Change ownership to non-root user
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 8004

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
