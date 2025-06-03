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
- [API Documentation](#-api-documentation)
- [Development](#-development)
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

## Quick Start

### Prerequisites

- Node.js 18+
- Go 1.21+
- Docker & Docker Compose
- Kubernetes (minikube for local development)
- NATS Server (for local development)

### Automated Setup

```bash
# Run the automated setup script
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh
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

## Development Guidelines

- API-first design with OpenAPI specifications
- Comprehensive testing (unit, integration, e2e)
- Event-driven architecture with NATS
- Type-safe development across all services
- Security by design principles

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

Each service provides OpenAPI/Swagger documentation:

- **Business Service**: http://localhost:8003/docs
- **Auth Service**: http://localhost:8001/docs (when implemented)
- **Scheduling Service**: http://localhost:8002/docs (when implemented)
- **Notification Service**: http://localhost:8004/docs (when implemented)

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

- 📖 [Development Guide](docs/development-guide.md)
- 🚀 [API Documentation](docs/api-documentation.md)
- 🏗️ [Architecture Guide](docs/event-driven-architecture.md)
- 🐛 [Troubleshooting](docs/troubleshooting.md)

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
