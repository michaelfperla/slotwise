# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the SlotWise project.
ADRs document important architectural decisions made during the development of
the system.

## What are ADRs?

Architecture Decision Records (ADRs) are short text documents that capture an
important architectural decision made along with its context and consequences.
They help teams:

- **Document decisions**: Keep a record of why certain architectural choices
  were made
- **Share context**: Help new team members understand the reasoning behind
  decisions
- **Track evolution**: See how the architecture has evolved over time
- **Avoid repetition**: Prevent re-discussing already settled decisions

## ADR Format

Each ADR follows this structure:

```markdown
# ADR-XXX: Title

## Status

[Proposed | Accepted | Deprecated | Superseded]

## Context

What is the issue that we're seeing that is motivating this decision or change?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

What becomes easier or more difficult to do because of this change?

## Alternatives Considered

What other options were considered and why were they rejected?
```

## Current ADRs

| ADR                                            | Title                                | Status   | Date       |
| ---------------------------------------------- | ------------------------------------ | -------- | ---------- |
| [001](./001-uuid-strategy.md)                  | UUID Strategy for Primary Keys       | Accepted | 2025-06-07 |
| [002](./002-microservices-architecture.md)     | Microservices Architecture           | Accepted | 2025-06-07 |
| [003](./003-event-driven-communication.md)     | Event-Driven Communication with NATS | Accepted | 2025-06-07 |
| [004](./004-database-per-service.md)           | Database per Service Pattern         | Proposed | 2025-06-07 |
| [005](./005-postgresql-as-primary-database.md) | PostgreSQL as Primary Database       | Accepted | 2025-06-07 |
| [006](./006-nx-monorepo-structure.md)          | Nx Monorepo Structure                | Accepted | 2025-06-07 |
| [007](./007-testing-strategy.md)               | Testing Strategy and Standards       | Proposed | 2025-06-07 |

## Creating New ADRs

1. **Number**: Use the next sequential number (e.g., 008)
2. **Title**: Use a clear, descriptive title
3. **File Name**: Format as `XXX-title-in-kebab-case.md`
4. **Content**: Follow the standard ADR template
5. **Review**: Get team approval before marking as "Accepted"

## ADR Lifecycle

- **Proposed**: Initial draft, under discussion
- **Accepted**: Decision has been made and approved
- **Deprecated**: Decision is no longer relevant but kept for historical context
- **Superseded**: Replaced by a newer ADR (reference the new ADR)

## Guidelines

### When to Create an ADR

Create an ADR when making decisions about:

- Technology choices (databases, frameworks, libraries)
- Architectural patterns (microservices, event sourcing, etc.)
- Development practices (testing strategies, deployment patterns)
- Security approaches
- Performance optimization strategies
- Integration patterns

### When NOT to Create an ADR

Don't create ADRs for:

- Implementation details that don't affect architecture
- Temporary workarounds
- Obvious choices with no alternatives
- Decisions that can be easily reversed

### Writing Good ADRs

- **Be concise**: Keep it short and focused
- **Provide context**: Explain the problem being solved
- **Consider alternatives**: Show what other options were evaluated
- **Document consequences**: Both positive and negative impacts
- **Use clear language**: Avoid jargon and be specific
- **Include dates**: When was this decision made?

## Tools

- **ADR Tools**: Consider using [adr-tools](https://github.com/npryce/adr-tools)
  for managing ADRs
- **Templates**: Use the template in `templates/adr-template.md`
- **Validation**: Include ADR reviews in the PR process

## Examples

### Good ADR Title Examples

- "Use PostgreSQL for Primary Database"
- "Implement Event Sourcing for Booking Domain"
- "Adopt Microservices Architecture"

### Poor ADR Title Examples

- "Database Decision" (too vague)
- "Fix the Performance Issue" (not architectural)
- "Use Better Logging" (not specific enough)

## References

- [ADR GitHub Organization](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR Tools](https://github.com/npryce/adr-tools)

---

**Note**: ADRs are living documents. They should be updated when decisions
change or new information becomes available. Always reference the superseding
ADR when deprecating an old one.
