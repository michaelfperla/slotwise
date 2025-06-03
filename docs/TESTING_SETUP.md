# Testing Setup Guide

This document explains how to set up and run tests for the SlotWise project.

## Prerequisites

### PostgreSQL Setup

All tests use PostgreSQL databases. You need PostgreSQL running locally with:

- **Host**: `localhost`
- **Port**: `5432`
- **Username**: `postgres`
- **Password**: `postgres`

#### Installing PostgreSQL

**macOS (using Homebrew):**

```bash
brew install postgresql@15
brew services start postgresql@15
createuser -s postgres
psql -U postgres -c "ALTER USER postgres PASSWORD 'postgres';"
```

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

**Windows:**

1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install with default settings
3. Set password to `postgres` during installation

### Docker Alternative

If you prefer using Docker:

```bash
docker run --name postgres-test \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15
```

## Test Database Setup

### Automatic Setup

The easiest way to set up test databases:

```bash
npm run test:setup
```

This will:

1. Connect to PostgreSQL
2. Create all required test databases
3. Verify the setup is working

### Manual Setup

If you need to create databases manually:

```sql
-- Connect to PostgreSQL as postgres user
psql -U postgres -h localhost

-- Create test databases
CREATE DATABASE slotwise_business_test;
CREATE DATABASE slotwise_notification_test;
CREATE DATABASE slotwise_auth_test;
CREATE DATABASE slotwise_scheduling_test;
```

## Running Tests

### All Tests

```bash
npm run test
```

This automatically:

1. Sets up test databases
2. Runs all service tests
3. Cleans up test data

### Individual Service Tests

```bash
# Business service tests
npx nx run @slotwise/business-service:test

# Notification service tests
npx nx run @slotwise/notification-service:test
```

### Affected Tests Only

```bash
npm run test:affected
```

### CI Tests

```bash
npm run ci:test:unit
```

## Test Environment Configuration

Each service has its own test environment configuration:

### Business Service

- **Database**: `slotwise_business_test`
- **Config**: `services/business-service/.env.test`

### Notification Service

- **Database**: `slotwise_notification_test`
- **Config**: `services/notification-service/.env.test`

## Test Database Management

### Schema Migrations

Test databases are automatically set up with the latest schema:

1. **Prisma migrations** are applied first
2. If migrations fail, **schema push** is attempted
3. Test data is cleaned between test runs

### Data Cleanup

- Test data is automatically cleaned after each test suite
- Tables are truncated with `RESTART IDENTITY CASCADE`
- No manual cleanup required

## Troubleshooting

### Common Issues

**"Database does not exist" error:**

```bash
npm run test:setup
```

**"Connection refused" error:**

- Ensure PostgreSQL is running on port 5432
- Check username/password: `postgres/postgres`

**"Permission denied" error:**

- Ensure postgres user has CREATE DATABASE privileges
- Run: `psql -U postgres -c "ALTER USER postgres CREATEDB;"`

**Tests timeout:**

- Check if PostgreSQL is responding
- Increase test timeout in Jest config if needed

### Debugging Tests

Enable verbose logging:

```bash
# Set environment variable
export LOG_LEVEL=debug

# Run tests with verbose output
npx nx run @slotwise/business-service:test --verbose
```

### Reset Test Environment

If tests are consistently failing:

```bash
# Drop and recreate all test databases
psql -U postgres -c "DROP DATABASE IF EXISTS slotwise_business_test;"
psql -U postgres -c "DROP DATABASE IF EXISTS slotwise_notification_test;"
npm run test:setup
```

## CI/CD Integration

### GitHub Actions

The CI pipeline automatically:

1. Starts PostgreSQL service
2. Sets up test databases
3. Runs all tests
4. Reports coverage

### Local CI Simulation

```bash
npm run ci:validate
```

This runs the same checks as CI:

- TypeScript compilation
- Linting
- Building
- Testing

## Best Practices

### Writing Tests

1. **Use test databases**: Never test against development/production data
2. **Clean state**: Each test should start with a clean database state
3. **Mock external services**: NATS, Redis, SendGrid are mocked in tests
4. **Isolation**: Tests should not depend on each other

### Test Data

1. **Use factories**: Create test data using factory functions
2. **Minimal data**: Only create the data needed for the test
3. **Cleanup**: Rely on automatic cleanup between tests

### Performance

1. **Parallel execution**: Tests run in parallel by default
2. **Database pooling**: Prisma handles connection pooling
3. **Selective testing**: Use `test:affected` for faster feedback

## Environment Variables

Test environment variables are set in:

- `services/*/jest.env.js` - Jest environment setup
- `services/*/.env.test` - Service-specific test config

Key variables:

- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV=test`: Enables test mode
- `LOG_LEVEL=error`: Reduces log noise during tests
