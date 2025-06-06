# Email Verification Script for Development (PowerShell)
# Usage: .\scripts\verify-email.ps1 -Email "test@example.com"

param(
    [Parameter(Mandatory=$true)]
    [string]$Email
)

Write-Host "🔍 Checking user: $Email" -ForegroundColor Cyan

# Check if user exists
$userExistsQuery = "SELECT COUNT(*) FROM users WHERE email = '$Email';"
$userExists = docker exec -it slotwise-postgres-dev psql -U slotwise_auth_user -d slotwise_auth -t -c $userExistsQuery

if ($userExists.Trim() -eq "0") {
    Write-Host "❌ User with email $Email not found" -ForegroundColor Red
    exit 1
}

Write-Host "✅ User found. Verifying email..." -ForegroundColor Green

# Verify the email
$updateQuery = @"
UPDATE users 
SET is_email_verified = true, 
    email_verified_at = NOW(), 
    status = 'active', 
    email_verification_token = NULL, 
    email_verification_expires_at = NULL 
WHERE email = '$Email';
"@

docker exec -it slotwise-postgres-dev psql -U slotwise_auth_user -d slotwise_auth -c $updateQuery

Write-Host "✅ Email verified successfully!" -ForegroundColor Green
Write-Host "📧 User $Email can now log in" -ForegroundColor Yellow

# Show user status
Write-Host ""
Write-Host "📊 User Status:" -ForegroundColor Cyan
$statusQuery = "SELECT email, is_email_verified, status, email_verified_at FROM users WHERE email = '$Email';"
docker exec -it slotwise-postgres-dev psql -U slotwise_auth_user -d slotwise_auth -c $statusQuery
