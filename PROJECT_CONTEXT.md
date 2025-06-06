# SlotWise Project Context

## Project Directory Structure

```
slotwise/
├── ARCHITECTURE.md
├── BROWSER_TESTING_GUIDE.md
├── CHANGELOG.md
├── CODING_STANDARDS.md
├── CONTRIBUTING.md
├── DEVELOPMENT_PRIORITIES.md
├── DEVELOPMENT_SETUP.md
├── DEVELOPMENT_WORKFLOW.md
├── DOCUMENTATION_AUDIT_REPORT.md
├── DOCUMENTATION_STANDARDS.md
├── ENVIRONMENT_SEPARATION_SUMMARY.md
├── LICENSE
├── MVP_DEVELOPMENT_ROADMAP.md
├── QUICK_START_GUIDE.md
├── README.md
├── STANDARDIZATION_IMPLEMENTATION.md
├── competitive_ux_analysis.md
├── complete-mvp-demo.js
├── create-business-owner.json
├── create-demo-user.json
├── create-jwt-token.js
├── docker-compose.test.yml
├── docs/
│   ├── CI_PHILOSOPHY.md
│   ├── TESTING_GUIDE.md
│   ├── TESTING_SETUP.md
│   ├── adrs/
│   ├── api-documentation.md
│   ├── auth-service-api.yaml
│   ├── deployment-guide.md
│   ├── notification-service-api.yaml
│   ├── scheduling-service-api.yaml
│   ├── standards/
│   └── troubleshooting.md
├── e2e/
│   ├── global-setup.ts
│   ├── global-teardown.ts
│   ├── jest.config.js
│   ├── package.json
│   ├── setup.ts
│   └── tests/
├── frontend/
│   ├── Dockerfile
│   ├── FOUNDATION_README.md
│   ├── PHASE_1_IMPLEMENTATION.md
│   ├── PHASE_2_IMPLEMENTATION.md
│   ├── README.md
│   ├── eslint.config.mjs
│   ├── jest.config.mjs
│   ├── jest.setup.js
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── project.json
│   ├── public/
│   ├── src/
│   ├── tsconfig.json
│   └── tsconfig.tsbuildinfo
├── frontend_architecture_plan.md
├── implementation_auth.md
├── information_architecture_principles.md
├── infrastructure/
│   ├── docker/
│   ├── docker-compose.dev.yml
│   ├── docker-compose.production.yml
│   ├── k8s/
│   ├── nats/
│   ├── nginx/
│   └── postgres/
├── investor-demo-final.js
├── jest.preset.js
├── login-demo-user.json
├── nx.json
├── package-lock.json
├── package.json
├── pkg/
│   └── testing/
├── revised_design_concepts.md
├── scripts/
│   ├── dev-setup.sh
│   ├── docker-manager.ps1
│   ├── docker-manager.sh
│   ├── seed-dev-data.js
│   ├── setup-dev.sh
│   ├── setup-test-databases.js
│   ├── setup-test-environment.sh
│   ├── test-all.sh
│   ├── test-api-endpoints.sh
│   ├── test-docker-builds.ps1
│   ├── test-node-services.ps1
│   ├── validate-dependency-updates.ps1
│   └── validate-dependency-updates.sh
├── services/
│   ├── auth-service/
│   ├── business-service/
│   ├── notification-service/
│   └── scheduling-service/
├── setup-env-files.ps1
├── shared/
│   ├── types/
│   └── utils/
├── simple-mvp-demo.js
├── sprint-tasks/
│   ├── TASK-1-BUSINESS-DASHBOARD.md
│   ├── TASK-2-CUSTOMER-BOOKING.md
│   ├── TASK-3-PAYMENT-INTEGRATION.md
│   ├── TASK-4-REALTIME-AVAILABILITY.md
│   └── TASK-5-NOTIFICATIONS-ANALYTICS.md
├── start-docker.ps1
├── start-slotwise.ps1
├── stop-slotwise.ps1
├── templates/
│   ├── api-endpoint-template.ts
│   └── service-template.ts
├── test-mvp-flow.js
├── test-user.json
├── tsconfig.json
├── user_journey_data_model.sql
├── user_journey_maps.md
├── user_personas_and_flows.md
├── visual_design_and_style_guide.md
├── wireframes_set1.md
└── wireframes_set2.md
```

## Dependencies

```json
{
  "name": "slotwise",
  "version": "1.0.0",
  "description": "High-velocity scheduling platform for solopreneurs and small businesses",
  "private": true,
  "workspaces": ["frontend", "services/*", "shared/*"],
  "scripts": {
    "install:all": "npm install && npm run install:frontend && npm run install:services",
    "install:frontend": "cd frontend && npm install",
    "install:services": "cd services/auth-service && npm install && cd ../business-service && npm install && cd ../notification-service && npm install",
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:services\" \"npm run dev:nats\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:services": "concurrently \"npm run dev:auth\" \"npm run dev:business\" \"npm run dev:scheduling\" \"npm run dev:notification\"",
    "dev:auth": "cd services/auth-service && set PORT=8001&& set DATABASE_HOST=localhost&& set DATABASE_USER=slotwise&& set DATABASE_PASSWORD=slotwise_dev_password&& set DATABASE_NAME=slotwise_auth&& go run main.go",
    "dev:business": "cd services/business-service && npm run dev",
    "dev:scheduling": "cd services/scheduling-service && set PORT=8002&& set DATABASE_URL=postgres://slotwise:slotwise_dev_password@localhost:5432/slotwise_scheduling?sslmode=disable&& go run main.go",
    "dev:notification": "cd services/notification-service && npm run dev",
    "dev:nats": "echo 'NATS is started via Docker'",
    "build": "npx nx run-many -t build",
    "build:affected": "npx nx affected -t build",
    "build:frontend": "cd frontend && npm run build",
    "build:services": "npm run build:auth && npm run build:business && npm run build:scheduling && npm run build:notification",
    "build:auth": "cd services/auth-service && go build -o bin/auth-service main.go",
    "build:business": "cd services/business-service && npm run build",
    "build:scheduling": "cd services/scheduling-service && go build -o bin/scheduling-service main.go",
    "build:notification": "cd services/notification-service && npm run build",
    "test": "npm run test:setup && npx nx run-many -t test --passWithNoTests",
    "test:setup": "node scripts/setup-test-databases.js",
    "test:affected": "npx nx affected -t test --passWithNoTests",
    "test:all": "npm run test:frontend && npm run test:services",
    "test:frontend": "cd frontend && npm test",
    "test:services": "npm run test:auth && npm run test:business && npm run test:scheduling && npm run test:notification",
    "test:auth": "cd services/auth-service && go test ./...",
    "test:business": "cd services/business-service && npm test",
    "test:scheduling": "cd services/scheduling-service && go test ./...",
    "test:notification": "cd services/notification-service && npm test",
    "test:integration": "npx nx run-many -t test:integration --passWithNoTests",
    "test:e2e": "cd e2e && npm test",
    "infra:up": "docker-compose -f infrastructure/docker-compose.dev.yml up -d",
    "infra:down": "docker-compose -f infrastructure/docker-compose.dev.yml down",
    "infra:logs": "docker-compose -f infrastructure/docker-compose.dev.yml logs -f",
    "infra:clean": "docker-compose -f infrastructure/docker-compose.dev.yml down -v && docker system prune -f",
    "health:check": "curl -f http://localhost:8001/health && curl -f http://localhost:8003/health && curl -f http://localhost:8004/health",
    "lint": "npx nx run-many -t lint",
    "lint:affected": "npx nx affected -t lint",
    "lint:frontend": "cd frontend && npm run lint",
    "lint:services": "npm run lint:business && npm run lint:notification",
    "lint:business": "cd services/business-service && npm run lint",
    "lint:notification": "cd services/notification-service && npm run lint",
    "format": "npm run format:frontend && npm run format:services",
    "format:frontend": "cd frontend && npm run format",
    "format:services": "npm run format:business && npm run format:notification",
    "format:business": "cd services/business-service && npm run format",
    "format:notification": "cd services/notification-service && npm run format",
    "prisma:generate:all": "npm run prisma:generate:business && npm run prisma:generate:notification",
    "prisma:generate:business": "cd services/business-service && npx prisma generate",
    "prisma:generate:notification": "cd services/notification-service && npx prisma generate",
    "ci:validate": "npm run ci:setup && npm run ci:typecheck && npm run ci:build && npm run ci:lint",
    "ci:setup": "npm ci && npm run prisma:generate:all",
    "ci:typecheck": "npx nx run-many -t typecheck --all",
    "ci:build": "npx nx run-many -t build --all",
    "ci:lint": "npx nx run-many -t lint --all",
    "ci:test:unit": "npm run test:setup && npx nx run-many -t test --all --passWithNoTests",
    "typecheck": "npx nx run-many -t typecheck",
    "typecheck:affected": "npx nx affected -t typecheck",
    "docker:build": "docker-compose -f infrastructure/docker-compose.yml build",
    "docker:up": "docker-compose -f infrastructure/docker-compose.yml up -d",
    "docker:down": "docker-compose -f infrastructure/docker-compose.yml down",
    "k8s:deploy": "kubectl apply -f infrastructure/k8s/",
    "k8s:delete": "kubectl delete -f infrastructure/k8s/",
    "setup": "./scripts/setup-dev.sh",
    "clean": "npm run clean:services && npm run clean:frontend",
    "clean:services": "cd services/business-service && npm run clean && cd ../notification-service && npm run clean",
    "clean:frontend": "cd frontend && rm -rf .next",
    "db:migrate": "npm run db:migrate:business && npm run db:migrate:notification",
    "db:migrate:business": "cd services/business-service && npx prisma migrate dev",
    "db:migrate:notification": "cd services/notification-service && npx prisma migrate dev",
    "db:seed": "node scripts/seed-dev-data.js",
    "db:reset": "npm run db:migrate && npm run db:seed",
    "test:api": "chmod +x scripts/test-api-endpoints.sh && ./scripts/test-api-endpoints.sh",
    "deps:update": "npm run deps:update:go && npm run deps:update:node",
    "deps:update:go": "npm run deps:update:auth && npm run deps:update:scheduling",
    "deps:update:auth": "cd services/auth-service && go get -u && go mod tidy",
    "deps:update:scheduling": "cd services/scheduling-service && go get -u && go mod tidy",
    "deps:update:node": "npm run deps:update:business && npm run deps:update:notification && npm run deps:update:frontend",
    "deps:update:business": "cd services/business-service && npm update",
    "deps:update:notification": "cd services/notification-service && npm update",
    "deps:update:frontend": "cd frontend && npm update",
    "deps:audit": "npm run deps:audit:node && npm run deps:audit:go",
    "deps:audit:node": "npm run deps:audit:business && npm run deps:audit:notification && npm run deps:audit:frontend",
    "deps:audit:business": "cd services/business-service && npm audit",
    "deps:audit:notification": "cd services/notification-service && npm audit",
    "deps:audit:frontend": "cd frontend && npm audit",
    "deps:audit:go": "npm run deps:audit:auth && npm run deps:audit:scheduling",
    "deps:audit:auth": "cd services/auth-service && go list -json -deps ./... | nancy sleuth",
    "deps:audit:scheduling": "cd services/scheduling-service && go list -json -deps ./... | nancy sleuth"
  },
  "devDependencies": {
    "@nx/eslint": "21.1.2",
    "@nx/jest": "21.1.2",
    "@nx/next": "^21.1.2",
    "@swc-node/register": "^1.10.10",
    "@swc/core": "^1.11.29",
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^8.33.1",
    "@typescript-eslint/parser": "^8.33.0",
    "concurrently": "^9.1.2",
    "eslint": "~8.57.0",
    "husky": "^9.0.11",
    "jest": "^29.7.0",
    "lint-staged": "^15.2.10",
    "nx": "21.1.2",
    "prettier": "^3.4.2",
    "ts-jest": "^29.2.5",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "overrides": {
    "esbuild": "^0.25.0",
    "koa": "^2.16.1"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/michaelfperla/slotwise.git"
  },
  "keywords": [
    "scheduling",
    "booking",
    "microservices",
    "event-driven",
    "typescript",
    "go",
    "react",
    "nextjs"
  ],
  "author": "SlotWise Team",
  "license": "MIT",
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"],
    "*.prisma": ["prettier --write"]
  },
  "dependencies": {
    "jsonwebtoken": "^9.0.2",
    "next": "~15.2.4",
    "pg": "^8.16.0",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  }
}
```

## Available Scripts

### Development Scripts

- **`dev`** - Start all services and frontend in development mode
- **`dev:frontend`** - Start frontend development server
- **`dev:services`** - Start all backend services
- **`dev:auth`** - Start auth service (Go)
- **`dev:business`** - Start business service (Node.js)
- **`dev:scheduling`** - Start scheduling service (Go)
- **`dev:notification`** - Start notification service (Node.js)

### Build Scripts

- **`build`** - Build all services and frontend
- **`build:affected`** - Build only affected services
- **`build:frontend`** - Build frontend
- **`build:services`** - Build all backend services
- **`build:auth`** - Build auth service
- **`build:business`** - Build business service
- **`build:scheduling`** - Build scheduling service
- **`build:notification`** - Build notification service

### Test Scripts

- **`test`** - Run all tests with setup
- **`test:all`** - Run frontend and service tests
- **`test:frontend`** - Run frontend tests
- **`test:services`** - Run all service tests
- **`test:auth`** - Run auth service tests (Go)
- **`test:business`** - Run business service tests
- **`test:scheduling`** - Run scheduling service tests (Go)
- **`test:notification`** - Run notification service tests
- **`test:integration`** - Run integration tests
- **`test:e2e`** - Run end-to-end tests

### Infrastructure Scripts

- **`infra:up`** - Start development infrastructure (Docker)
- **`infra:down`** - Stop development infrastructure
- **`infra:logs`** - View infrastructure logs
- **`infra:clean`** - Clean infrastructure and Docker system

### Code Quality Scripts

- **`lint`** - Lint all code
- **`lint:affected`** - Lint only affected code
- **`format`** - Format all code
- **`typecheck`** - Type check all TypeScript code

### Database Scripts

- **`db:migrate`** - Run database migrations
- **`db:seed`** - Seed development data
- **`db:reset`** - Reset and seed databases
- **`prisma:generate:all`** - Generate Prisma clients

### Docker & Kubernetes Scripts

- **`docker:build`** - Build Docker images
- **`docker:up`** - Start production Docker stack
- **`docker:down`** - Stop production Docker stack
- **`k8s:deploy`** - Deploy to Kubernetes
- **`k8s:delete`** - Delete from Kubernetes

### Utility Scripts

- **`setup`** - Setup development environment
- **`clean`** - Clean build artifacts
- **`health:check`** - Check service health
- **`deps:update`** - Update all dependencies
- **`deps:audit`** - Audit dependencies for vulnerabilities

## Version Control Status

### Current Branches

```
* feat/deep-ux-design-enhancements
  main
  remotes/origin/HEAD -> origin/main
  remotes/origin/dependabot/go_modules/services/auth-service/golang.org/x/crypto-0.35.0
  remotes/origin/dependabot/go_modules/services/auth-service/golang.org/x/net-0.38.0
  remotes/origin/dependabot/go_modules/services/auth-service/google.golang.org/protobuf-1.33.0
  remotes/origin/dependabot/npm_and_yarn/bcryptjs-3.0.2
  remotes/origin/dependabot/npm_and_yarn/date-fns-4.1.0
  remotes/origin/dependabot/npm_and_yarn/services/business-service/bcryptjs-3.0.2
  remotes/origin/dependabot/npm_and_yarn/services/business-service/fastify-5.3.3
  remotes/origin/dependabot/npm_and_yarn/services/business-service/fastify/swagger-ui-5.2.3
  remotes/origin/dependabot/npm_and_yarn/services/business-service/typescript-eslint/eslint-plugin-8.33.0
  remotes/origin/dependabot/npm_and_yarn/services/notification-service/fastify/rate-limit-10.3.0
  remotes/origin/dependabot/npm_and_yarn/services/notification-service/pino-9.7.0
  remotes/origin/dependabot/npm_and_yarn/services/notification-service/prisma/client-6.8.2
  remotes/origin/dependabot/npm_and_yarn/services/notification-service/typescript-eslint/eslint-plugin-8.33.0
  remotes/origin/dependabot/npm_and_yarn/shared/utils/date-fns-4.1.0
  remotes/origin/dependabot/npm_and_yarn/shared/utils/date-fns-tz-3.2.0
  remotes/origin/feat/auth-api-docs
  remotes/origin/feat/auth-service-swagger-docs
  remotes/origin/feat/deep-ux-design-enhancements
  remotes/origin/feature/customer-booking
  remotes/origin/feature/mvp-core-functionality
  remotes/origin/feature/notifications-analytics
  remotes/origin/feature/payment-integration
  remotes/origin/feature/realtime-availability-backend
  remotes/origin/fix/failing-checks
  remotes/origin/frontend_basic
  remotes/origin/main
  remotes/origin/refactor/auth-provider-context
```

### Recent Commits

```
76a952e (HEAD -> feat/deep-ux-design-enhancements, origin/feat/deep-ux-design-enhancements) Incorporate deep UX exploration into frontend design
3810764 (origin/main, origin/HEAD, main) new file: BROWSER_TESTING_GUIDE.md new file: complete-mvp-demo.js new file: create-business-owner.json new file: create-demo-user.json new file: create-jwt-token.js modified: frontend/next.config.ts new file: frontend/public/favicon.svg new file: frontend/src/app/book/page.tsx new file: frontend/src/app/bookings/page.tsx modified: frontend/src/app/business/dashboard/page.tsx new file: frontend/src/app/business/page.tsx modified: frontend/src/app/dashboard/page.tsx modified: frontend/src/app/layout.tsx modified: frontend/src/app/login/page.tsx modified: frontend/src/app/page.tsx modified: frontend/src/app/register/page.tsx modified: frontend/src/components/layout/Navbar.tsx modified: infrastructure/nats/nats.conf new file: investor-demo-final.js new file: login-demo-user.json modified: package-lock.json modified: package.json modified: services/auth-service/internal/database/database.go modified: services/auth-service/internal/models/business.go modified: services/auth-service/internal/service/auth_service.go modified: services/auth-service/main.go modified: services/auth-service/pkg/events/nats.go modified: services/auth-service/project.json modified: services/business-service/prisma/schema.prisma modified: services/business-service/src/index.ts modified: services/business-service/src/routes/analyticsRoutes.ts modified: services/business-service/src/routes/business.ts modified: services/business-service/src/services/AvailabilityService.ts modified: services/business-service/src/services/__tests__/AvailabilityService.unit.test.ts modified: services/business-service/src/services/__tests__/BusinessService.unit.test.ts deleted: services/business-service/src/services/analyticsService.ts modified: services/notification-service/jest.config.cjs modified: services/notification-service/package.json modified: services/notification-service/src/routes/__tests__/businessNotificationSettingsRoutes.test.ts modified: services/notification-service/src/routes/__tests__/notificationRoutes.test.ts modified: services/notification-service/src/routes/businessNotificationSettingsRoutes.ts modified: services/notification-service/src/routes/notification.ts modified: services/notification-service/src/services/emailService.test.ts modified: services/notification-service/src/services/emailService.ts modified: services/notification-service/src/subscribers/bookingEventHandlers.test.ts new file: services/notification-service/src/templates/email-base.hbs modified: services/scheduling-service/.env.example modified: services/scheduling-service/internal/config/config.go modified: services/scheduling-service/internal/database/database.go modified: services/scheduling-service/internal/handlers/booking_handler_test.go modified: services/scheduling-service/internal/models/booking.go modified: services/scheduling-service/internal/repository/repository.go modified: services/scheduling-service/internal/service/booking_service_test.go modified: services/scheduling-service/main.go modified: services/scheduling-service/pkg/events/events.go modified: services/scheduling-service/project.json new file: simple-mvp-demo.js new file: test-mvp-flow.js new file: test-user.json
36bd1c7 Merge feature/payment-integration into main
354d2cb fix: Resolve TypeScript and build errors in payment integration
2d53828 Merge feature/notifications-analytics into main
4761082 fix: Resolve TypeScript compilation errors in notification service
17707cf Merge feature/customer-booking into main
e39c59f fix: Resolve TypeScript and build errors in customer booking branch
84f5069 Merge branch 'feature/realtime-availability-backend'
9df220e fix: Resolve compilation errors in realtime availability backend
```
# SlotWise 🚀

[![CI](https://github.com/michaelfperla/slotwise/workflows/CI/badge.svg)](https://github.com/michaelfperla/slotwise/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Go](https://img.shields.io/badge/Go-00ADD8?logo=go&logoColor=white)](https://golang.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?logo=kubernetes&logoColor=white)](https://kubernetes.io/)

A high-velocity scheduling platform designed for solopreneurs and small
businesses. Built with modern microservices architecture, event-driven design,
and comprehensive type safety.

## ✨ Features

- 🏢 **Multi-tenant Architecture** - Support for unlimited businesses with
  custom subdomains
- 📅 **Smart Scheduling** - Real-time availability calculation with conflict
  detection
- 💳 **Payment Processing** - Integrated Stripe payments with automatic refunds
- 📧 **Multi-channel Notifications** - Email, SMS, and push notifications
- 🔐 **Enterprise Security** - JWT authentication, RBAC, and comprehensive input
  validation
- ⚡ **High Performance** - Event-driven architecture with Redis caching
- 🌍 **Global Ready** - Multi-timezone support and internationalization
- 📱 **Mobile Responsive** - Modern React frontend with Tailwind CSS
- 🔧 **Developer Friendly** - Comprehensive API documentation and type safety

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Core Features (MVP)](#-core-features-mvp)
- [Development](#-development)
- [Documentation](#-documentation)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

## 🎯 Overview

SlotWise is a modern, scalable scheduling platform designed for solopreneurs and
small businesses. Built with a microservices architecture and event-driven
design for maximum scalability and developer velocity.

**Perfect for:**

- Consultants and coaches
- Healthcare providers
- Beauty and wellness services
- Professional services
- Any appointment-based business

**Key Benefits:**

- ⚡ **Fast Setup** - Get your booking system running in minutes
- 🔄 **Real-time Sync** - Instant availability updates across all channels
- 💰 **Revenue Optimization** - Automated payment processing and reminders
- 📊 **Business Insights** - Comprehensive analytics and reporting
- 🛡️ **Enterprise Grade** - Security, reliability, and scalability built-in

## 🏗️ Architecture

SlotWise follows a modern microservices architecture with event-driven
communication:

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │
│   (Next.js)     │◄──►│   (Nginx)       │
│   Port: 3000    │    │   Port: 8080    │
└─────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
        │ Auth Service │ │Business Svc │ │Schedule Svc│
        │   (Go)       │ │ (Node.js)   │ │   (Go)     │
        │ Port: 8001   │ │ Port: 8003  │ │ Port: 8002 │
        └──────┬───────┘ └─────┬───────┘ └────┬───────┘
               │               │              │
               └───────────────┼──────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Notification Service│
                    │    (Node.js)        │
                    │    Port: 8004       │
                    └─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │     NATS.io         │
                    │  Message Broker     │
                    └─────────────────────┘
```

### Technology Stack

| Component                | Technology                       | Purpose                                        |
| ------------------------ | -------------------------------- | ---------------------------------------------- |
| **Frontend**             | Next.js 14, React 18, TypeScript | Modern web application with SSR                |
| **API Gateway**          | Nginx                            | Load balancing, rate limiting, SSL termination |
| **Auth Service**         | Go, GORM, JWT                    | Authentication and authorization               |
| **Business Service**     | Node.js, TypeScript, Prisma      | Business and service management                |
| **Scheduling Service**   | Go, GORM, Cron                   | Booking logic and availability                 |
| **Notification Service** | Node.js, TypeScript, Bull        | Multi-channel notifications                    |
| **Database**             | PostgreSQL                       | Primary data storage                           |
| **Cache**                | Redis                            | Session storage and caching                    |
| **Message Broker**       | NATS.io with JetStream           | Event-driven communication                     |
| **Containerization**     | Docker, Docker Compose           | Development and deployment                     |
| **Orchestration**        | Kubernetes, Helm                 | Production deployment                          |

## Project Structure

```
slotwise/
├── frontend/                 # React + Next.js frontend application
├── services/                 # Backend microservices
│   ├── auth-service/        # Authentication & authorization
│   ├── scheduling-service/  # Core scheduling logic
│   ├── business-service/    # Business & user management
│   └── notification-service/# Email/SMS notifications
├── infrastructure/          # Kubernetes, Terraform, Docker configs
├── shared/                  # Shared libraries and types
├── docs/                    # Documentation
└── scripts/                 # Development and deployment scripts
```

## 🚀 Quick Start

**Get SlotWise running in 5 minutes!** See
[QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) for detailed instructions.

### One-Command Setup

```bash
# Clone and setup everything
git clone https://github.com/michaelfperla/slotwise.git
cd slotwise
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh

# Start all services
npm run dev

# Add sample data
npm run db:seed

# Test everything works
npm run test:api
```

### Manual Development Setup

```bash
# Install dependencies
npm run install:all

# Start infrastructure (PostgreSQL, Redis, NATS)
npm run infra:up

# Start development environment
npm run dev

# Run tests
npm run test:all

# Stop infrastructure
npm run infra:down
```

### Production Deployment

```bash
# Build and deploy with Docker Compose
npm run docker:build
npm run docker:up

# Or deploy to Kubernetes
npm run k8s:deploy
```

## Services

### Frontend (Port 3000)

- React 18 with Next.js 14
- TypeScript for type safety
- TanStack Query for data fetching
- Zustand for state management

### Auth Service (Port 8001)

- JWT-based authentication
- OAuth2/OIDC support
- User session management

### Scheduling Service (Port 8002)

- Availability management
- Booking logic and conflict resolution
- Calendar integrations

### Business Service (Port 8003)

- User profile management
- Service definitions
- Subdomain management

### Notification Service (Port 8004)

- Email notifications (SendGrid)
- SMS notifications (Twilio)
- Event-driven messaging

## 📚 Documentation

SlotWise maintains comprehensive documentation to support development,
deployment, and maintenance:

### **Development Standards**

- 🚀 [**CI/CD Philosophy**](docs/CI_PHILOSOPHY.md) - **Start here!** Our
  approach to continuous integration and development workflow
- 📋 [**Coding Standards**](CODING_STANDARDS.md) - TypeScript, Go, React,
  Database, API, and NATS event standards
- 🔄 [**Development Workflow**](DEVELOPMENT_WORKFLOW.md) - Git workflow, commit
  standards, PR process, and code review guidelines
- 🏗️ [**Architecture Documentation**](ARCHITECTURE.md) - System design, service
  interactions, database schemas, and deployment patterns
- 📚 [**Documentation Standards**](DOCUMENTATION_STANDARDS.md) - Documentation
  guidelines, templates, and maintenance procedures

### **Technical Guides**

- 🚀 [**API Documentation**](docs/api-documentation.md) - Complete REST API
  reference with examples
- 🎯
  [**Event-Driven Architecture**](docs/standards/event-driven-architecture.md) -
  NATS event patterns and message schemas
- 🚀 [**Deployment Guide**](docs/deployment-guide.md) - Production deployment
  with Docker and Kubernetes
- 🧪 [**Testing Setup**](docs/TESTING_SETUP.md) - Testing framework, patterns,
  and best practices
- 🐛 [**Troubleshooting**](docs/troubleshooting.md) - Common issues, debugging,
  and solutions

### **Development Guides**

- 🚀 [**Quick Start Guide**](QUICK_START_GUIDE.md) - Get running in 5 minutes
- 🎯 [**Development Priorities**](DEVELOPMENT_PRIORITIES.md) - Critical path to
  MVP
- 🏗️ [**Development Workflow**](DEVELOPMENT_WORKFLOW.md) - Git workflow and
  processes
- 📋 [**Coding Standards**](CODING_STANDARDS.md) - Code style and conventions
- 🤝 [**Contributing Guide**](CONTRIBUTING.md) - How to contribute
- 📊 [**MVP Roadmap**](MVP_DEVELOPMENT_ROADMAP.md) - Development milestones

### **Development Guidelines**

- **API-first design** with OpenAPI specifications
- **Comprehensive testing** (unit, integration, e2e) with 80%+ coverage
- **Event-driven architecture** with NATS for service communication
- **Type-safe development** across all TypeScript and Go services
- **Security by design** with JWT authentication and input validation
- **Automated quality enforcement** with ESLint, Prettier, and pre-commit hooks

## Core Features (MVP)

### 🔐 Authentication & Authorization

- JWT-based authentication with refresh tokens
- Role-based access control (Admin, Business Owner, Client)
- OAuth2/OIDC support for social login
- Password reset and email verification

### 🏢 Business Management

- Multi-tenant business setup with custom subdomains
- Service definition and pricing management
- Business profile and settings configuration
- Subscription management (Free, Starter, Professional, Enterprise)

### 📅 Scheduling & Booking

- Flexible availability rule management
- Real-time booking conflict detection
- Automated booking confirmations and reminders
- Support for different time zones
- Booking cancellation and rescheduling

### 💳 Payment Processing

- Stripe integration for secure payments
- Support for multiple payment methods
- Automatic refund processing
- Payment intent management for better UX

### 📧 Notifications

- Multi-channel notifications (Email, SMS, Push)
- Template-based messaging with Handlebars
- SendGrid integration for email delivery
- Twilio integration for SMS notifications
- Event-driven notification triggers

## Architecture Highlights

### 🎯 Event-Driven Design

- NATS.io message broker for service communication
- Event sourcing for audit trails and data consistency
- Asynchronous processing for better performance
- Resilient service communication patterns

### 🔄 Microservices Architecture

- Independent service deployment and scaling
- Service-specific databases for data isolation
- API Gateway for unified external interface
- Health checks and monitoring for each service

### 🚀 Performance & Scalability

- Redis caching for frequently accessed data
- Database connection pooling and optimization
- Horizontal scaling support with Kubernetes
- CDN integration for static assets

### 🛡️ Security Features

- Input validation and sanitization
- Rate limiting and DDoS protection
- CORS configuration for cross-origin requests
- Security headers and best practices

## API Documentation

### Service Documentation Status

- **Business Service**: ✅ http://localhost:8003/docs (Swagger/OpenAPI
  available)
- **Auth Service**: ✅ Documentation updated
- **Scheduling Service**: ✅ Documentation updated
- **Notification Service**: ✅ Documentation updated

### Comprehensive API Documentation

See [docs/api-documentation.md](./docs/api-documentation.md) for detailed API
reference covering all services.

## Monitoring & Observability

### Development Tools

- **Database Admin**: http://localhost:8080 (Adminer)
- **Redis Admin**: http://localhost:8081 (Redis Commander)
- **NATS Monitoring**: http://localhost:8082 (NATS Surveyor)
- **API Gateway**: http://localhost:8080

### Health Checks

All services provide health check endpoints:

- `/health` - Basic health status
- `/health/ready` - Readiness check (dependencies ready)
- `/health/live` - Liveness check (service alive)

## Testing Strategy

### Test Types

- **Unit Tests**: Individual component testing
- **Integration Tests**: Service interaction testing
- **End-to-End Tests**: Complete user flow testing
- **API Tests**: REST API endpoint testing
- **Performance Tests**: Load and stress testing

### Running Tests

```bash
# Run all tests
npm run test:all

# Run specific service tests
cd services/business-service && npm test
cd services/auth-service && go test ./...

# Run with coverage
npm run test:coverage
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md)
for details.

### Quick Contribution Steps

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following our
   [coding standards](docs/development-guide.md)
4. **Add tests** for your changes
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Resources

- 📋 [Coding Standards](CODING_STANDARDS.md) - Comprehensive coding guidelines
- 🔄 [Development Workflow](DEVELOPMENT_WORKFLOW.md) - Git workflow and PR
  process
- 🏗️ [Architecture Documentation](ARCHITECTURE.md) - System design and service
  interactions
- 📚 [Documentation Standards](DOCUMENTATION_STANDARDS.md) - Documentation
  guidelines
- 🚀 [API Documentation](docs/api-documentation.md) - REST API reference
- 🎯 [Event-Driven Architecture](docs/standards/event-driven-architecture.md) -
  NATS event patterns
- 🚀 [Deployment Guide](docs/deployment-guide.md) - Production deployment
  instructions
- 🧪 [Testing Setup](docs/TESTING_SETUP.md) - Testing framework and guidelines
- 🐛 [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## 🆘 Support

### Community Support

- 💬
  [GitHub Discussions](https://github.com/michaelfperla/slotwise/discussions) -
  Ask questions and share ideas
- 🐛 [GitHub Issues](https://github.com/michaelfperla/slotwise/issues) - Report
  bugs and request features
- 📚 [Documentation](docs/) - Comprehensive guides and API docs

### Commercial Support

- 📧 **Email**: support@slotwise.com
- 🌐 **Website**: https://slotwise.com
- 💼 **Enterprise**: enterprise@slotwise.com

### Stay Updated

- ⭐ **Star this repo** to stay updated with new releases
- 👀 **Watch** for notifications about important updates
- 🐦 **Follow us** on [Twitter](https://twitter.com/slotwise) for announcements

---

<div align="center">

**Built with ❤️ by the SlotWise team**

[Website](https://slotwise.com) • [Documentation](docs/) •
[API](docs/api-documentation.md) • [Contributing](CONTRIBUTING.md)

</div>
# Contributing to SlotWise

We love your input! We want to make contributing to SlotWise as easy and
transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as
accept pull requests.

**🚀 Before you start:** Read our [CI/CD Philosophy](docs/CI_PHILOSOPHY.md) to
understand our development approach and what our CI checks.

### Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively
welcome your pull requests:

1. **Fork the repo** and create your branch from `main`.
2. **Make your changes** following our [Coding Standards](CODING_STANDARDS.md).
3. **Follow our workflow** as outlined in
   [Development Workflow](DEVELOPMENT_WORKFLOW.md).
4. **Add tests** if you've added code that should be tested.
5. **Update documentation** following
   [Documentation Standards](DOCUMENTATION_STANDARDS.md).
6. **Ensure the test suite passes** by running `npm run test:all`.
7. **Make sure your code lints** by running `npm run lint`.
8. **Issue that pull request!**

### Development Setup

1. **Clone your fork**:

   ```bash
   git clone https://github.com/your-username/slotwise.git
   cd slotwise
   ```

2. **Set up development environment**:

   ```bash
   chmod +x scripts/setup-dev.sh
   ./scripts/setup-dev.sh
   ```

3. **Create a feature branch**:

   ```bash
   git checkout -b feature/amazing-feature
   ```

4. **Make your changes and test**:

   ```bash
   # Start development
   npm run dev

   # Before committing, run these locally:
   npm run format        # Fix code formatting
   npm run build         # Ensure code compiles
   npm run test          # Run essential tests
   npm run lint          # Check code quality (advisory)
   ```

5. **Commit your changes**:

   ```bash
   git commit -m "Add amazing feature"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/amazing-feature
   ```

## Coding Standards

SlotWise follows comprehensive coding standards to ensure consistent,
maintainable code across all services. Please review our detailed standards
documentation:

### 📋 **[Coding Standards](CODING_STANDARDS.md)**

Complete guidelines for TypeScript/Node.js, Go, React, Database, API Design,
NATS Events, and Testing standards.

### 🔄 **[Development Workflow](DEVELOPMENT_WORKFLOW.md)**

Git workflow, branch management, commit standards, PR process, and code review
guidelines.

### 🏗️ **[Architecture Documentation](ARCHITECTURE.md)**

System design, service interactions, database schemas, and deployment patterns.

### 📚 **[Documentation Standards](DOCUMENTATION_STANDARDS.md)**

Guidelines for code documentation, API docs, architecture docs, and user guides.

### Quick Reference

- **TypeScript/JavaScript**: Use TypeScript, follow ESLint/Prettier, write JSDoc
  comments
- **Go**: Follow standard conventions, comprehensive error handling, GoDoc
  comments
- **Database**: Use migrations, snake_case naming, proper indexing
- **API Design**: RESTful principles, consistent responses, OpenAPI
  documentation
- **Testing**: 80%+ coverage, unit/integration/e2e tests, clear test structure

## Testing Guidelines

### Test Coverage

- Maintain **minimum 80% code coverage**
- Write **unit tests** for all business logic
- Include **integration tests** for API endpoints
- Add **end-to-end tests** for critical user flows

### Test Structure

```typescript
describe('Feature', () => {
  describe('when condition', () => {
    it('should do expected behavior', () => {
      // Arrange
      const input = createTestInput();

      // Act
      const result = performAction(input);

      // Assert
      expect(result).toEqual(expectedOutput);
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm run test:all

# Run specific service tests
cd services/business-service && npm test
cd services/auth-service && go test ./...

# Run with coverage
npm run test:coverage
```

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/)
specification:

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

### Examples

```bash
feat(auth): add OAuth2 social login support

fix(booking): resolve timezone conversion bug in availability calculation

docs(api): update authentication endpoint documentation

test(business): add integration tests for service creation
```

## Issue Reporting

### Bug Reports

Great bug reports tend to have:

- A quick summary and/or background
- Steps to reproduce (be specific!)
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening)

### Feature Requests

Feature requests should include:

- **Problem statement**: What problem does this solve?
- **Proposed solution**: How should this feature work?
- **Alternatives considered**: What other approaches did you consider?
- **Additional context**: Screenshots, mockups, or examples

## Code Review Process

### For Contributors

- **Keep PRs focused**: One feature or fix per PR
- **Write clear descriptions**: Explain what and why, not just how
- **Respond to feedback**: Address reviewer comments promptly
- **Update documentation**: Keep docs in sync with code changes

### For Reviewers

- **Be constructive**: Provide helpful feedback, not just criticism
- **Focus on the code**: Review the implementation, not the person
- **Ask questions**: If something is unclear, ask for clarification
- **Approve when ready**: Don't hold up good code for minor issues

## Security

### Reporting Security Issues

**Do not report security vulnerabilities through public GitHub issues.**

Instead, please email security@slotwise.com with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We'll respond within 48 hours and work with you to resolve the issue.

### Security Best Practices

- **Never commit secrets** (API keys, passwords, etc.)
- **Use environment variables** for configuration
- **Validate all inputs** at API boundaries
- **Follow OWASP guidelines** for web security
- **Keep dependencies updated** to patch vulnerabilities

## Documentation

### What to Document

- **API changes**: Update OpenAPI specs
- **New features**: Add usage examples
- **Breaking changes**: Include migration guides
- **Architecture decisions**: Document the why, not just the what

### Documentation Standards

- Use **clear, concise language**
- Include **code examples** where helpful
- Keep **README files updated**
- Write **inline comments** for complex logic

## Community Guidelines

### Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By
participating, you are expected to uphold this code.

### Getting Help

- **Documentation**: Check the [docs](docs/) directory first
- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Create an issue for bugs or feature requests
- **Discord**: Join our community Discord server (link in README)

## Recognition

Contributors who make significant contributions will be:

- Added to the **CONTRIBUTORS.md** file
- Mentioned in **release notes**
- Invited to join the **maintainers team** (for ongoing contributors)

## License

By contributing, you agree that your contributions will be licensed under the
MIT License.

## Questions?

Don't hesitate to reach out! You can:

- Open a GitHub Discussion
- Create an issue with the "question" label
- Email us at contributors@slotwise.com

Thank you for contributing to SlotWise! 🎉
