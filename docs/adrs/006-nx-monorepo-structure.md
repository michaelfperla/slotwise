# ADR-006: Nx Monorepo Structure

## Status
**Accepted** - June 7, 2025

## Context

SlotWise consists of multiple microservices, frontend applications, shared libraries, and tooling that need to be developed, tested, and deployed together. We need to decide on a repository structure that supports efficient development workflows, code sharing, and consistent tooling across all projects.

### Current Situation
- Multiple microservices (auth, business, scheduling, payment, notification)
- Frontend applications (customer app, business dashboard, admin panel)
- Shared libraries (common utilities, types, configurations)
- Development tooling (linting, testing, deployment scripts)
- Need for consistent dependency management
- Requirement for atomic changes across multiple services

### Requirements
1. **Code Sharing**: Efficient sharing of common code and utilities
2. **Consistent Tooling**: Unified build, test, and deployment processes
3. **Atomic Changes**: Ability to make changes across multiple services
4. **Independent Deployment**: Services can still be deployed independently
5. **Developer Experience**: Fast builds, efficient testing, good IDE support
6. **Scalability**: Structure that scales with team and codebase growth
7. **CI/CD Integration**: Efficient continuous integration and deployment

## Decision

We will use **Nx monorepo** structure to organize all SlotWise code, tooling, and applications in a single repository with sophisticated build orchestration and dependency management.

### Repository Structure

```
slotwise/
├── apps/
│   ├── auth-service/                 # Go microservice
│   ├── business-service/             # Go microservice
│   ├── scheduling-service/           # Go microservice
│   ├── payment-service/              # Go microservice
│   ├── notification-service/         # Go microservice
│   ├── api-gateway/                  # nginx + Go middleware
│   ├── customer-app/                 # Next.js customer application
│   ├── business-dashboard/           # Next.js business dashboard
│   └── admin-panel/                  # Next.js admin panel
├── libs/
│   ├── shared/
│   │   ├── types/                    # TypeScript type definitions
│   │   ├── utils/                    # Common utilities
│   │   ├── ui-components/            # Shared React components
│   │   └── constants/                # Shared constants
│   ├── go-shared/
│   │   ├── logger/                   # Go logging utilities
│   │   ├── database/                 # Database connection utilities
│   │   ├── events/                   # Event schemas and utilities
│   │   ├── middleware/               # Common middleware
│   │   └── testing/                  # Test utilities and factories
│   └── config/
│       ├── eslint/                   # ESLint configurations
│       ├── typescript/               # TypeScript configurations
│       └── docker/                   # Docker configurations
├── tools/
│   ├── scripts/                      # Build and deployment scripts
│   ├── generators/                   # Nx generators for scaffolding
│   └── executors/                    # Custom Nx executors
├── docs/                             # Documentation
├── infrastructure/                   # Infrastructure as code
├── nx.json                          # Nx configuration
├── package.json                     # Root package.json
├── go.work                          # Go workspace configuration
└── README.md
```

### Nx Configuration

#### **nx.json**
```json
{
  "version": 2,
  "cli": {
    "defaultCollection": "@nrwl/workspace"
  },
  "defaultProject": "customer-app",
  "generators": {
    "@nrwl/react": {
      "application": {
        "style": "styled-components",
        "linter": "eslint",
        "bundler": "webpack"
      }
    },
    "@nrwl/next": {
      "application": {
        "style": "styled-components",
        "linter": "eslint"
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"]
    },
    "test": {
      "inputs": ["default", "^production", "{workspaceRoot}/jest.preset.js"]
    },
    "lint": {
      "inputs": ["default", "{workspaceRoot}/.eslintrc.json"]
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/jest.config.[jt]s",
      "!{projectRoot}/.eslintrc.json"
    ],
    "sharedGlobals": []
  }
}
```

#### **Go Workspace Configuration**
```go
// go.work
go 1.21

use (
    ./apps/auth-service
    ./apps/business-service
    ./apps/scheduling-service
    ./apps/payment-service
    ./apps/notification-service
    ./apps/api-gateway
    ./libs/go-shared/logger
    ./libs/go-shared/database
    ./libs/go-shared/events
    ./libs/go-shared/middleware
    ./libs/go-shared/testing
)
```

### Project Configuration Examples

#### **Go Service Configuration**
```json
// apps/auth-service/project.json
{
  "name": "auth-service",
  "root": "apps/auth-service",
  "sourceRoot": "apps/auth-service",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@nrwl/workspace:run-commands",
      "options": {
        "command": "go build -o dist/auth-service ./cmd/server",
        "cwd": "apps/auth-service"
      }
    },
    "test": {
      "executor": "@nrwl/workspace:run-commands",
      "options": {
        "command": "go test ./...",
        "cwd": "apps/auth-service"
      }
    },
    "lint": {
      "executor": "@nrwl/workspace:run-commands",
      "options": {
        "command": "golangci-lint run",
        "cwd": "apps/auth-service"
      }
    },
    "docker-build": {
      "executor": "@nrwl/workspace:run-commands",
      "options": {
        "command": "docker build -t slotwise/auth-service:latest -f apps/auth-service/Dockerfile .",
        "cwd": "."
      }
    },
    "serve": {
      "executor": "@nrwl/workspace:run-commands",
      "options": {
        "command": "go run ./cmd/server",
        "cwd": "apps/auth-service"
      }
    }
  },
  "tags": ["scope:backend", "type:service"]
}
```

#### **Next.js App Configuration**
```json
// apps/customer-app/project.json
{
  "name": "customer-app",
  "root": "apps/customer-app",
  "sourceRoot": "apps/customer-app",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@nrwl/next:build",
      "outputs": ["{options.outputPath}"],
      "defaultConfiguration": "production",
      "options": {
        "outputPath": "dist/apps/customer-app"
      }
    },
    "serve": {
      "executor": "@nrwl/next:serve",
      "defaultConfiguration": "development",
      "options": {
        "buildTarget": "customer-app:build",
        "dev": true
      }
    },
    "test": {
      "executor": "@nrwl/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "jestConfig": "apps/customer-app/jest.config.ts",
        "passWithNoTests": true
      }
    },
    "lint": {
      "executor": "@nrwl/linter:eslint",
      "outputs": ["{options.outputFile}"],
      "options": {
        "lintFilePatterns": ["apps/customer-app/**/*.{ts,tsx,js,jsx}"]
      }
    }
  },
  "tags": ["scope:frontend", "type:app"]
}
```

### Dependency Management

#### **Shared Libraries**
```typescript
// libs/shared/types/src/index.ts
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Date;
}

export enum UserRole {
  CLIENT = 'client',
  BUSINESS_OWNER = 'business_owner',
  ADMIN = 'admin',
}

export interface Booking {
  id: string;
  customerId: string;
  businessId: string;
  serviceId: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
}
```

```go
// libs/go-shared/events/user_events.go
package events

import "time"

type UserCreatedEvent struct {
    BaseEvent
    Data UserCreatedData `json:"data"`
}

type UserCreatedData struct {
    UserID     string    `json:"userId"`
    Email      string    `json:"email"`
    Role       string    `json:"role"`
    BusinessID *string   `json:"businessId,omitempty"`
    CreatedAt  time.Time `json:"createdAt"`
}
```

#### **Build Dependencies**
```json
// Nx automatically manages build dependencies
{
  "implicitDependencies": {
    "auth-service": ["go-shared-logger", "go-shared-database", "go-shared-events"],
    "customer-app": ["shared-types", "shared-ui-components"],
    "business-dashboard": ["shared-types", "shared-ui-components"]
  }
}
```

### Development Workflows

#### **Common Commands**
```bash
# Build all projects
nx run-many --target=build --all

# Test all projects
nx run-many --target=test --all

# Build only affected projects
nx affected --target=build

# Test only affected projects
nx affected --target=test

# Lint all projects
nx run-many --target=lint --all

# Build specific service
nx build auth-service

# Serve frontend app
nx serve customer-app

# Generate new service
nx generate @nrwl/workspace:library --name=new-service --directory=apps

# Show dependency graph
nx graph
```

#### **CI/CD Integration**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - run: npm ci
      
      - run: npx nx affected --target=lint --parallel=3
      - run: npx nx affected --target=test --parallel=3 --ci --code-coverage
      - run: npx nx affected --target=build --parallel=3
```

## Consequences

### Positive
- ✅ **Code Sharing**: Efficient sharing of common utilities and types
- ✅ **Consistent Tooling**: Unified build, test, and deployment processes
- ✅ **Atomic Changes**: Can make changes across multiple services in single PR
- ✅ **Dependency Management**: Automatic dependency tracking and building
- ✅ **Developer Experience**: Fast incremental builds and testing
- ✅ **CI/CD Efficiency**: Only build and test affected projects
- ✅ **Refactoring**: Easy to refactor across service boundaries
- ✅ **Visibility**: Clear view of all dependencies and relationships

### Negative
- ❌ **Repository Size**: Large repository with all code
- ❌ **Clone Time**: Longer initial clone times
- ❌ **Learning Curve**: Team needs to learn Nx tooling
- ❌ **Tool Dependency**: Dependency on Nx ecosystem
- ❌ **Merge Conflicts**: Potential for more merge conflicts
- ❌ **Access Control**: Harder to restrict access to specific services

### Mitigation Strategies
- Use sparse checkout for developers working on specific areas
- Implement proper branch protection and code review processes
- Provide comprehensive Nx training for the team
- Set up efficient CI/CD pipelines with caching
- Use Nx tags and constraints to enforce architectural boundaries

## Alternatives Considered

### 1. Multi-Repository (Polyrepo)
```
slotwise-auth-service/
slotwise-business-service/
slotwise-scheduling-service/
slotwise-customer-app/
slotwise-shared-types/
```

**Rejected because:**
- Difficult to make atomic changes across services
- Complex dependency management
- Inconsistent tooling across repositories
- Harder to maintain shared libraries

### 2. Simple Monorepo (without Nx)
```
slotwise/
├── services/
├── apps/
├── shared/
└── tools/
```

**Rejected because:**
- No sophisticated build orchestration
- Manual dependency management
- No incremental builds
- Limited tooling integration

### 3. Lerna Monorepo
```json
{
  "packages": [
    "services/*",
    "apps/*",
    "libs/*"
  ],
  "version": "independent"
}
```

**Rejected because:**
- Primarily focused on JavaScript/Node.js
- Limited support for Go services
- Less sophisticated than Nx
- Smaller ecosystem

## Implementation Plan

### Phase 1: Repository Setup (Week 1)
1. **Initialize Nx Workspace**
   - Set up Nx workspace with initial configuration
   - Configure Go workspace integration
   - Set up basic project structure

2. **Migrate Existing Code**
   - Move existing services to apps/ directory
   - Extract shared code to libs/ directory
   - Update import paths and dependencies

### Phase 2: Tooling Integration (Week 2)
1. **Build Configuration**
   - Configure build targets for all projects
   - Set up dependency tracking
   - Implement incremental builds

2. **Testing Setup**
   - Configure test targets
   - Set up code coverage reporting
   - Implement parallel testing

### Phase 3: CI/CD Integration (Week 3)
1. **GitHub Actions**
   - Set up affected project detection
   - Configure parallel builds and tests
   - Implement deployment pipelines

2. **Development Workflows**
   - Create development scripts
   - Set up local development environment
   - Document common workflows

### Phase 4: Advanced Features (Week 4)
1. **Code Generation**
   - Create Nx generators for new services
   - Set up project templates
   - Implement scaffolding tools

2. **Optimization**
   - Set up build caching
   - Optimize CI/CD performance
   - Fine-tune dependency graph

## Success Metrics

### Development Efficiency
- **Build Time**: 50% reduction in total build time
- **Test Time**: 60% reduction in test execution time
- **Developer Productivity**: Faster feature development cycles

### Code Quality
- **Code Sharing**: 80% of common utilities in shared libraries
- **Consistency**: Unified tooling across all projects
- **Maintainability**: Easier refactoring across service boundaries

### CI/CD Performance
- **Pipeline Time**: Faster CI/CD pipelines with affected builds
- **Resource Usage**: Reduced CI/CD resource consumption
- **Deployment Frequency**: More frequent deployments

## References

- [Nx Documentation](https://nx.dev/)
- [Monorepo Best Practices](https://monorepo.tools/)
- [Go Workspaces](https://go.dev/doc/tutorial/workspaces)
- [Nx with Go](https://blog.nrwl.io/nx-and-go-b8b4b7b8b8b8)

---

**Decision Made By**: Architecture Team  
**Date**: June 7, 2025  
**Next Review**: September 7, 2025
