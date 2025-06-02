#!/bin/bash

# SlotWise GitHub Upload Script
# This script will create a new repository and upload SlotWise to your GitHub account

set -e

echo "🚀 SlotWise GitHub Upload Script"
echo "================================="
echo ""

# Check if we're in a git repository
if [ -d ".git" ]; then
    echo "⚠️  Git repository already exists. This script will:"
    echo "   1. Remove existing git history"
    echo "   2. Initialize fresh repository"
    echo "   3. Create initial commit"
    echo "   4. Push to GitHub"
    echo ""
    read -p "Continue? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    rm -rf .git
fi

# Initialize git repository
echo "📁 Initializing git repository..."
git init
git branch -M main

# Add all files
echo "📝 Adding files to git..."
git add .

# Create initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: SlotWise scheduling platform

✨ Features:
- Multi-tenant scheduling platform
- Event-driven microservices architecture
- Real-time booking and availability management
- Integrated payment processing with Stripe
- Multi-channel notifications (Email, SMS)
- Comprehensive API documentation
- Docker and Kubernetes deployment ready
- Full TypeScript and Go implementation

🏗️ Architecture:
- Frontend: Next.js 14 with React 18 and TypeScript
- Backend: Go (Auth/Scheduling) + Node.js (Business/Notification)
- Database: PostgreSQL with Prisma and GORM
- Message Broker: NATS.io for event-driven communication
- Cache: Redis for performance optimization
- API Gateway: Nginx for load balancing and routing

🚀 Ready for production deployment and community contributions!"

# Instructions for creating GitHub repository
echo ""
echo "🌟 Next Steps:"
echo "=============="
echo ""
echo "1. Go to GitHub and create a new repository:"
echo "   https://github.com/new"
echo ""
echo "2. Repository settings:"
echo "   - Repository name: slotwise"
echo "   - Description: High-velocity scheduling platform for solopreneurs and small businesses"
echo "   - Visibility: Public (recommended for open source)"
echo "   - ❌ Do NOT initialize with README, .gitignore, or license (we have these already)"
echo ""
echo "3. After creating the repository, run these commands:"
echo ""
echo "   git remote add origin https://github.com/michaelfperla/slotwise.git"
echo "   git push -u origin main"
echo ""
echo "4. Configure repository settings:"
echo "   - Go to Settings > General > Features"
echo "   - ✅ Enable Issues"
echo "   - ✅ Enable Discussions"
echo "   - ✅ Enable Projects"
echo "   - ✅ Enable Wiki (optional)"
echo ""
echo "5. Set up branch protection (recommended):"
echo "   - Go to Settings > Branches"
echo "   - Add rule for 'main' branch"
echo "   - ✅ Require pull request reviews"
echo "   - ✅ Require status checks to pass"
echo "   - ✅ Require branches to be up to date"
echo ""
echo "6. Add repository topics/tags:"
echo "   - scheduling, booking, microservices, typescript, go, react, nextjs"
echo "   - docker, kubernetes, event-driven, saas, open-source"
echo ""
echo "7. Enable GitHub Actions:"
echo "   - Actions will automatically run when you push"
echo "   - CI/CD workflows are already configured"
echo ""
echo "📋 Repository will include:"
echo "========================="
echo "✅ Complete microservices architecture"
echo "✅ Production-ready Docker configurations"
echo "✅ Kubernetes deployment manifests"
echo "✅ Comprehensive documentation"
echo "✅ Automated CI/CD workflows"
echo "✅ Issue and PR templates"
echo "✅ Contributing guidelines"
echo "✅ MIT License"
echo ""
echo "🎉 Your SlotWise repository is ready to upload!"
echo ""
echo "After pushing to GitHub, your repository will be available at:"
echo "https://github.com/michaelfperla/slotwise"
echo ""
echo "Happy coding! 🚀"
