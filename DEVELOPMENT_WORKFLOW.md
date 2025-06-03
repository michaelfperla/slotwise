# SlotWise Development Workflow Standards

## 🎯 **Overview**

This document establishes comprehensive development workflow standards for the
SlotWise platform to ensure consistent, high-quality development practices
across the team.

## 📋 **Table of Contents**

- [Git Workflow Standards](#git-workflow-standards)
- [Branch Management](#branch-management)
- [Commit Standards](#commit-standards)
- [Pull Request Process](#pull-request-process)
- [Code Review Guidelines](#code-review-guidelines)
- [Testing Requirements](#testing-requirements)
- [Local Development Setup](#local-development-setup)
- [CI/CD Pipeline](#cicd-pipeline)

## 🌿 **Git Workflow Standards**

### **Branch Strategy**

We use a **Feature Branch Workflow** with the following structure:

```
main                    # Production-ready code
├── develop            # Integration branch (optional for larger teams)
├── feature/           # New features
├── fix/               # Bug fixes
├── hotfix/            # Critical production fixes
├── refactor/          # Code refactoring
└── docs/              # Documentation updates
```

### **Branch Naming Convention**

```bash
# Feature branches
feature/user-authentication
feature/booking-calendar
feature/payment-integration

# Bug fix branches
fix/service-creation-validation
fix/availability-timezone-bug
fix/failing-tests

# Hotfix branches (critical production issues)
hotfix/security-vulnerability
hotfix/payment-gateway-down

# Refactoring branches
refactor/business-service-architecture
refactor/database-schema-optimization

# Documentation branches
docs/api-documentation
docs/deployment-guide
```

## 📝 **Commit Standards**

### **Commit Message Format**

We follow the **Conventional Commits** specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### **Commit Types**

```bash
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation changes
style:    # Code style changes (formatting, semicolons, etc.)
refactor: # Code refactoring without feature changes
test:     # Adding or updating tests
chore:    # Maintenance tasks, dependency updates
perf:     # Performance improvements
ci:       # CI/CD configuration changes
build:    # Build system or external dependency changes
```

### **Commit Message Examples**

```bash
# Feature commits
feat(auth): add JWT token refresh mechanism
feat(booking): implement recurring appointment scheduling
feat: add email notification service

# Bug fix commits
fix(business): resolve service creation foreign key constraint
fix(api): handle null values in availability response
fix: correct timezone handling in booking service

# Documentation commits
docs: add API documentation for business service
docs(readme): update local development setup instructions

# Refactoring commits
refactor(database): optimize business query performance
refactor: extract common validation logic to shared utils

# Test commits
test(business): add integration tests for service creation
test: increase coverage for availability service

# Chore commits
chore: update dependencies to latest versions
chore(deps): bump @types/node from 18.0.0 to 18.1.0
```

### **Commit Best Practices**

1. **Keep commits atomic**: One logical change per commit
2. **Write descriptive messages**: Explain what and why, not how
3. **Use imperative mood**: "Add feature" not "Added feature"
4. **Limit subject line to 50 characters**
5. **Wrap body at 72 characters**
6. **Reference issues**: Include issue numbers when applicable

```bash
# Good commit message
feat(booking): add cancellation with refund calculation

Implement booking cancellation feature that calculates
refunds based on business cancellation policy and
time remaining before appointment.

- Add cancellation policy validation
- Implement refund calculation logic
- Send cancellation notifications via NATS
- Update booking status to CANCELLED

Closes #123
```

## 🔄 **Pull Request Process**

### **PR Title Format**

Follow the same format as commit messages:

```
feat(auth): implement OAuth2 integration
fix(business): resolve service creation validation
docs: update API documentation
```

### **PR Description Template**

```markdown
## 📋 **Description**

Brief description of changes and motivation.

## 🎯 **Type of Change**

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to
      not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## 🧪 **Testing**

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] New tests added for new functionality

## 📝 **Checklist**

- [ ] Code follows project coding standards
- [ ] Self-review completed
- [ ] Code is properly commented
- [ ] Documentation updated (if applicable)
- [ ] No console.log statements in production code
- [ ] Database migrations tested (if applicable)

## 🔗 **Related Issues**

Closes #123 Related to #456

## 📸 **Screenshots** (if applicable)

Add screenshots for UI changes.

## 🚀 **Deployment Notes**

Any special deployment considerations.
```

### **PR Requirements**

1. **All CI checks must pass**
2. **At least one approval required**
3. **No merge conflicts**
4. **Branch is up to date with target branch**
5. **All conversations resolved**

## 👥 **Code Review Guidelines**

### **Review Checklist**

**Functionality**

- [ ] Code works as intended
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] Performance considerations addressed

**Code Quality**

- [ ] Code follows project standards
- [ ] Functions are focused and single-purpose
- [ ] Variable names are descriptive
- [ ] No code duplication
- [ ] Proper error handling

**Security**

- [ ] No sensitive data exposed
- [ ] Input validation implemented
- [ ] Authentication/authorization checked
- [ ] SQL injection prevention

**Testing**

- [ ] Adequate test coverage
- [ ] Tests are meaningful
- [ ] Integration tests included
- [ ] Edge cases tested

**Documentation**

- [ ] Code is self-documenting
- [ ] Complex logic is commented
- [ ] API documentation updated
- [ ] README updated if needed

### **Review Response Guidelines**

**For Reviewers:**

- Be constructive and specific
- Explain the "why" behind suggestions
- Distinguish between "must fix" and "nice to have"
- Acknowledge good practices

**For Authors:**

- Respond to all feedback
- Ask for clarification when needed
- Make requested changes promptly
- Thank reviewers for their time

## 🧪 **Testing Requirements**

### **Test Coverage Thresholds**

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
```

### **Required Tests**

1. **Unit Tests**: All service methods and utility functions
2. **Integration Tests**: API endpoints and database operations
3. **NATS Event Tests**: Event publishing and subscription
4. **End-to-End Tests**: Critical user journeys (MVP booking flow)

### **Test Naming Convention**

```typescript
describe('BusinessService', () => {
  describe('createBusiness', () => {
    it('should create business with valid data', async () => {});
    it('should throw error when subdomain already exists', async () => {});
    it('should publish business.created event', async () => {});
  });
});
```

## 💻 **Local Development Setup**

### **Prerequisites**

```bash
# Required software
Node.js >= 18.0.0
npm >= 8.0.0
Docker >= 20.0.0
Docker Compose >= 2.0.0
PostgreSQL >= 14.0
Go >= 1.19 (for Go services)
```

### **Initial Setup**

```bash
# 1. Clone repository
git clone https://github.com/michaelfperla/slotwise.git
cd slotwise

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env
# Edit .env with your local configuration

# 4. Start infrastructure services
docker-compose up -d postgres nats

# 5. Setup database
npx nx run @slotwise/business-service:db:migrate
npx nx run @slotwise/business-service:db:seed

# 6. Run tests to verify setup
npm test

# 7. Start development servers
npm run dev
```

### **Development Commands**

```bash
# Run all services
npm run dev

# Run specific service
npx nx serve @slotwise/business-service
npx nx serve @slotwise/frontend

# Run tests
npm test                                    # All tests
npx nx test @slotwise/business-service     # Specific service
npm run test:watch                         # Watch mode

# Database operations
npx nx run @slotwise/business-service:db:migrate
npx nx run @slotwise/business-service:db:reset
npx nx run @slotwise/business-service:db:studio

# Linting and formatting
npm run lint                               # Check all
npm run lint:fix                          # Fix auto-fixable issues
npm run format                            # Format code
```

## 🚀 **CI/CD Pipeline**

### **GitHub Actions Workflow**

Our CI/CD pipeline includes:

1. **Code Quality Checks**

   - ESLint for TypeScript/JavaScript
   - Prettier for code formatting
   - Go fmt and vet for Go code

2. **Testing**

   - Unit tests for all services
   - Integration tests
   - Test coverage reporting

3. **Security**

   - Dependency vulnerability scanning
   - Code security analysis

4. **Build**
   - Docker image building
   - Nx build optimization

### **Branch Protection Rules**

```yaml
# main branch protection
required_status_checks:
  - ci/lint
  - ci/test
  - ci/build
  - ci/security-scan
required_reviews: 1
dismiss_stale_reviews: true
require_code_owner_reviews: true
restrict_pushes: true
```

### **Pre-commit Hooks**

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write", "git add"],
    "*.{md,json,yml,yaml}": ["prettier --write", "git add"]
  }
}
```
