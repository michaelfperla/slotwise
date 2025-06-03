# Code Review Guidelines

## 🎯 Overview

This document defines comprehensive code review guidelines for SlotWise development, ensuring consistent quality, knowledge sharing, and collaborative improvement across all team members and projects.

## 🏗️ Core Principles

### 1. Constructive Collaboration
- Reviews are learning opportunities for everyone
- Focus on the code, not the person
- Provide specific, actionable feedback
- Acknowledge good practices and improvements

### 2. Quality Assurance
- Ensure code meets functional requirements
- Verify adherence to coding standards
- Check for potential bugs and edge cases
- Validate security and performance considerations

### 3. Knowledge Sharing
- Share domain expertise and best practices
- Explain reasoning behind suggestions
- Learn from different approaches and perspectives
- Document decisions and trade-offs

## 📋 Review Process

### 1. Pre-Review Checklist (Author)
```markdown
## Before Requesting Review

### Code Quality
- [ ] Code follows established style guidelines
- [ ] All tests pass locally
- [ ] Code is self-documenting with clear variable/function names
- [ ] Complex logic is commented appropriately
- [ ] No debugging code or console.log statements left behind

### Functionality
- [ ] Feature works as intended
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] Performance implications considered

### Testing
- [ ] New functionality has appropriate tests
- [ ] Existing tests still pass
- [ ] Test coverage meets requirements
- [ ] Integration tests updated if needed

### Documentation
- [ ] README updated if needed
- [ ] API documentation updated
- [ ] Breaking changes documented
- [ ] Migration guides provided if applicable

### Security
- [ ] No sensitive data exposed
- [ ] Input validation implemented
- [ ] Authentication/authorization checked
- [ ] SQL injection and XSS prevention verified
```

### 2. Review Assignment Strategy
```yaml
# Automatic assignment rules
review_assignment:
  # At least one reviewer required
  required_reviewers: 1
  
  # Specific expertise requirements
  expertise_based:
    - path: "apps/*/security/*"
      required_teams: ["security-team"]
    - path: "apps/*/database/*"
      required_teams: ["database-team"]
    - path: "infrastructure/*"
      required_teams: ["devops-team"]
  
  # Load balancing
  round_robin: true
  
  # Avoid self-assignment
  exclude_author: true
```

### 3. Review Timeline
```
┌─────────────────┬─────────────────┬─────────────────┐
│   PR Created    │  First Review   │ Final Approval  │
│                 │                 │                 │
│ Author submits  │ Within 4 hours  │ Within 24 hours │
│ PR for review   │ (business hours)│ of first review │
└─────────────────┴─────────────────┴─────────────────┘

Priority Levels:
🔴 Critical (Security/Production): 2 hours
🟡 High (Feature/Bug): 4 hours  
🟢 Normal (Refactor/Docs): 8 hours
🔵 Low (Chore/Style): 24 hours
```

## 🔍 Review Focus Areas

### 1. Code Quality and Standards
```go
// ✅ Good: Clear, self-documenting code
func CalculateBookingTotal(booking *Booking, discounts []Discount) (decimal.Decimal, error) {
    if booking == nil {
        return decimal.Zero, errors.New("booking cannot be nil")
    }
    
    baseAmount := booking.Service.Price
    totalDiscount := calculateTotalDiscount(baseAmount, discounts)
    
    return baseAmount.Sub(totalDiscount), nil
}

// ❌ Poor: Unclear naming and no error handling
func calc(b *Booking, d []Discount) decimal.Decimal {
    total := b.Service.Price
    for _, disc := range d {
        total = total.Sub(disc.Amount)
    }
    return total
}
```

**Review Questions:**
- Are variable and function names descriptive?
- Is the code easy to understand without comments?
- Does it follow established coding standards?
- Are there any code smells or anti-patterns?

### 2. Functionality and Logic
```typescript
// ✅ Good: Comprehensive input validation
function validateBookingTime(startTime: Date, endTime: Date, businessHours: BusinessHours): ValidationResult {
  const errors: string[] = [];
  
  if (startTime >= endTime) {
    errors.push("Start time must be before end time");
  }
  
  if (startTime < new Date()) {
    errors.push("Cannot book appointments in the past");
  }
  
  if (!isWithinBusinessHours(startTime, endTime, businessHours)) {
    errors.push("Booking must be within business hours");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ❌ Poor: Missing validation and edge cases
function validateBookingTime(startTime: Date, endTime: Date): boolean {
  return startTime < endTime;
}
```

**Review Questions:**
- Does the code handle all edge cases?
- Are error conditions properly handled?
- Is the business logic correct and complete?
- Are there any potential race conditions or concurrency issues?

### 3. Security Considerations
```go
// ✅ Good: Proper input validation and sanitization
func (h *UserHandler) UpdateUser(c *gin.Context) {
    userID := c.Param("id")
    
    // Validate UUID format
    if !isValidUUID(userID) {
        c.JSON(400, gin.H{"error": "Invalid user ID format"})
        return
    }
    
    // Check authorization
    currentUserID := c.GetString("userID")
    if userID != currentUserID && !hasAdminRole(c) {
        c.JSON(403, gin.H{"error": "Insufficient permissions"})
        return
    }
    
    var req UpdateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "Invalid request format"})
        return
    }
    
    // Sanitize input
    req.FirstName = sanitizeString(req.FirstName)
    req.LastName = sanitizeString(req.LastName)
    
    // Update user...
}

// ❌ Poor: No validation or authorization
func (h *UserHandler) UpdateUser(c *gin.Context) {
    userID := c.Param("id")
    var req UpdateUserRequest
    c.BindJSON(&req)
    
    // Direct update without checks
    h.service.UpdateUser(userID, req)
    c.JSON(200, gin.H{"status": "updated"})
}
```

**Review Questions:**
- Are inputs properly validated and sanitized?
- Is authentication and authorization implemented correctly?
- Are there any potential security vulnerabilities?
- Is sensitive data properly protected?

### 4. Performance and Scalability
```sql
-- ✅ Good: Optimized query with proper indexing
SELECT b.id, b.start_time, b.end_time, u.email, s.name
FROM bookings b
JOIN users u ON b.customer_id = u.id
JOIN services s ON b.service_id = s.id
WHERE b.business_id = $1
  AND b.start_time >= $2
  AND b.start_time < $3
  AND b.status = 'confirmed'
ORDER BY b.start_time
LIMIT 50;

-- Index: CREATE INDEX idx_bookings_business_time_status ON bookings(business_id, start_time, status);

-- ❌ Poor: Inefficient query without proper indexing
SELECT * FROM bookings b, users u, services s
WHERE b.customer_id = u.id
  AND b.service_id = s.id
  AND b.business_id = $1
ORDER BY b.start_time;
```

**Review Questions:**
- Are database queries optimized?
- Will the code perform well under load?
- Are there any potential memory leaks?
- Is caching used appropriately?

### 5. Testing Coverage
```go
// ✅ Good: Comprehensive test coverage
func TestBookingService_CreateBooking(t *testing.T) {
    tests := []struct {
        name        string
        request     CreateBookingRequest
        setupMocks  func(*MockRepository)
        expectedErr string
    }{
        {
            name: "valid booking creates successfully",
            request: CreateBookingRequest{
                CustomerID: "customer-123",
                ServiceID:  "service-456",
                StartTime:  time.Now().Add(24 * time.Hour),
                EndTime:    time.Now().Add(25 * time.Hour),
            },
            setupMocks: func(repo *MockRepository) {
                repo.On("CheckAvailability", mock.Anything, mock.Anything).Return(true, nil)
                repo.On("Create", mock.Anything, mock.AnythingOfType("*Booking")).Return(nil)
            },
            expectedErr: "",
        },
        {
            name: "overlapping booking returns conflict error",
            request: CreateBookingRequest{
                CustomerID: "customer-123",
                ServiceID:  "service-456",
                StartTime:  time.Now().Add(24 * time.Hour),
                EndTime:    time.Now().Add(25 * time.Hour),
            },
            setupMocks: func(repo *MockRepository) {
                repo.On("CheckAvailability", mock.Anything, mock.Anything).Return(false, nil)
            },
            expectedErr: "time slot not available",
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation...
        })
    }
}
```

**Review Questions:**
- Are there tests for the new functionality?
- Do tests cover edge cases and error conditions?
- Are tests clear and maintainable?
- Is the test coverage adequate?

## 💬 Review Communication

### 1. Comment Types and Examples
```markdown
## Blocking Issues (Must Fix)
🚨 **BLOCKING**: This SQL query is vulnerable to injection attacks. Please use parameterized queries.

🚨 **BLOCKING**: This function doesn't handle the case where `user` is nil, which will cause a panic.

## Suggestions (Should Consider)
💡 **SUGGESTION**: Consider extracting this logic into a separate function for better testability.

💡 **SUGGESTION**: This could be simplified using the `strings.Builder` for better performance.

## Questions (Seeking Clarification)
❓ **QUESTION**: Why did you choose to use a map here instead of a slice? Is there a performance consideration?

❓ **QUESTION**: Should we add logging for this error case to help with debugging?

## Praise (Acknowledge Good Work)
✅ **PRAISE**: Great error handling here! The error messages are very clear and actionable.

✅ **PRAISE**: Nice use of the builder pattern. This makes the code much more readable.

## Nitpicks (Minor Issues)
🔧 **NITPICK**: Consider using a more descriptive variable name than `temp`.

🔧 **NITPICK**: This comment seems outdated based on the current implementation.
```

### 2. Constructive Feedback Examples
```markdown
## ✅ Good Feedback Examples

### Specific and Actionable
"The error handling on line 45 doesn't account for network timeouts. Consider adding a specific case for `context.DeadlineExceeded` to provide a better user experience."

### Educational
"This approach works, but using `sync.Pool` here could reduce memory allocations. Here's a good article about it: [link]. What do you think?"

### Collaborative
"I see you're handling this edge case differently than we do in the payment service. Should we standardize this pattern across services?"

## ❌ Poor Feedback Examples

### Vague and Unhelpful
"This doesn't look right."
"Fix this."
"Bad code."

### Personal Attacks
"You always write code like this."
"This is obviously wrong."
"Did you even test this?"

### Overly Prescriptive
"Change this to use pattern X because I prefer it."
"This should be done exactly like I would do it."
```

### 3. Response Guidelines
```markdown
## For Authors (Receiving Feedback)

### Positive Responses
✅ "Thanks for catching that! I'll fix the error handling."
✅ "Good point about performance. Let me refactor this."
✅ "I hadn't considered that edge case. Adding a test for it now."
✅ "That's a great suggestion. Here's why I chose this approach: [explanation]"

### When You Disagree
✅ "I see your point, but I chose this approach because [reason]. What do you think?"
✅ "That's an interesting alternative. Let me research it and get back to you."
✅ "I understand the concern, but this is consistent with how we handle it in [other service]. Should we discuss standardizing?"

## For Reviewers (Giving Feedback)

### Be Specific
✅ "Line 23: This function could return an error if the slice is empty"
❌ "This function has issues"

### Explain Why
✅ "Consider using a constant here to make the code more maintainable and avoid magic numbers"
❌ "Use a constant"

### Offer Solutions
✅ "This could cause a memory leak. Consider using `defer` to ensure cleanup"
❌ "This will cause problems"
```

## 🔄 Review Workflow

### 1. GitHub PR Review Process
```yaml
# .github/pull_request_template.md
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] New tests added for new functionality

## Review Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Code is commented where necessary
- [ ] Documentation updated
- [ ] No merge conflicts

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Additional Notes
[Any additional information for reviewers]
```

### 2. Review States and Actions
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Draft PR      │    │  Ready for      │    │   Approved      │
│                 │    │    Review       │    │                 │
│ • Work in       │───▶│ • All checks    │───▶│ • All feedback  │
│   progress      │    │   passing       │    │   addressed     │
│ • Not ready     │    │ • Self-reviewed │    │ • Ready to      │
│   for review    │    │ • Tests added   │    │   merge         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       │                       │
         │                       ▼                       ▼
         │              ┌─────────────────┐    ┌─────────────────┐
         │              │  Changes        │    │    Merged       │
         │              │  Requested      │    │                 │
         └──────────────│ • Feedback      │    │ • Code in main  │
                        │   provided      │    │ • PR closed     │
                        │ • Author needs  │    │ • Branch        │
                        │   to address    │    │   deleted       │
                        └─────────────────┘    └─────────────────┘
```

### 3. Conflict Resolution
```markdown
## When Reviewers Disagree

1. **Discussion**: Engage in respectful discussion in PR comments
2. **Documentation**: Reference coding standards and architectural decisions
3. **Escalation**: Involve team lead or architect if needed
4. **Decision**: Make a decision and document reasoning
5. **Follow-up**: Create issues for broader discussions if needed

## When Author Disagrees with Feedback

1. **Explain**: Provide clear reasoning for your approach
2. **Listen**: Consider the reviewer's perspective
3. **Compromise**: Look for middle-ground solutions
4. **Escalate**: Involve team lead if consensus can't be reached
5. **Document**: Record the decision for future reference
```

## 📊 Review Metrics and Improvement

### 1. Tracking Metrics
```yaml
review_metrics:
  # Time-based metrics
  time_to_first_review: "< 4 hours"
  time_to_approval: "< 24 hours"
  time_to_merge: "< 48 hours"
  
  # Quality metrics
  defect_escape_rate: "< 5%"
  review_coverage: "> 95%"
  review_participation: "> 80%"
  
  # Process metrics
  average_review_iterations: "< 3"
  review_comment_resolution: "> 95%"
  reviewer_load_balance: "±20%"
```

### 2. Review Quality Assessment
```markdown
## Monthly Review Quality Assessment

### Positive Indicators
✅ Constructive feedback that improves code quality
✅ Knowledge sharing and learning opportunities
✅ Consistent application of coding standards
✅ Early detection of bugs and security issues
✅ Improved team collaboration and communication

### Areas for Improvement
❌ Reviews taking too long
❌ Superficial reviews missing important issues
❌ Inconsistent feedback across reviewers
❌ Lack of participation from some team members
❌ Defensive or unconstructive communication
```

## 📚 Review Training and Resources

### 1. Onboarding Checklist
```markdown
## New Team Member Review Training

### Week 1: Observer
- [ ] Shadow experienced reviewers
- [ ] Read team coding standards
- [ ] Review past PR discussions
- [ ] Understand review tools and process

### Week 2: Guided Practice
- [ ] Conduct reviews with mentor guidance
- [ ] Practice giving constructive feedback
- [ ] Learn to identify common issues
- [ ] Understand escalation process

### Week 3: Independent Reviews
- [ ] Conduct independent reviews
- [ ] Receive feedback on review quality
- [ ] Participate in review discussions
- [ ] Contribute to process improvements
```

### 2. Continuous Improvement
```markdown
## Monthly Review Retrospectives

### What Went Well?
- Effective feedback that improved code quality
- Good collaboration and knowledge sharing
- Timely reviews that didn't block development

### What Could Be Improved?
- Areas where reviews were too slow
- Types of issues frequently missed
- Communication that could be more constructive

### Action Items
- Specific improvements to implement
- Training needs identified
- Process changes to try
```

## 📋 Review Checklist Templates

### 1. Security Review Checklist
```markdown
## Security Review Checklist

### Authentication & Authorization
- [ ] Authentication required for protected endpoints
- [ ] Authorization checks implemented correctly
- [ ] JWT tokens validated properly
- [ ] Session management secure

### Input Validation
- [ ] All inputs validated and sanitized
- [ ] SQL injection prevention implemented
- [ ] XSS prevention measures in place
- [ ] File upload restrictions applied

### Data Protection
- [ ] Sensitive data encrypted
- [ ] PII handling compliant
- [ ] Secrets not exposed in code
- [ ] Audit logging implemented

### Infrastructure
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Error messages don't leak information
```

### 2. Performance Review Checklist
```markdown
## Performance Review Checklist

### Database
- [ ] Queries optimized with proper indexes
- [ ] N+1 query problems avoided
- [ ] Connection pooling configured
- [ ] Transactions used appropriately

### Caching
- [ ] Appropriate caching strategy implemented
- [ ] Cache invalidation handled correctly
- [ ] Cache keys designed properly
- [ ] TTL values set appropriately

### Code Efficiency
- [ ] Algorithms are efficient
- [ ] Memory usage optimized
- [ ] Unnecessary computations avoided
- [ ] Async operations used where beneficial

### Scalability
- [ ] Code handles increased load
- [ ] Resource usage is reasonable
- [ ] Bottlenecks identified and addressed
- [ ] Monitoring and alerting in place
```

## 📚 Resources and References

- [Google Code Review Guidelines](https://google.github.io/eng-practices/review/)
- [GitHub Code Review Best Practices](https://github.com/features/code-review/)
- [Effective Code Reviews](https://www.atlassian.com/agile/software-development/code-reviews)
- [The Art of Readable Code](https://www.oreilly.com/library/view/the-art-of/9781449318482/)
