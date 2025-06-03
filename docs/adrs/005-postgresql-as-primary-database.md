# ADR-005: PostgreSQL as Primary Database

## Status
**Accepted** - June 7, 2025

## Context

SlotWise microservices require a robust, scalable, and feature-rich database system to handle complex business data, relationships, and queries. We need to choose a primary database technology that will serve as the foundation for all our services.

### Current Situation
- Multiple microservices with different data requirements
- Complex relational data (users, businesses, bookings, payments)
- Need for ACID transactions and data consistency
- Requirements for advanced querying capabilities
- Need for JSON/document storage for flexible schemas
- Requirement for full-text search capabilities
- Need for time-series data (booking schedules, analytics)

### Requirements
1. **ACID Compliance**: Strong consistency for financial and booking data
2. **Scalability**: Handle growing data volume and concurrent users
3. **Performance**: Fast queries for real-time booking operations
4. **Flexibility**: Support both relational and document data
5. **Advanced Features**: Full-text search, JSON operations, time-series
6. **Ecosystem**: Rich tooling and library support
7. **Operational**: Mature backup, replication, and monitoring tools
8. **Cost**: Reasonable licensing and operational costs

## Decision

We will use **PostgreSQL** as the primary database for all SlotWise microservices.

### Implementation Strategy

#### **Database Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Cluster                       │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Auth Service  │ Business Service│  Scheduling Service     │
│   Database      │   Database      │    Database             │
│                 │                 │                         │
│ • users         │ • businesses    │ • bookings              │
│ • sessions      │ • services      │ • availability_slots    │
│ • permissions   │ • staff         │ • recurring_patterns    │
└─────────────────┴─────────────────┴─────────────────────────┘

┌─────────────────┬─────────────────┬─────────────────────────┐
│ Payment Service │Notification Svc │     Analytics DB        │
│   Database      │   Database      │                         │
│                 │                 │ • event_logs            │
│ • transactions  │ • templates     │ • metrics               │
│ • invoices      │ • delivery_logs │ • reports               │
│ • billing       │ • preferences   │ • aggregations          │
└─────────────────┴─────────────────┴─────────────────────────┘
```

#### **Database per Service Pattern**
```sql
-- Each service has its own database
CREATE DATABASE slotwise_auth;
CREATE DATABASE slotwise_business;
CREATE DATABASE slotwise_scheduling;
CREATE DATABASE slotwise_payment;
CREATE DATABASE slotwise_notification;

-- Service-specific users with minimal permissions
CREATE USER slotwise_auth_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE slotwise_auth TO slotwise_auth_user;
GRANT USAGE ON SCHEMA public TO slotwise_auth_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO slotwise_auth_user;
```

#### **Schema Design Standards**
```sql
-- Standard table structure with PostgreSQL best practices
CREATE TABLE users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    profile jsonb NOT NULL DEFAULT '{}',
    preferences jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamptz,
    
    -- Indexes for performance
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for common query patterns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- GIN index for JSONB queries
CREATE INDEX idx_users_profile ON users USING GIN (profile);
CREATE INDEX idx_users_preferences ON users USING GIN (preferences);
```

### PostgreSQL Feature Utilization

#### **1. Advanced Data Types**
```sql
-- UUID for primary keys
CREATE TABLE bookings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- JSONB for flexible metadata
    metadata jsonb NOT NULL DEFAULT '{}',
    
    -- Arrays for tags/categories
    tags text[] DEFAULT '{}',
    
    -- Date ranges for booking periods
    booking_period tstzrange NOT NULL,
    
    -- Enum types for status
    status booking_status NOT NULL DEFAULT 'pending'
);

-- Custom enum types
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE user_role AS ENUM ('client', 'business_owner', 'admin', 'support');
```

#### **2. Full-Text Search**
```sql
-- Full-text search for businesses and services
ALTER TABLE businesses ADD COLUMN search_vector tsvector;

CREATE INDEX idx_businesses_search ON businesses USING GIN (search_vector);

-- Update search vector on changes
CREATE OR REPLACE FUNCTION update_business_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.name, '') || ' ' ||
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE(NEW.address, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_business_search_vector
    BEFORE INSERT OR UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_business_search_vector();
```

#### **3. JSON Operations**
```sql
-- Query JSONB data efficiently
SELECT * FROM users 
WHERE profile->>'subscription_tier' = 'premium'
  AND preferences->'notifications'->>'email' = 'true';

-- Update JSONB fields
UPDATE users 
SET preferences = preferences || '{"theme": "dark"}'::jsonb
WHERE id = $1;

-- Index on specific JSONB paths
CREATE INDEX idx_users_subscription_tier ON users ((profile->>'subscription_tier'));
```

#### **4. Time-Series and Analytics**
```sql
-- Partitioned table for time-series data
CREATE TABLE booking_events (
    id uuid DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL,
    event_type text NOT NULL,
    event_data jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE booking_events_2025_06 PARTITION OF booking_events
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

-- Materialized views for analytics
CREATE MATERIALIZED VIEW daily_booking_stats AS
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
    AVG(amount) as average_amount
FROM bookings
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY date_trunc('day', created_at)
ORDER BY date;

-- Refresh materialized view daily
CREATE OR REPLACE FUNCTION refresh_daily_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_booking_stats;
END;
$$ LANGUAGE plpgsql;
```

### Performance Optimization

#### **1. Connection Pooling**
```go
// PgBouncer configuration for connection pooling
type DatabaseConfig struct {
    Host            string `mapstructure:"host"`
    Port            int    `mapstructure:"port"`
    User            string `mapstructure:"user"`
    Password        string `mapstructure:"password"`
    Database        string `mapstructure:"database"`
    SSLMode         string `mapstructure:"ssl_mode"`
    MaxOpenConns    int    `mapstructure:"max_open_conns"`
    MaxIdleConns    int    `mapstructure:"max_idle_conns"`
    ConnMaxLifetime time.Duration `mapstructure:"conn_max_lifetime"`
    ConnMaxIdleTime time.Duration `mapstructure:"conn_max_idle_time"`
}

func (c *DatabaseConfig) ConnectionString() string {
    return fmt.Sprintf(
        "host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
        c.Host, c.Port, c.User, c.Password, c.Database, c.SSLMode,
    )
}
```

#### **2. Query Optimization**
```sql
-- Explain analyze for query optimization
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT b.*, u.email, s.name as service_name
FROM bookings b
JOIN users u ON b.customer_id = u.id
JOIN services s ON b.service_id = s.id
WHERE b.start_time >= CURRENT_DATE
  AND b.status = 'confirmed'
ORDER BY b.start_time;

-- Composite indexes for common query patterns
CREATE INDEX idx_bookings_status_start_time ON bookings(status, start_time);
CREATE INDEX idx_bookings_customer_status ON bookings(customer_id, status);
```

#### **3. Read Replicas**
```yaml
# PostgreSQL streaming replication setup
postgresql_cluster:
  primary:
    host: postgres-primary.slotwise.internal
    port: 5432
    
  replicas:
    - host: postgres-replica-1.slotwise.internal
      port: 5432
      lag_threshold: 1MB
      
    - host: postgres-replica-2.slotwise.internal
      port: 5432
      lag_threshold: 1MB

# Application configuration for read/write splitting
database:
  write:
    host: postgres-primary.slotwise.internal
    
  read:
    hosts:
      - postgres-replica-1.slotwise.internal
      - postgres-replica-2.slotwise.internal
    load_balance: round_robin
```

## Consequences

### Positive
- ✅ **ACID Compliance**: Strong consistency for critical business data
- ✅ **Rich Feature Set**: JSON, full-text search, arrays, custom types
- ✅ **Performance**: Excellent query optimization and indexing
- ✅ **Scalability**: Proven scalability with proper architecture
- ✅ **Ecosystem**: Mature tooling, monitoring, and library support
- ✅ **Standards Compliance**: SQL standard compliance
- ✅ **Open Source**: No licensing costs, active community
- ✅ **Flexibility**: Supports both relational and document patterns
- ✅ **Reliability**: Battle-tested in production environments
- ✅ **Security**: Advanced security features and authentication

### Negative
- ❌ **Complexity**: Requires PostgreSQL expertise for optimization
- ❌ **Vertical Scaling Limits**: Eventually hits single-machine limits
- ❌ **Operational Overhead**: Requires proper backup, monitoring, tuning
- ❌ **Memory Usage**: Can be memory-intensive for large datasets
- ❌ **Write Scaling**: Limited write scalability compared to NoSQL

### Mitigation Strategies
- Implement proper monitoring and alerting
- Use connection pooling (PgBouncer) for connection management
- Set up read replicas for read scaling
- Implement proper backup and disaster recovery
- Use partitioning for large tables
- Regular performance tuning and optimization

## Alternatives Considered

### 1. MySQL
```sql
-- MySQL would require different syntax and features
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL UNIQUE,
    profile JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Rejected because:**
- Less advanced JSON support
- Limited full-text search capabilities
- Fewer advanced data types
- Less flexible indexing options

### 2. MongoDB
```javascript
// Document-based approach
db.users.insertOne({
    _id: ObjectId(),
    email: "user@example.com",
    profile: {
        firstName: "John",
        lastName: "Doe"
    },
    createdAt: new Date()
});
```

**Rejected because:**
- No ACID transactions across documents (at the time)
- Less mature tooling ecosystem
- Eventual consistency challenges
- Complex relationship modeling

### 3. Amazon RDS/Aurora
```yaml
# Managed PostgreSQL service
rds_instance:
  engine: postgres
  version: "13.7"
  instance_class: db.r5.xlarge
  multi_az: true
```

**Rejected because:**
- Vendor lock-in concerns
- Higher costs at scale
- Less control over configuration
- Potential latency issues

### 4. CockroachDB
```sql
-- Distributed SQL database
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email STRING NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Rejected because:**
- Less mature ecosystem
- Higher complexity for our current scale
- Limited advanced features compared to PostgreSQL
- Higher operational overhead

## Implementation Plan

### Phase 1: Infrastructure Setup (Week 1)
1. **PostgreSQL Cluster Setup**
   - Deploy primary PostgreSQL instance
   - Configure streaming replication
   - Set up PgBouncer for connection pooling

2. **Monitoring and Backup**
   - Configure PostgreSQL monitoring (pg_stat_statements, etc.)
   - Set up automated backups with point-in-time recovery
   - Implement log aggregation and analysis

### Phase 2: Service Databases (Weeks 2-3)
1. **Database Creation**
   - Create service-specific databases
   - Set up service-specific users and permissions
   - Implement database migration tools

2. **Schema Implementation**
   - Design and implement schemas for each service
   - Create indexes for performance
   - Set up foreign key constraints where appropriate

### Phase 3: Advanced Features (Week 4)
1. **Performance Optimization**
   - Implement query optimization
   - Set up read replicas
   - Configure caching strategies

2. **Advanced Features**
   - Implement full-text search
   - Set up time-series partitioning
   - Create materialized views for analytics

## Monitoring and Operations

### Key Metrics
- Connection pool utilization
- Query performance (slow query log)
- Replication lag
- Database size and growth
- Index usage and efficiency

### Operational Procedures
- Daily backup verification
- Weekly performance review
- Monthly capacity planning
- Quarterly disaster recovery testing

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [PostgreSQL High Availability](https://www.postgresql.org/docs/current/high-availability.html)
- [Database per Service Pattern](https://microservices.io/patterns/data/database-per-service.html)

---

**Decision Made By**: Architecture Team  
**Date**: June 7, 2025  
**Next Review**: September 7, 2025
