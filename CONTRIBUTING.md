# Contributing to SlotWise

We love your input! We want to make contributing to SlotWise as easy and
transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as
accept pull requests.

### Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively
welcome your pull requests:

1. **Fork the repo** and create your branch from `main`.
2. **Make your changes** following our [Coding Standards](CODING_STANDARDS.md).
3. **Follow our workflow** as outlined in
   [Development Workflow](DEVELOPMENT_WORKFLOW.md).
4. **Add tests** if you've added code that should be tested.
5. **Update documentation** following
   [Documentation Standards](DOCUMENTATION_STANDARDS.md).
6. **Ensure the test suite passes** by running `npm run test:all`.
7. **Make sure your code lints** by running `npm run lint`.
8. **Issue that pull request!**

### Development Setup

1. **Clone your fork**:

   ```bash
   git clone https://github.com/your-username/slotwise.git
   cd slotwise
   ```

2. **Set up development environment**:

   ```bash
   chmod +x scripts/setup-dev.sh
   ./scripts/setup-dev.sh
   ```

3. **Create a feature branch**:

   ```bash
   git checkout -b feature/amazing-feature
   ```

4. **Make your changes and test**:

   ```bash
   npm run dev
   npm run test:all
   npm run lint
   ```

5. **Commit your changes**:

   ```bash
   git commit -m "Add amazing feature"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/amazing-feature
   ```

## Coding Standards

SlotWise follows comprehensive coding standards to ensure consistent,
maintainable code across all services. Please review our detailed standards
documentation:

### 📋 **[Coding Standards](CODING_STANDARDS.md)**

Complete guidelines for TypeScript/Node.js, Go, React, Database, API Design,
NATS Events, and Testing standards.

### 🔄 **[Development Workflow](DEVELOPMENT_WORKFLOW.md)**

Git workflow, branch management, commit standards, PR process, and code review
guidelines.

### 🏗️ **[Architecture Documentation](ARCHITECTURE.md)**

System design, service interactions, database schemas, and deployment patterns.

### 📚 **[Documentation Standards](DOCUMENTATION_STANDARDS.md)**

Guidelines for code documentation, API docs, architecture docs, and user guides.

### Quick Reference

- **TypeScript/JavaScript**: Use TypeScript, follow ESLint/Prettier, write JSDoc
  comments
- **Go**: Follow standard conventions, comprehensive error handling, GoDoc
  comments
- **Database**: Use migrations, snake_case naming, proper indexing
- **API Design**: RESTful principles, consistent responses, OpenAPI
  documentation
- **Testing**: 80%+ coverage, unit/integration/e2e tests, clear test structure

## Testing Guidelines

### Test Coverage

- Maintain **minimum 80% code coverage**
- Write **unit tests** for all business logic
- Include **integration tests** for API endpoints
- Add **end-to-end tests** for critical user flows

### Test Structure

```typescript
describe('Feature', () => {
  describe('when condition', () => {
    it('should do expected behavior', () => {
      // Arrange
      const input = createTestInput();

      // Act
      const result = performAction(input);

      // Assert
      expect(result).toEqual(expectedOutput);
    });
  });
});
```

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

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/)
specification:

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

### Examples

```bash
feat(auth): add OAuth2 social login support

fix(booking): resolve timezone conversion bug in availability calculation

docs(api): update authentication endpoint documentation

test(business): add integration tests for service creation
```

## Issue Reporting

### Bug Reports

Great bug reports tend to have:

- A quick summary and/or background
- Steps to reproduce (be specific!)
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening)

### Feature Requests

Feature requests should include:

- **Problem statement**: What problem does this solve?
- **Proposed solution**: How should this feature work?
- **Alternatives considered**: What other approaches did you consider?
- **Additional context**: Screenshots, mockups, or examples

## Code Review Process

### For Contributors

- **Keep PRs focused**: One feature or fix per PR
- **Write clear descriptions**: Explain what and why, not just how
- **Respond to feedback**: Address reviewer comments promptly
- **Update documentation**: Keep docs in sync with code changes

### For Reviewers

- **Be constructive**: Provide helpful feedback, not just criticism
- **Focus on the code**: Review the implementation, not the person
- **Ask questions**: If something is unclear, ask for clarification
- **Approve when ready**: Don't hold up good code for minor issues

## Security

### Reporting Security Issues

**Do not report security vulnerabilities through public GitHub issues.**

Instead, please email security@slotwise.com with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We'll respond within 48 hours and work with you to resolve the issue.

### Security Best Practices

- **Never commit secrets** (API keys, passwords, etc.)
- **Use environment variables** for configuration
- **Validate all inputs** at API boundaries
- **Follow OWASP guidelines** for web security
- **Keep dependencies updated** to patch vulnerabilities

## Documentation

### What to Document

- **API changes**: Update OpenAPI specs
- **New features**: Add usage examples
- **Breaking changes**: Include migration guides
- **Architecture decisions**: Document the why, not just the what

### Documentation Standards

- Use **clear, concise language**
- Include **code examples** where helpful
- Keep **README files updated**
- Write **inline comments** for complex logic

## Community Guidelines

### Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By
participating, you are expected to uphold this code.

### Getting Help

- **Documentation**: Check the [docs](docs/) directory first
- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Create an issue for bugs or feature requests
- **Discord**: Join our community Discord server (link in README)

## Recognition

Contributors who make significant contributions will be:

- Added to the **CONTRIBUTORS.md** file
- Mentioned in **release notes**
- Invited to join the **maintainers team** (for ongoing contributors)

## License

By contributing, you agree that your contributions will be licensed under the
MIT License.

## Questions?

Don't hesitate to reach out! You can:

- Open a GitHub Discussion
- Create an issue with the "question" label
- Email us at contributors@slotwise.com

Thank you for contributing to SlotWise! 🎉
