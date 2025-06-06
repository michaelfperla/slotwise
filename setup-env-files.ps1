# Setup Environment Files for Development
Write-Host "Setting up environment files..." -ForegroundColor Yellow

# Copy service environment files
Copy-Item "services\business-service\.env.example" "services\business-service\.env" -Force
Copy-Item "services\notification-service\.env.example" "services\notification-service\.env" -Force

Write-Host "✅ Environment files created" -ForegroundColor Green
