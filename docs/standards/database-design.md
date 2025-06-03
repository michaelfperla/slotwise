# Database Design Standards

## 🎯 Overview

This document defines the database design standards for SlotWise microservices to ensure consistency, performance, and maintainability across all services.

## 📋 Core Principles

### 1. UUID Strategy
- **Primary Keys**: Always use UUID v4 for primary keys
- **Foreign Keys**: Use UUID strings for references
- **Generation**: Let database generate UUIDs with `DEFAULT gen_random_uuid()`
- **Go Models**: Use `string` type for UUID fields

```sql
-- ✅ Correct
CREATE TABLE users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- ❌ Incorrect
CREATE TABLE users (
    id SERIAL PRIMARY KEY,  -- Don't use auto-incrementing integers
    email varchar(255)      -- Don't use varchar for emails
);
```

### 2. Naming Conventions
- **Tables**: `snake_case`, plural nouns (`users`, `booking_slots`)
- **Columns**: `snake_case` (`first_name`, `created_at`)
- **Indexes**: `idx_table_column` (`idx_users_email`)
- **Foreign Keys**: `fk_table_referenced_table` (`fk_bookings_users`)
- **Go Structs**: `PascalCase` (`User`, `BookingSlot`)
- **Go Fields**: `PascalCase` with proper JSON tags

```go
// ✅ Correct Go Model
type User struct {
    ID        string    `gorm:"type:uuid;primary_key;" json:"id"`
    Email     string    `gorm:"type:text;not null;unique" json:"email"`
    FirstName string    `gorm:"type:text;not null" json:"firstName"`
    CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"createdAt"`
}
```

### 3. Foreign Key Management
- **Avoid Circular Dependencies**: Never create circular foreign key relationships
- **Use Junction Tables**: For many-to-many relationships
- **Nullable References**: Use pointers for optional relationships
- **Cascade Rules**: Define explicit CASCADE/RESTRICT behavior

```go
// ✅ Correct - No circular dependency
type User struct {
    ID         string     `gorm:"type:uuid;primary_key;" json:"id"`
    BusinessID *string    `gorm:"type:uuid;index" json:"businessId,omitempty"`
}

type Business struct {
    ID      string `gorm:"type:uuid;primary_key;" json:"id"`
    OwnerID string `gorm:"type:uuid;not null;index" json:"ownerId"`
}

// ✅ Junction table for many-to-many
type UserRole struct {
    UserID string `gorm:"type:uuid;not null;index" json:"userId"`
    RoleID string `gorm:"type:uuid;not null;index" json:"roleId"`
}
```

## 🗄️ Schema Standards

### 1. Required Fields
Every table must have:
- `id` (UUID primary key)
- `created_at` (timestamptz with default)
- `updated_at` (timestamptz with default, updated on change)

### 2. Soft Deletes
Use soft deletes for business entities:
```sql
deleted_at timestamptz NULL
```

### 3. Audit Fields
For sensitive data, include:
```sql
created_by uuid REFERENCES users(id),
updated_by uuid REFERENCES users(id),
version integer DEFAULT 1
```

### 4. Data Types
- **Text**: Use `text` instead of `varchar` unless length constraint needed
- **Timestamps**: Always use `timestamptz` (timezone-aware)
- **Money**: Use `decimal(10,2)` for currency amounts
- **Enums**: Use `varchar(50)` with check constraints
- **JSON**: Use `jsonb` for structured data

```sql
-- ✅ Correct data types
CREATE TABLE bookings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    amount decimal(10,2) NOT NULL,
    currency varchar(3) NOT NULL DEFAULT 'USD',
    status varchar(50) NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    metadata jsonb,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamptz
);
```

## 🔄 Migration Standards

### 1. Migration Files
- **Naming**: `YYYYMMDD_HHMMSS_description.sql`
- **Reversible**: Always include DOWN migration
- **Atomic**: Each migration should be a single logical change
- **Safe**: Never destructive operations in production

### 2. Migration Process
```sql
-- ✅ Safe migration pattern
BEGIN;

-- Add new column with default
ALTER TABLE users ADD COLUMN phone_number text;

-- Backfill data if needed
UPDATE users SET phone_number = '' WHERE phone_number IS NULL;

-- Add constraints after data is clean
ALTER TABLE users ALTER COLUMN phone_number SET NOT NULL;

COMMIT;
```

### 3. GORM AutoMigrate
- **Development Only**: Use AutoMigrate for local development
- **Production**: Always use explicit migration files
- **Testing**: Use manual table creation to avoid circular dependencies

```go
// ✅ Test database setup
func setupTestDB() *gorm.DB {
    // Create tables manually to avoid circular FK issues
    db.Exec(`CREATE TABLE IF NOT EXISTS users (...)`)
    db.Exec(`CREATE TABLE IF NOT EXISTS businesses (...)`)
    return db
}
```

## 📊 Performance Standards

### 1. Indexing Strategy
- **Primary Keys**: Automatically indexed
- **Foreign Keys**: Always index foreign key columns
- **Query Patterns**: Index columns used in WHERE, ORDER BY, JOIN
- **Composite Indexes**: For multi-column queries

```sql
-- ✅ Essential indexes
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status_created ON bookings(status, created_at);
CREATE INDEX idx_users_email ON users(email);
```

### 2. Query Optimization
- **Avoid N+1**: Use GORM Preload for relationships
- **Pagination**: Always use LIMIT/OFFSET for large datasets
- **Projections**: Select only needed columns

```go
// ✅ Optimized queries
var users []User
db.Select("id, email, first_name").
   Where("status = ?", "active").
   Limit(50).
   Offset(page * 50).
   Find(&users)
```

## 🔒 Security Standards

### 1. Data Protection
- **Sensitive Data**: Encrypt PII at application level
- **Passwords**: Always hash with bcrypt/argon2
- **API Keys**: Store hashed, never plaintext
- **Audit Logs**: Log all data access and modifications

### 2. Access Control
- **Row-Level Security**: Use RLS for multi-tenant data
- **Database Users**: Separate users for different services
- **Connection Limits**: Set appropriate connection pool limits

## 🧪 Testing Standards

### 1. Test Database Setup
```go
// ✅ Test database pattern
func setupTestDB(t *testing.T) *gorm.DB {
    dsn := "host=localhost user=postgres password=postgres dbname=slotwise_test port=5432 sslmode=disable"
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    require.NoError(t, err)
    
    // Create tables manually to avoid circular dependencies
    createTestTables(db)
    
    return db
}

func cleanupTestDB(db *gorm.DB) {
    db.Exec("TRUNCATE TABLE bookings, users, businesses CASCADE")
}
```

### 2. Test Data Factories
```go
// ✅ Use factories, not hardcoded data
func UserFactory(overrides ...func(*User)) *User {
    user := &User{
        Email:     fmt.Sprintf("test-%s@example.com", uuid.New().String()[:8]),
        FirstName: "Test",
        LastName:  "User",
        Status:    StatusActive,
    }
    for _, override := range overrides {
        override(user)
    }
    return user
}
```

## 📚 Examples

See `examples/database/` for complete examples of:
- Service-specific schema designs
- Migration scripts
- Test setup patterns
- Performance optimization examples

## 🔧 Tools and Validation

- **Schema Validation**: Use `dbmate` or similar for migrations
- **Performance Monitoring**: Enable query logging in development
- **Code Generation**: Consider using `sqlc` for type-safe queries
- **Documentation**: Auto-generate schema docs from migrations
