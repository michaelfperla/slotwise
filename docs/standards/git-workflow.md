# Git Workflow Standards

## 🎯 Overview

This document defines the Git workflow standards for SlotWise development, ensuring consistent collaboration, code quality, and release management across all team members and repositories.

## 🌳 Branching Strategy

### 1. GitFlow Model
We use a modified GitFlow model optimized for continuous deployment:

```
main (production)
├── develop (integration)
│   ├── feature/auth-jwt-implementation
│   ├── feature/booking-confirmation-flow
│   └── feature/payment-integration
├── release/v1.2.0
├── hotfix/critical-security-patch
└── fix/failing-tests
```

### 2. Branch Types and Naming

#### **Main Branches**
- `main` - Production-ready code, always deployable
- `develop` - Integration branch for features

#### **Supporting Branches**
```bash
# Feature branches
feature/auth-jwt-implementation
feature/booking-confirmation-flow
feature/payment-stripe-integration

# Release branches
release/v1.2.0
release/v2.0.0-beta

# Hotfix branches
hotfix/security-vulnerability-fix
hotfix/critical-booking-bug

# Fix branches (for non-critical issues)
fix/failing-tests
fix/linting-errors
fix/documentation-updates

# Chore branches (maintenance tasks)
chore/dependency-updates
chore/ci-pipeline-improvements
chore/documentation-restructure
```

### 3. Branch Naming Conventions
```bash
# Pattern: {type}/{description-in-kebab-case}

# ✅ Good examples
feature/user-authentication
feature/booking-calendar-view
fix/database-connection-timeout
hotfix/payment-processing-error
chore/update-dependencies
docs/api-documentation-update

# ❌ Bad examples
feature/UserAuth
fix/bug
hotfix/fix
my-feature-branch
```

## 🔄 Workflow Process

### 1. Feature Development Workflow
```bash
# 1. Start from develop branch
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/user-authentication

# 3. Work on feature with regular commits
git add .
git commit -m "feat(auth): implement JWT token generation"

# 4. Push branch regularly
git push origin feature/user-authentication

# 5. Create Pull Request when ready
# 6. After review and approval, merge to develop
# 7. Delete feature branch
git branch -d feature/user-authentication
git push origin --delete feature/user-authentication
```

### 2. Release Workflow
```bash
# 1. Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# 2. Update version numbers and changelog
# 3. Test and fix any issues
git commit -m "chore(release): prepare v1.2.0"

# 4. Merge to main and tag
git checkout main
git merge release/v1.2.0
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin main --tags

# 5. Merge back to develop
git checkout develop
git merge release/v1.2.0

# 6. Delete release branch
git branch -d release/v1.2.0
git push origin --delete release/v1.2.0
```

### 3. Hotfix Workflow
```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-patch

# 2. Fix the issue
git commit -m "fix(security): patch authentication vulnerability"

# 3. Merge to main and tag
git checkout main
git merge hotfix/critical-security-patch
git tag -a v1.2.1 -m "Hotfix version 1.2.1"
git push origin main --tags

# 4. Merge to develop
git checkout develop
git merge hotfix/critical-security-patch

# 5. Delete hotfix branch
git branch -d hotfix/critical-security-patch
```

## 📝 Commit Message Standards

### 1. Conventional Commits Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 2. Commit Types
```bash
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation changes
style:    # Code style changes (formatting, etc.)
refactor: # Code refactoring
perf:     # Performance improvements
test:     # Adding or updating tests
chore:    # Maintenance tasks
ci:       # CI/CD changes
build:    # Build system changes
revert:   # Reverting previous commits
```

### 3. Commit Message Examples
```bash
# ✅ Good commit messages
feat(auth): implement JWT token refresh mechanism
fix(booking): resolve double-booking validation issue
docs(api): update authentication endpoint documentation
test(user): add unit tests for user registration flow
chore(deps): update Go dependencies to latest versions
ci(github): add automated security scanning workflow

# ❌ Bad commit messages
fix bug
update code
changes
WIP
asdf
Fixed it
```

### 4. Detailed Commit Message Example
```
feat(booking): implement recurring appointment scheduling

Add support for creating recurring appointments with flexible patterns:
- Daily, weekly, monthly, and yearly recurrence
- Custom end dates and occurrence limits
- Conflict detection for recurring slots
- Bulk cancellation and modification

Closes #123
Resolves #456

BREAKING CHANGE: The booking API now requires a 'recurrence' field for 
recurring appointments. Existing single appointments are not affected.
```

## 🔍 Code Review Process

### 1. Pull Request Requirements
```markdown
## Pull Request Template

### Description
Brief description of changes and motivation.

### Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] New tests added for new functionality

### Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Code is commented where necessary
- [ ] Documentation updated
- [ ] No merge conflicts
```

### 2. Review Guidelines
```bash
# Reviewer responsibilities:
✅ Check code quality and standards compliance
✅ Verify tests are adequate and passing
✅ Ensure documentation is updated
✅ Look for security vulnerabilities
✅ Validate business logic correctness
✅ Check for performance implications
✅ Verify error handling is appropriate

# Review approval requirements:
- At least 1 approval for feature branches
- At least 2 approvals for release branches
- Architecture team approval for breaking changes
- Security team approval for security-related changes
```

### 3. Review Comments Standards
```bash
# ✅ Constructive review comments
"Consider extracting this logic into a separate function for better testability"
"This could cause a race condition. Consider using a mutex here"
"The error message could be more descriptive for better debugging"
"Great implementation! This handles the edge case well"

# ❌ Unconstructive comments
"This is wrong"
"Fix this"
"Bad code"
"I don't like this"
```

## 🏷️ Tagging and Versioning

### 1. Semantic Versioning
```
MAJOR.MINOR.PATCH

Examples:
v1.0.0    # Initial release
v1.1.0    # New features, backward compatible
v1.1.1    # Bug fixes, backward compatible
v2.0.0    # Breaking changes
```

### 2. Tag Naming Convention
```bash
# Release tags
v1.2.0
v1.2.1
v2.0.0-beta.1
v2.0.0-rc.1

# Pre-release tags
v1.3.0-alpha.1
v1.3.0-beta.2
v1.3.0-rc.1
```

### 3. Tagging Commands
```bash
# Create annotated tag
git tag -a v1.2.0 -m "Release version 1.2.0"

# Push tags to remote
git push origin --tags

# List tags
git tag -l

# Delete tag locally and remotely
git tag -d v1.2.0
git push origin --delete v1.2.0
```

## 🔒 Branch Protection Rules

### 1. Main Branch Protection
```yaml
# GitHub branch protection settings for main
protection_rules:
  required_status_checks:
    strict: true
    contexts:
      - "ci/tests"
      - "ci/lint"
      - "ci/security-scan"
  
  required_pull_request_reviews:
    required_approving_review_count: 2
    dismiss_stale_reviews: true
    require_code_owner_reviews: true
    
  restrictions:
    users: []
    teams: ["architecture-team"]
    
  enforce_admins: true
  allow_force_pushes: false
  allow_deletions: false
```

### 2. Develop Branch Protection
```yaml
# GitHub branch protection settings for develop
protection_rules:
  required_status_checks:
    strict: true
    contexts:
      - "ci/tests"
      - "ci/lint"
  
  required_pull_request_reviews:
    required_approving_review_count: 1
    dismiss_stale_reviews: true
    
  enforce_admins: false
  allow_force_pushes: false
  allow_deletions: false
```

## 🔧 Git Configuration

### 1. Global Git Configuration
```bash
# User configuration
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"

# Editor configuration
git config --global core.editor "code --wait"

# Default branch
git config --global init.defaultBranch main

# Line ending configuration
git config --global core.autocrlf input  # Linux/Mac
git config --global core.autocrlf true   # Windows

# Merge configuration
git config --global merge.ff false
git config --global pull.rebase true

# Alias configuration
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'
```

### 2. Repository-specific Configuration
```bash
# .gitconfig in repository root
[core]
    autocrlf = input
    filemode = false
    
[merge]
    ff = false
    
[pull]
    rebase = true
    
[branch]
    autosetupmerge = always
    autosetuprebase = always
```

## 🚫 .gitignore Standards

### 1. Global .gitignore
```gitignore
# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# Logs
*.log
logs/

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Dependency directories
node_modules/
vendor/

# Environment variables
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
*.exe
*.dll
*.so
*.dylib

# Test coverage
coverage/
*.cover
*.py,cover
.coverage
.coverage.*

# Temporary files
tmp/
temp/
*.tmp
*.temp
```

### 2. Service-specific .gitignore
```gitignore
# Go specific
*.exe
*.exe~
*.dll
*.so
*.dylib
*.test
*.out
go.work

# Node.js specific
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Docker
.dockerignore

# Local configuration
config/local.yaml
```

## 🔄 Git Hooks

### 1. Pre-commit Hook
```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run linting
echo "Running linters..."
npm run lint
if [ $? -ne 0 ]; then
    echo "Linting failed. Please fix errors before committing."
    exit 1
fi

# Run tests
echo "Running tests..."
npm run test
if [ $? -ne 0 ]; then
    echo "Tests failed. Please fix tests before committing."
    exit 1
fi

# Check commit message format
echo "Checking commit message format..."
commit_regex='^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?: .{1,50}'
commit_message=$(cat .git/COMMIT_EDITMSG)

if ! echo "$commit_message" | grep -qE "$commit_regex"; then
    echo "Invalid commit message format. Please use conventional commits format."
    echo "Example: feat(auth): implement JWT token generation"
    exit 1
fi

echo "Pre-commit checks passed!"
```

### 2. Pre-push Hook
```bash
#!/bin/sh
# .git/hooks/pre-push

protected_branch='main'
current_branch=$(git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\1,')

if [ $protected_branch = $current_branch ]; then
    echo "Direct push to main branch is not allowed."
    echo "Please create a pull request instead."
    exit 1
fi

echo "Pre-push checks passed!"
```

## 📊 Git Workflow Metrics

### 1. Tracking Metrics
```bash
# Commit frequency
git log --oneline --since="1 month ago" | wc -l

# Contributors
git shortlog -sn --since="1 month ago"

# Branch lifecycle
git for-each-ref --format='%(refname:short) %(committerdate)' refs/heads | sort -k2

# Code churn
git log --stat --since="1 month ago" | grep "files changed" | awk '{files+=$1; inserted+=$4; deleted+=$6} END {print "Files changed:", files, "Lines inserted:", inserted, "Lines deleted:", deleted}'
```

### 2. Quality Metrics
- Average time from PR creation to merge
- Number of review iterations per PR
- Percentage of PRs requiring rework
- Hotfix frequency and time to resolution

## 📋 Git Workflow Checklist

### Before Starting Work
- [ ] Pull latest changes from develop
- [ ] Create appropriately named feature branch
- [ ] Verify branch protection rules are in place

### During Development
- [ ] Make small, focused commits
- [ ] Use conventional commit message format
- [ ] Push branch regularly for backup
- [ ] Rebase on develop if needed

### Before Creating PR
- [ ] Run all tests locally
- [ ] Run linting and formatting
- [ ] Update documentation if needed
- [ ] Write descriptive PR description
- [ ] Self-review the changes

### After PR Approval
- [ ] Squash commits if needed
- [ ] Merge using appropriate strategy
- [ ] Delete feature branch
- [ ] Verify deployment if applicable

## 📚 Git Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitFlow Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
- [Git Best Practices](https://sethrobertson.github.io/GitBestPractices/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Semantic Versioning](https://semver.org/)
