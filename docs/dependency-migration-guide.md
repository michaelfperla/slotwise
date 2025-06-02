# SlotWise Dependency Migration Guide

## Overview

This guide provides step-by-step instructions for migrating SlotWise services to handle breaking changes in major dependency updates.

## Breaking Changes Summary

### Fastify v4 → v5
- **Plugin API Changes**: Some plugin registration methods have changed
- **Type System Updates**: Enhanced TypeScript support with stricter types
- **Performance Improvements**: Better request handling and memory management

### @fastify/cors v8 → v11
- **Default Methods Change**: Now defaults to CORS-safelisted methods only (`GET`, `HEAD`, `POST`)
- **Explicit Configuration Required**: Must specify methods explicitly for full REST API support

### @fastify/swagger-ui v2 → v5
- **Configuration Structure**: Updated configuration options
- **UI Improvements**: Enhanced Swagger UI with better performance
- **Security Enhancements**: Improved CSP and security headers

### @typescript-eslint v6 → v8
- **Rule Changes**: Several rules have been updated or deprecated
- **Configuration Format**: New configuration options available
- **Performance Improvements**: Faster linting with better caching

### NATS.go v1.31 → v1.42
- **Security Fixes**: Critical security vulnerabilities patched
- **New Features**: Per-key TTL functionality for key-value stores
- **Memory Leak Fixes**: Improved memory management

### Viper v1.18 → v1.20
- **Encoding Changes**: Dropped support for HCL, Java properties, INI formats
- **API Changes**: New encoding layer with different configuration methods
- **Breaking Changes**: Some configuration loading methods have changed

## Migration Steps

### 1. Node.js Services Migration

#### Update Package Dependencies
```bash
# Business Service
cd services/business-service
npm install

# Notification Service  
cd services/notification-service
npm install
```

#### Update Fastify Server Configuration

Replace your existing Fastify server setup with the new configuration:

```typescript
// Before (v4)
import Fastify from 'fastify';
import cors from '@fastify/cors';

const fastify = Fastify({ logger: true });
await fastify.register(cors);

// After (v5)
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { corsConfig, serverConfig } from '@slotwise/utils/fastify-config';

const fastify = Fastify(serverConfig);
await fastify.register(cors, corsConfig);
```

#### Update CORS Configuration

```typescript
// Before (v8) - Implicit methods
await fastify.register(cors, {
  origin: true,
  credentials: true
});

// After (v11) - Explicit methods required
await fastify.register(cors, {
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  origin: true,
  credentials: true
});
```

#### Update Swagger Configuration

```typescript
// Before (v2)
await fastify.register(require('@fastify/swagger-ui'), {
  routePrefix: '/docs'
});

// After (v5)
import { swaggerConfig, swaggerUIConfig } from '@slotwise/utils/fastify-config';

await fastify.register(require('@fastify/swagger'), swaggerConfig);
await fastify.register(require('@fastify/swagger-ui'), swaggerUIConfig);
```

#### Update ESLint Configuration

Create new `.eslintrc.js` for TypeScript ESLint v8:

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
    // Updated rules for v8
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
  },
  env: {
    node: true,
    es2022: true,
  },
};
```

### 2. Go Services Migration

#### Update Go Dependencies
```bash
# Auth Service
cd services/auth-service
go mod tidy

# Scheduling Service
cd services/scheduling-service  
go mod tidy
```

#### Update NATS Configuration

```go
// Before (v1.31)
nc, err := nats.Connect(nats.DefaultURL)

// After (v1.42) - Enhanced with new options
opts := []nats.Option{
    nats.Name("SlotWise Service"),
    nats.ReconnectWait(time.Second * 2),
    nats.MaxReconnects(10),
}
nc, err := nats.Connect(nats.DefaultURL, opts...)
```

#### Update Viper Configuration

```go
// Before (v1.18)
viper.SetConfigName("config")
viper.SetConfigType("yaml")
viper.AddConfigPath("./configs")
err := viper.ReadInConfig()

// After (v1.20) - Updated configuration loading
viper.SetConfigName("config")
viper.SetConfigType("yaml") // Only YAML, JSON, TOML supported
viper.AddConfigPath("./configs")

// Use new configuration options
viper.SetEnvPrefix("SLOTWISE")
viper.AutomaticEnv()
viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

err := viper.ReadInConfig()
```

### 3. Testing Migration

#### Update Test Dependencies
```bash
# Update Jest and related testing dependencies
npm update jest @types/jest ts-jest
```

#### Update Test Configuration

```javascript
// jest.config.js - Updated for new versions
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testTimeout: 10000,
};
```

### 4. Configuration Updates

#### Environment Variables
Add new environment variables for enhanced configuration:

```bash
# .env.example
# Fastify v5 Configuration
LOG_LEVEL=info
API_HOST=localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# NATS v1.42 Configuration  
NATS_URL=nats://localhost:4222
NATS_CLUSTER_ID=slotwise-cluster
NATS_CLIENT_ID=slotwise-service

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# Security
JWT_SECRET=your-jwt-secret
CORS_ORIGINS=http://localhost:3000
```

#### Docker Configuration
Update Dockerfile for new dependency versions:

```dockerfile
# Use Node.js 20 for better compatibility
FROM node:20-alpine

# Install dependencies with new package-lock.json
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

### 5. Validation Steps

#### 1. Service Health Checks
```bash
# Test all services start correctly
npm run dev

# Check service endpoints
curl http://localhost:3001/health  # Business Service
curl http://localhost:3002/health  # Notification Service
```

#### 2. API Documentation
```bash
# Verify Swagger UI works
open http://localhost:3001/docs
open http://localhost:3002/docs
```

#### 3. NATS Communication
```bash
# Test NATS connectivity
nats-cli pub test.subject "Hello World"
nats-cli sub test.subject
```

#### 4. Database Connectivity
```bash
# Test database migrations
npm run db:migrate:business
npm run db:migrate:notification
```

### 6. Rollback Plan

If issues occur during migration:

1. **Revert Package Versions**:
   ```bash
   git checkout HEAD~1 -- package.json package-lock.json
   npm install
   ```

2. **Revert Go Dependencies**:
   ```bash
   git checkout HEAD~1 -- go.mod go.sum
   go mod download
   ```

3. **Restart Services**:
   ```bash
   npm run clean
   npm run build
   npm run dev
   ```

## Common Issues and Solutions

### Issue: CORS Errors After Update
**Solution**: Ensure explicit methods configuration in CORS setup

### Issue: Swagger UI Not Loading
**Solution**: Update CSP headers and verify new configuration format

### Issue: ESLint Errors
**Solution**: Update ESLint configuration for v8 rule changes

### Issue: NATS Connection Failures
**Solution**: Verify NATS server compatibility and connection options

### Issue: Viper Configuration Errors
**Solution**: Ensure configuration files use supported formats (YAML/JSON/TOML only)

## Post-Migration Checklist

- [ ] All services start without errors
- [ ] API endpoints respond correctly
- [ ] Swagger documentation loads
- [ ] NATS event communication works
- [ ] Database connections established
- [ ] Tests pass
- [ ] Linting passes
- [ ] Security scans pass
- [ ] Performance benchmarks meet expectations

## Support

For migration issues:
1. Check the troubleshooting guide: `docs/troubleshooting.md`
2. Review service logs for specific error messages
3. Consult dependency-specific migration guides
4. Test changes in development environment first
