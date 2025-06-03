# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project setup and architecture
- Comprehensive documentation and development guides
- GitHub repository preparation with CI/CD workflows

### Changed

- Updated Twilio dependency from v4.23.0 to v5.7.0 for enhanced security and
  features
- Updated bcryptjs dependency from v2.4.3 to v3.0.2 for improved authentication
  security
- Standardized date-fns dependency to v4.1.0 across all services for consistent
  timezone handling
- Updated date-fns-tz dependency to v3.2.0 for improved timezone support

### Fixed

- Removed duplicate ioredis dependency entry in notification service
- Corrected CHANGELOG.md dates from 2024 to 2025
- Updated date-fns-tz function calls for v3 compatibility (zonedTimeToUtc →
  fromZonedTime, utcToZonedTime → toZonedTime)
- Fixed shared/utils exports to only include existing modules

## [1.0.0-alpha] - 2025-01-01

### Added

- **Core Architecture**: Event-driven microservices architecture with NATS.io
- **Auth Service**: JWT-based authentication with refresh tokens (Go)
- **Business Service**: Multi-tenant business and service management
  (TypeScript/Node.js)
- **Scheduling Service**: Booking management with availability calculation (Go)
- **Notification Service**: Multi-channel notifications foundation
  (TypeScript/Node.js)
- **Frontend**: Next.js 14 application with TypeScript and Tailwind CSS
- **Infrastructure**: Docker containers and development environment setup
- **Database**: PostgreSQL with Prisma (Node.js) and GORM (Go)
- **Caching**: Redis for session storage and performance optimization
- **Documentation**: Comprehensive development guides, standards, and API
  documentation

### Features

- **Multi-tenant Architecture**: Foundation for multiple businesses with
  subdomain support
- **Booking Management**: Core booking logic with availability calculation
- **Event-driven Communication**: Asynchronous service communication via NATS
- **Type Safety**: Full TypeScript coverage across frontend and Node.js services
- **Security**: JWT authentication, input validation, and security headers
- **Monitoring**: Health checks and structured logging
- **Testing**: Unit and integration testing frameworks
- **Development Environment**: Automated setup with Docker and hot reload

### Technical Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Go (Auth/Scheduling), Node.js (Business/Notification), TypeScript
- **Database**: PostgreSQL with Prisma ORM and GORM
- **Message Broker**: NATS.io for event-driven communication
- **Cache**: Redis for session storage and caching
- **Containerization**: Docker and Docker Compose
- **External Services**: Foundation for email and SMS notifications

### Development Experience

- **Automated Setup**: One-command development environment setup
- **Hot Reload**: Live reloading for all services during development
- **Code Quality**: ESLint, Prettier, and Go formatting tools
- **Testing**: Unit and integration test frameworks
- **Documentation**: Comprehensive development guides and standards
- **Debugging**: Structured logging across all services

### Security Features

- **Authentication**: JWT with secure token management
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: Comprehensive validation with Zod schemas
- **Rate Limiting**: API endpoint protection against abuse
- **CORS**: Proper cross-origin resource sharing configuration
- **Security Headers**: HSTS, CSP, and other security headers
- **Secrets Management**: Environment-based configuration
- **SQL Injection Protection**: Parameterized queries and ORM usage

### Performance Optimizations

- **Caching Strategy**: Redis caching for frequently accessed data
- **Database Optimization**: Proper indexing and query optimization
- **Connection Pooling**: Efficient database connection management
- **Compression**: Gzip compression for API responses
- **CDN Ready**: Static asset optimization for CDN delivery
- **Horizontal Scaling**: Kubernetes-ready for multi-instance deployment

### Deployment Options

- **Development**: Docker Compose with hot reload
- **Staging**: Docker Compose with production-like configuration
- **Production**: Kubernetes with Helm charts
- **Cloud Ready**: AWS, GCP, and Azure compatible
- **Database**: Managed PostgreSQL support (RDS, Cloud SQL, etc.)
- **Monitoring**: Prometheus and Grafana integration ready

## [0.1.0] - 2025-01-01

### Added

- Initial project structure and monorepo setup
- Basic service scaffolding for all microservices
- Shared TypeScript types and utilities packages
- Docker configurations for development environment
- Basic documentation structure

---

## Release Notes

### Version 1.0.0-alpha

This is the initial alpha release of SlotWise, a high-velocity scheduling
platform designed for solopreneurs and small businesses. The platform provides a
complete solution for managing bookings, payments, and customer communications
through a modern, scalable architecture.

**Key Highlights:**

- **Production-ready architecture** with microservices and event-driven design
- **Complete booking flow** from user registration to payment confirmation
- **Multi-tenant support** with custom subdomains for businesses
- **Real-time availability** calculation with conflict detection
- **Comprehensive API** with OpenAPI documentation
- **Developer-friendly** setup with automated scripts and hot reload

**What's Next:**

- Beta release with user feedback integration
- Advanced scheduling features (recurring bookings, group bookings)
- Mobile application development
- Advanced analytics and reporting
- Third-party integrations (Google Calendar, Zoom, etc.)

**Breaking Changes:**

- None (initial release)

**Migration Guide:**

- Not applicable (initial release)

**Known Issues:**

- None reported

**Contributors:**

- SlotWise Development Team

For detailed information about features and usage, see the
[documentation](docs/).

---

## How to Contribute

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md)
for details on how to get started.

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/slotwise/issues)
- **Discussions**:
  [GitHub Discussions](https://github.com/your-org/slotwise/discussions)
- **Email**: support@slotwise.com
