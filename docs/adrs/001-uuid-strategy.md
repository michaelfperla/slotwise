# ADR-001: UUID Strategy for Primary Keys

## Status

**Accepted** - June 7, 2025

## Context

SlotWise is a microservices-based booking platform where multiple services need
to create and reference entities. We need to decide on a primary key strategy
that works well across distributed services.

### Current Situation

- Multiple microservices (auth, business, scheduling, payment, notification)
- Services need to create entities independently
- Cross-service references are common (user bookings, business services, etc.)
- Need to avoid ID collisions between services
- Want to support offline/client-side ID generation for better UX

### Requirements

1. **Uniqueness**: IDs must be globally unique across all services
2. **Independence**: Services should generate IDs without coordination
3. **Performance**: ID generation should be fast and not impact performance
4. **Compatibility**: Work well with PostgreSQL and Go/TypeScript codebases
5. **Readability**: IDs should be reasonably readable for debugging
6. **Security**: IDs should not be easily guessable or sequential

## Decision

We will use **UUID version 4 (random)** as the primary key strategy for all
entities across SlotWise services.

### Implementation Details

#### Database Schema

```sql
-- All primary keys will be UUID type with default generation
CREATE TABLE users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Foreign keys will reference UUIDs
CREATE TABLE bookings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    business_id uuid NOT NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
```

#### Go Implementation

```go
type User struct {
    ID        string    `gorm:"type:uuid;primary_key;" json:"id"`
    Email     string    `gorm:"type:text;not null;unique" json:"email"`
    CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"createdAt"`
}

// BeforeCreate hook for client-side generation if needed
func (u *User) BeforeCreate(tx *gorm.DB) error {
    if u.ID == "" {
        u.ID = uuid.New().String()
    }
    return nil
}
```

#### TypeScript Implementation

```typescript
interface User {
  id: string; // UUID v4 string
  email: string;
  createdAt: Date;
}

// Client-side generation when needed
import { v4 as uuidv4 } from 'uuid';
const newUserId = uuidv4();
```

### Standards

1. **Database Generation**: Use `gen_random_uuid()` as default for new records
2. **Client Generation**: Use `uuid.New().String()` in Go or `uuidv4()` in
   TypeScript when needed
3. **String Format**: Always store and transmit UUIDs as strings (not binary)
4. **Validation**: Validate UUID format in API endpoints
5. **Indexing**: PostgreSQL handles UUID indexing efficiently

## Consequences

### Positive

- ✅ **Global Uniqueness**: No ID collisions across services
- ✅ **Service Independence**: Each service can generate IDs without
  coordination
- ✅ **Client-Side Generation**: Can generate IDs in frontend for optimistic
  updates
- ✅ **Security**: Non-sequential, non-guessable IDs
- ✅ **Distributed Systems**: Works well with event sourcing and CQRS patterns
- ✅ **Database Support**: PostgreSQL has excellent UUID support
- ✅ **Ecosystem**: Wide library support in Go and TypeScript

### Negative

- ❌ **Storage Overhead**: UUIDs are 16 bytes vs 4-8 bytes for integers
- ❌ **Index Performance**: Slightly slower than integer indexes (but negligible
  for our scale)
- ❌ **URL Length**: Longer URLs when IDs are in paths
- ❌ **Human Readability**: Less readable than sequential integers for debugging

### Mitigation Strategies

- Use database-level UUID generation to minimize performance impact
- Implement proper indexing strategies for UUID columns
- Use shortened UUIDs in URLs when needed (first 8 characters for user-facing
  IDs)
- Provide admin tools with search capabilities for debugging

## Alternatives Considered

### 1. Auto-incrementing Integers

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email text NOT NULL UNIQUE
);
```

**Rejected because:**

- ID collisions between services
- Requires coordination for global uniqueness
- Sequential IDs are security risk (enumeration attacks)
- Doesn't work well with distributed systems

### 2. Snowflake IDs

```go
// Twitter Snowflake: 64-bit integer with timestamp + machine ID + sequence
type SnowflakeID int64
```

**Rejected because:**

- Requires machine ID coordination
- More complex implementation
- Less ecosystem support
- Still has enumeration risks

### 3. ULID (Universally Unique Lexicographically Sortable Identifier)

```go
// ULID: 26 character string, sortable by time
ulid := ulid.Make().String() // 01ARZ3NDEKTSV4RRFFQ69G5FAV
```

**Rejected because:**

- Less mature ecosystem
- More complex than needed for our use case
- PostgreSQL doesn't have native ULID support
- Team familiarity with UUIDs is higher

### 4. Composite Keys

```sql
CREATE TABLE users (
    service_id varchar(20),
    local_id integer,
    PRIMARY KEY (service_id, local_id)
);
```

**Rejected because:**

- Complex foreign key relationships
- Difficult to reference across services
- Poor API ergonomics
- Complicates event schemas

## Implementation Plan

### Phase 1: New Services (Immediate)

- All new services use UUID primary keys
- Update service templates and generators
- Document standards in development guidelines

### Phase 2: Existing Services (Next Sprint)

- Audit existing services for non-UUID primary keys
- Create migration plan for any integer IDs
- Update test factories to use UUIDs

### Phase 3: Validation and Tooling (Ongoing)

- Add UUID validation to API endpoints
- Update development tools and scripts
- Create debugging tools for UUID-based systems

## Monitoring and Review

### Success Metrics

- No ID collision incidents
- Service independence maintained
- Performance benchmarks met
- Developer productivity maintained

### Review Schedule

- 3-month review: Assess performance impact and developer experience
- 6-month review: Evaluate if any adjustments needed
- Annual review: Consider new alternatives if ecosystem changes

## References

- [PostgreSQL UUID Documentation](https://www.postgresql.org/docs/current/datatype-uuid.html)
- [RFC 4122: UUID Specification](https://tools.ietf.org/html/rfc4122)
- [Go UUID Package](https://github.com/google/uuid)
- [UUID vs Auto-increment Performance](https://www.cybertec-postgresql.com/en/uuid-serial-or-identity-columns-for-postgresql-auto-generated-primary-keys/)

---

**Decision Made By**: Architecture Team **Date**: June 7, 2025 **Next Review**:
September 7, 2025
