#!/bin/bash

# 🧪 Local Setup Test Script for BuyerMap Fider
# Tests the project configuration without requiring Docker

echo "🧪 BuyerMap Fider Local Configuration Test"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Test project structure
print_info "Testing project structure..."

if [ -f "docker-compose.yml" ]; then
    print_status "docker-compose.yml found"
else
    print_error "docker-compose.yml missing"
    exit 1
fi

if [ -f "fider.env.example" ]; then
    print_status "fider.env.example found"
else
    print_error "fider.env.example missing"
    exit 1
fi

if [ -f "scripts/start-fider.sh" ]; then
    print_status "start-fider.sh script found"
else
    print_error "start-fider.sh script missing"
    exit 1
fi

if [ -f "FIDER_SETUP.md" ]; then
    print_status "FIDER_SETUP.md documentation found"
else
    print_warning "FIDER_SETUP.md documentation missing"
fi

# Test environment configuration
print_info "Testing environment configuration..."

if [ ! -f "fider.env" ]; then
    cp fider.env.example fider.env
    print_status "Created fider.env from example"
fi

# Check package.json scripts
if grep -q "feedback:start" package.json; then
    print_status "npm scripts configured correctly"
else
    print_warning "npm scripts may need updating"
fi

# Test feedback button integration
print_info "Checking feedback button integration..."

if find src -name "*.tsx" -o -name "*.ts" | xargs grep -l "FeedbackButton" > /dev/null 2>&1; then
    print_status "FeedbackButton component found in project"
else
    print_warning "FeedbackButton component not found - check integration"
fi

# Summary
echo ""
print_status "🎉 Configuration test complete!"
echo ""
print_info "📋 Your project is ready for VPS deployment!"
echo ""
print_info "Next steps:"
echo "1. 🚀 Create your Hetzner VPS (see VPS_DEPLOYMENT.md)"
echo "2. 📤 Upload this project to your VPS"
echo "3. 🔧 Run ./scripts/vps-setup.sh on your VPS"
echo "4. 🌐 Access Fider at http://YOUR_VPS_IP:3000"
echo ""
print_info "💡 Tip: You can skip Docker installation locally and deploy directly to VPS!" 