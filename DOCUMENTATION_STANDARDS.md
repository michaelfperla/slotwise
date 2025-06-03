# SlotWise Documentation Standards

## 🎯 **Overview**

This document establishes comprehensive documentation standards for the SlotWise
platform to ensure consistent, maintainable, and useful documentation across all
aspects of the project.

## 📋 **Table of Contents**

- [Documentation Principles](#documentation-principles)
- [Code Documentation](#code-documentation)
- [API Documentation](#api-documentation)
- [Architecture Documentation](#architecture-documentation)
- [User Documentation](#user-documentation)
- [Maintenance Procedures](#maintenance-procedures)
- [Documentation Tools](#documentation-tools)

## 🎯 **Documentation Principles**

### **Core Principles**

1. **Clarity**: Write for your audience - be clear and concise
2. **Accuracy**: Keep documentation synchronized with code
3. **Completeness**: Cover all necessary aspects without overwhelming
4. **Accessibility**: Make documentation easy to find and navigate
5. **Maintainability**: Design for easy updates and maintenance

### **Documentation Types**

- **Code Comments**: Inline explanations for complex logic
- **API Documentation**: Comprehensive endpoint and schema documentation
- **Architecture Documentation**: System design and service interactions
- **User Guides**: Step-by-step instructions for end users
- **Developer Guides**: Setup, development, and contribution instructions

## 💻 **Code Documentation**

### **TypeScript/JavaScript Documentation**

````typescript
/**
 * Creates a new business service with the provided configuration.
 *
 * This method validates the service data, checks for duplicates,
 * creates the service in the database, and publishes a creation event.
 *
 * @param userId - The ID of the user creating the service
 * @param data - The service configuration data
 * @returns Promise resolving to the created service
 *
 * @throws {BusinessNotFoundError} When the user's business is not found
 * @throws {ValidationError} When the service data is invalid
 * @throws {ServiceAlreadyExistsError} When a service with the same name exists
 *
 * @example
 * ```typescript
 * const service = await serviceService.createService('user-123', {
 *   name: 'Hair Cut',
 *   duration: 30,
 *   price: 25.00,
 *   currency: 'USD'
 * });
 * ```
 */
public async createService(
  userId: string,
  data: CreateServiceData
): Promise<Service> {
  // Implementation...
}
````

### **Go Documentation**

```go
// CreateUser creates a new user account with the provided information.
//
// This function validates the user data, hashes the password, stores the user
// in the database, and returns the created user without sensitive information.
//
// Parameters:
//   - userData: The user registration data including email and password
//
// Returns:
//   - *User: The created user object (without password hash)
//   - error: Any error that occurred during creation
//
// Errors:
//   - ErrUserAlreadyExists: When a user with the email already exists
//   - ErrInvalidEmail: When the email format is invalid
//   - ErrWeakPassword: When the password doesn't meet requirements
//
// Example:
//   user, err := authService.CreateUser(UserData{
//     Email:    "user@example.com",
//     Password: "securePassword123",
//   })
func (s *AuthService) CreateUser(userData UserData) (*User, error) {
    // Implementation...
}
```

### **Comment Standards**

```typescript
// ============================================================================
// SECTION HEADERS - Use for major code sections
// ============================================================================

// Single-line comments for brief explanations
const businessId = extractBusinessId(token);

/*
 * Multi-line comments for complex explanations
 * that require more detailed description of
 * the logic or business rules.
 */

// TODO: Implement caching for improved performance
// FIXME: Handle edge case when business is null
// NOTE: This logic is required for backward compatibility
// HACK: Temporary workaround until API v2 is available
```

## 🌐 **API Documentation**

### **OpenAPI/Swagger Documentation**

```yaml
# API endpoint documentation example
/api/v1/businesses/{businessId}/services:
  post:
    summary: Create a new service for a business
    description: |
      Creates a new service offering for the specified business.
      The service will be associated with the authenticated user's business.

    parameters:
      - name: businessId
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: The unique identifier of the business

    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateServiceRequest'
          example:
            name: 'Hair Cut'
            description: 'Professional hair cutting service'
            duration: 30
            price: 25.00
            currency: 'USD'

    responses:
      '201':
        description: Service created successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ServiceResponse'
      '400':
        description: Invalid request data
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
      '404':
        description: Business not found
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

### **Endpoint Documentation Template**

````markdown
## POST /api/v1/businesses/{businessId}/services

Creates a new service for the specified business.

### Authentication

Requires valid JWT token in Authorization header.

### Parameters

- `businessId` (path, required): UUID of the business

### Request Body

```json
{
  "name": "string (required, max 255 chars)",
  "description": "string (optional, max 1000 chars)",
  "duration": "number (required, minutes)",
  "price": "number (required, decimal)",
  "currency": "string (required, 3-char ISO code)",
  "isActive": "boolean (optional, default: true)"
}
```
````

### Response

**Success (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "duration": "number",
    "price": "number",
    "currency": "string",
    "isActive": "boolean",
    "businessId": "uuid",
    "createdAt": "ISO 8601 timestamp",
    "updatedAt": "ISO 8601 timestamp"
  },
  "message": "Service created successfully"
}
```

**Error (400 Bad Request):**

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid request data",
  "details": {
    "field": "name",
    "message": "Name is required"
  }
}
```

### Example Usage

```bash
curl -X POST \
  https://api.slotwise.com/api/v1/businesses/123e4567-e89b-12d3-a456-426614174000/services \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hair Cut",
    "description": "Professional hair cutting service",
    "duration": 30,
    "price": 25.00,
    "currency": "USD"
  }'
```

````

## 🏗️ **Architecture Documentation**

### **Service Documentation Template**
```markdown
# Service Name

## Overview
Brief description of the service's purpose and responsibilities.

## Architecture
- **Language**: TypeScript/Node.js or Go
- **Framework**: Fastify, Express, or Gin
- **Database**: PostgreSQL with Prisma/GORM
- **Message Bus**: NATS

## Responsibilities
- Primary responsibility 1
- Primary responsibility 2
- Primary responsibility 3

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /health  | Health check |
| POST   | /api/v1/resource | Create resource |

## Events
### Published Events
- `service.entity.created` - When an entity is created
- `service.entity.updated` - When an entity is updated

### Subscribed Events
- `other.service.event` - Description of what triggers this

## Database Schema
```sql
-- Main tables used by this service
CREATE TABLE entities (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
````

## Configuration

| Variable     | Description         | Default |
| ------------ | ------------------- | ------- |
| PORT         | Service port        | 3000    |
| DATABASE_URL | Database connection | -       |

## Development

```bash
# Start service
npm run dev

# Run tests
npm test

# Build
npm run build
```

````

## 📚 **User Documentation**

### **User Guide Template**
```markdown
# Feature Name User Guide

## Overview
Brief description of what this feature does and why it's useful.

## Getting Started
Step-by-step instructions for first-time users.

### Prerequisites
- List any requirements
- Account setup needed
- Permissions required

### Step-by-Step Instructions
1. **Step 1**: Detailed instruction with screenshot
   - Sub-step if needed
   - Important notes or warnings

2. **Step 2**: Next instruction
   - Additional context
   - Tips for success

## Common Use Cases
### Use Case 1: Scenario Name
Description and steps for this specific scenario.

### Use Case 2: Another Scenario
Description and steps for this scenario.

## Troubleshooting
### Problem: Common Issue
**Symptoms**: What the user sees
**Solution**: How to fix it
**Prevention**: How to avoid it

## FAQ
**Q: Common question?**
A: Clear answer with links to relevant documentation.

## Related Documentation
- [Link to related guide]
- [Link to API documentation]
````

## 🔧 **Maintenance Procedures**

### **Documentation Review Process**

1. **Regular Reviews**: Monthly documentation audits
2. **Code Change Reviews**: Update docs with code changes
3. **User Feedback**: Incorporate user suggestions
4. **Accuracy Checks**: Verify examples and instructions work

### **Documentation Checklist**

- [ ] Code comments are clear and up-to-date
- [ ] API documentation matches implementation
- [ ] Examples are tested and working
- [ ] Screenshots are current
- [ ] Links are not broken
- [ ] Grammar and spelling are correct

### **Update Triggers**

- New feature development
- API changes or additions
- Bug fixes that affect user experience
- Architecture changes
- Deployment procedure changes

## 🛠️ **Documentation Tools**

### **Recommended Tools**

- **Code Documentation**: TSDoc, JSDoc, GoDoc
- **API Documentation**: OpenAPI/Swagger, Postman
- **Diagrams**: Mermaid, Draw.io, PlantUML
- **Screenshots**: Snagit, CloudApp, built-in tools
- **Writing**: Grammarly, Hemingway Editor

### **Automation**

- **API Docs**: Auto-generate from OpenAPI specs
- **Code Docs**: Extract from code comments
- **Link Checking**: Automated broken link detection
- **Screenshot Updates**: Automated UI testing screenshots

### **Documentation Hosting**

- **Internal**: GitHub Wiki, Notion, Confluence
- **Public**: GitBook, Docusaurus, VitePress
- **API Docs**: Swagger UI, Redoc, Postman

## 📝 **Writing Guidelines**

### **Style Guidelines**

- Use active voice: "Create a service" not "A service is created"
- Be concise but complete
- Use consistent terminology
- Include examples for complex concepts
- Structure content with clear headings

### **Formatting Standards**

- Use markdown for all documentation
- Include table of contents for long documents
- Use code blocks with syntax highlighting
- Include alt text for images
- Use consistent heading hierarchy

### **Review Process**

1. **Self-review**: Check for clarity and accuracy
2. **Peer review**: Have a colleague review
3. **User testing**: Test instructions with new users
4. **Final approval**: Get approval from team lead
