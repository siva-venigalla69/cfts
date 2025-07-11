#!/bin/bash

# Design Gallery - Quick Start Script
# This script helps you quickly set up and test your application

echo "🎨 Design Gallery - Quick Start"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    print_error "Please run this script from the /home/murali/cfts directory"
    exit 1
fi

print_info "Starting quick setup and testing..."

# Step 1: Backend Testing
echo -e "\n${BLUE}🔧 Step 1: Backend Testing${NC}"
echo "=============================="

print_info "Testing backend health..."
if command -v curl &> /dev/null; then
    # Try to get the worker URL from wrangler.toml
    if [ -f "wrangler.toml" ]; then
        WORKER_NAME=$(grep "name" wrangler.toml | head -1 | cut -d'"' -f2)
        if [ ! -z "$WORKER_NAME" ]; then
            BACKEND_URL="https://${WORKER_NAME}.your-username.workers.dev"
            print_info "Testing backend at: $BACKEND_URL"
            
            echo "Testing /test endpoint..."
            curl -s "${BACKEND_URL}/test" || print_warning "Backend test endpoint not accessible"
            
            echo "Testing /health endpoint..."
            curl -s "${BACKEND_URL}/health" || print_warning "Backend health endpoint not accessible"
        else
            print_warning "Could not determine worker name from wrangler.toml"
        fi
    else
        print_warning "wrangler.toml not found - please deploy backend first"
    fi
else
    print_warning "curl not available - skipping backend tests"
fi

# Step 2: Frontend Setup
echo -e "\n${BLUE}📱 Step 2: Frontend Setup${NC}"
echo "=========================="

cd frontend

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_info "Installing frontend dependencies..."
    npm install
else
    print_status "Frontend dependencies already installed"
fi

# Check TypeScript
print_info "Checking TypeScript configuration..."
if npx tsc --noEmit --skipLibCheck; then
    print_status "TypeScript check passed"
else
    print_warning "TypeScript has some issues - check the output above"
fi

# Step 3: Configuration Check
echo -e "\n${BLUE}⚙️  Step 3: Configuration Check${NC}"
echo "==============================="

API_FILE="src/services/api.ts"
if [ -f "$API_FILE" ]; then
    CURRENT_URL=$(grep "BASE_URL" "$API_FILE" | head -1)
    print_info "Current API URL configuration:"
    echo "   $CURRENT_URL"
    
    if echo "$CURRENT_URL" | grep -q "your-worker-name\|your-username"; then
        print_warning "You need to update the API URL in $API_FILE"
        print_info "Replace with your actual Cloudflare Worker URL"
    else
        print_status "API URL appears to be configured"
    fi
else
    print_error "API configuration file not found"
fi

# Step 4: Start Development Server
echo -e "\n${BLUE}🚀 Step 4: Starting Development Server${NC}"
echo "======================================"

print_info "Starting Expo development server..."
print_info "After the QR code appears:"
print_info "1. Open Expo Go app on your phone"
print_info "2. Scan the QR code"
print_info "3. Wait for the app to load"

echo -e "\n${GREEN}📋 Quick Testing Checklist:${NC}"
echo "=========================="
echo "□ 1. App loads on phone"
echo "□ 2. Login screen appears"
echo "□ 3. Registration works"
echo "□ 4. Navigation between tabs"
echo "□ 5. API calls work (check for errors)"

echo -e "\n${YELLOW}📖 For detailed testing instructions, see:${NC}"
echo "   📄 TESTING_GUIDE.md"
echo "   📄 frontend/README.md"

echo -e "\n${GREEN}🎯 Ready to start? Press Enter to launch Expo...${NC}"
read -r

# Start Expo
print_status "Starting Expo development server..."
npm start 