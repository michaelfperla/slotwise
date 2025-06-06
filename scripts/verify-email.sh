#!/bin/bash

# Email Verification Script for Development
# Usage: ./scripts/verify-email.sh <email>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <email>"
    echo "Example: $0 test@example.com"
    exit 1
fi

EMAIL=$1

echo "🔍 Checking user: $EMAIL"

# Check if user exists
USER_EXISTS=$(docker exec -it slotwise-postgres-dev psql -U slotwise_auth_user -d slotwise_auth -t -c "SELECT COUNT(*) FROM users WHERE email = '$EMAIL';" | tr -d ' \r\n')

if [ "$USER_EXISTS" = "0" ]; then
    echo "❌ User with email $EMAIL not found"
    exit 1
fi

echo "✅ User found. Verifying email..."

# Verify the email
docker exec -it slotwise-postgres-dev psql -U slotwise_auth_user -d slotwise_auth -c "
UPDATE users 
SET is_email_verified = true, 
    email_verified_at = NOW(), 
    status = 'active', 
    email_verification_token = NULL, 
    email_verification_expires_at = NULL 
WHERE email = '$EMAIL';
"

echo "✅ Email verified successfully!"
echo "📧 User $EMAIL can now log in"

# Show user status
echo ""
echo "📊 User Status:"
docker exec -it slotwise-postgres-dev psql -U slotwise_auth_user -d slotwise_auth -c "
SELECT email, is_email_verified, status, email_verified_at 
FROM users 
WHERE email = '$EMAIL';
"
