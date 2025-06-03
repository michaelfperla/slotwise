# Pull Request

## Description

<!-- Provide a brief description of the changes in this PR -->

## Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality
      to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🔧 Refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] 🧪 Test improvements
- [ ] 🔒 Security enhancement
- [ ] 🏗️ Infrastructure/build changes

## Related Issues

<!-- Link to related issues using keywords like "Fixes #123" or "Closes #456" -->

- Fixes #
- Related to #

## Changes Made

<!-- Provide a detailed list of changes made in this PR -->

### Frontend Changes

- [ ] Component updates
- [ ] Styling changes
- [ ] State management updates
- [ ] Routing changes

### Backend Changes

- [ ] API endpoint changes
- [ ] Database schema changes
- [ ] Business logic updates
- [ ] Event handling updates

### Infrastructure Changes

- [ ] Docker configuration updates
- [ ] Kubernetes manifest changes
- [ ] CI/CD pipeline updates
- [ ] Environment configuration changes

## Testing

<!-- Describe the testing that has been done -->

### Test Coverage

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] End-to-end tests added/updated
- [ ] Manual testing completed

### Test Results

```
# Paste test results here
npm run test:all
```

### Manual Testing Checklist

- [ ] Tested on development environment
- [ ] Tested on staging environment (if applicable)
- [ ] Tested with different user roles
- [ ] Tested edge cases and error scenarios
- [ ] Tested browser compatibility (if frontend changes)
- [ ] Tested mobile responsiveness (if frontend changes)

## API Changes

<!-- If this PR includes API changes, document them here -->

### New Endpoints

- `POST /api/v1/example` - Description of endpoint

### Modified Endpoints

- `GET /api/v1/example` - Description of changes

### Deprecated Endpoints

- `DELETE /api/v1/old-endpoint` - Will be removed in v2.0.0

### Breaking Changes

<!-- List any breaking changes and migration steps -->

## Database Changes

<!-- If this PR includes database changes, document them here -->

### Schema Changes

- [ ] New tables added
- [ ] Existing tables modified
- [ ] Indexes added/modified
- [ ] Constraints added/modified

### Migration Notes

```sql
-- Include migration SQL here if applicable
```

### Data Migration Required

- [ ] Yes - migration script included
- [ ] No - schema changes only
- [ ] N/A - no database changes

## Security Considerations

<!-- Address any security implications -->

- [ ] No security implications
- [ ] Security review completed
- [ ] Input validation added/updated
- [ ] Authentication/authorization changes
- [ ] Sensitive data handling reviewed

## Performance Impact

<!-- Describe any performance implications -->

- [ ] No performance impact
- [ ] Performance improvement
- [ ] Potential performance impact (explain below)
- [ ] Performance testing completed

### Performance Notes

<!-- Add details about performance impact or improvements -->

## Documentation

<!-- Check all that apply -->

- [ ] Code comments added/updated
- [ ] API documentation updated
- [ ] README updated
- [ ] Deployment guide updated
- [ ] User documentation updated
- [ ] Architecture documentation updated

## Deployment Notes

<!-- Any special deployment considerations -->

### Environment Variables

<!-- List any new or changed environment variables -->

### Configuration Changes

<!-- List any configuration changes required -->

### Deployment Order

<!-- If services need to be deployed in a specific order -->

1. Deploy infrastructure changes
2. Deploy backend services
3. Deploy frontend
4. Run database migrations

## Screenshots/Videos

<!-- Add screenshots or videos to demonstrate the changes -->

### Before

<!-- Screenshots of the current state -->

### After

<!-- Screenshots of the new state -->

## Checklist

<!-- Mark completed items with an "x" -->

### Code Quality

- [ ] Code follows the project's coding standards
- [ ] Code is self-documenting with clear variable/function names
- [ ] Complex logic is commented
- [ ] No console.log or debug statements left in code
- [ ] Error handling is implemented appropriately

### Testing

- [ ] All existing tests pass
- [ ] New tests have been added for new functionality
- [ ] Test coverage is maintained or improved
- [ ] Integration tests pass
- [ ] Manual testing completed

### Documentation

- [ ] Code is documented with JSDoc/GoDoc comments
- [ ] API changes are documented
- [ ] README is updated if needed
- [ ] Breaking changes are documented

### Security

- [ ] Input validation is implemented
- [ ] No sensitive information is exposed
- [ ] Authentication/authorization is properly implemented
- [ ] Security best practices are followed

### Performance

- [ ] No obvious performance regressions
- [ ] Database queries are optimized
- [ ] Caching is implemented where appropriate
- [ ] Resource usage is reasonable

### Compatibility

- [ ] Changes are backward compatible (or breaking changes are documented)
- [ ] Browser compatibility maintained (if frontend changes)
- [ ] Mobile responsiveness maintained (if frontend changes)
- [ ] API versioning considered (if API changes)

## Additional Notes

<!-- Any additional information that reviewers should know -->

## Review Checklist for Maintainers

<!-- For maintainer use -->

- [ ] Code review completed
- [ ] Architecture review completed (if significant changes)
- [ ] Security review completed (if security implications)
- [ ] Performance review completed (if performance implications)
- [ ] Documentation review completed
- [ ] Test coverage verified
- [ ] CI/CD pipeline passes
- [ ] Deployment plan reviewed
