#!/bin/bash

# 🚀 Remote Cloudflare Testing Setup Script
echo "🚀 Setting up remote Cloudflare testing environment..."

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

# 1. Remove local database state
print_status "Removing local database state..."
rm -rf .wrangler/state
print_status "Local state removed - now using remote services only"

# 2. Deploy to development environment
print_status "Deploying to development environment..."
if wrangler deploy; then
    print_status "✅ Deployment successful!"
    
    # Get deployment URL
    print_info "Getting deployment URL..."
    DEPLOYMENT_URL=$(wrangler deployments list --json | jq -r '.[0].url' 2>/dev/null || echo "")
    
    if [ -n "$DEPLOYMENT_URL" ]; then
        print_status "🌐 Your API is live at: $DEPLOYMENT_URL"
        echo "export API_BASE_URL=\"$DEPLOYMENT_URL\"" > .env.testing
        print_info "API URL saved to .env.testing"
    else
        print_warning "Could not retrieve deployment URL automatically"
        print_info "You can get it manually with: wrangler deployments list"
    fi
else
    print_error "Deployment failed. Please check the errors above."
    exit 1
fi

# 3. Apply database migrations
print_status "Applying database migrations to remote database..."
if wrangler d1 migrations apply design-gallery-db --remote; then
    print_status "Database migrations applied successfully"
else
    print_warning "Database migrations may have failed or already applied"
fi

# 4. Create admin user
print_status "Creating admin user in remote database..."
ADMIN_SQL="INSERT OR IGNORE INTO users (username, password_hash, is_admin, is_approved, created_at, updated_at) 
VALUES (
  'admin', 
  '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiVSOPKz3.t6', 
  1, 
  1, 
  datetime('now'), 
  datetime('now')
);"

if wrangler d1 execute design-gallery-db --remote --command "$ADMIN_SQL"; then
    print_status "Admin user created successfully"
    print_info "Username: admin"
    print_info "Password: password123"
else
    print_warning "Admin user creation may have failed or user already exists"
fi

# 5. Test health endpoint
print_status "Testing API health..."
if [ -n "$DEPLOYMENT_URL" ]; then
    if curl -s "$DEPLOYMENT_URL/health" | grep -q "healthy"; then
        print_status "API health check passed!"
    else
        print_warning "API health check failed or returned unexpected response"
        print_info "Try: curl $DEPLOYMENT_URL/health"
    fi
fi

# 6. Create test script
print_status "Creating test script..."
cat > test-api.sh << 'EOF'
#!/bin/bash

# Load environment variables
if [ -f .env.testing ]; then
    source .env.testing
else
    echo "❌ .env.testing file not found. Run setup-remote-testing.sh first."
    exit 1
fi

echo "🧪 Testing API at: $API_BASE_URL"

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s "$API_BASE_URL/health" | jq .

echo -e "\n2. Testing admin login..."
ADMIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}')

echo $ADMIN_RESPONSE | jq .

# Extract token if login successful
if echo $ADMIN_RESPONSE | jq -e '.success' > /dev/null; then
    ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | jq -r '.data.access_token')
    echo "✅ Admin login successful!"
    echo "Token: ${ADMIN_TOKEN:0:20}..."
    
    echo -e "\n3. Testing authenticated endpoint..."
    curl -s -X GET "$API_BASE_URL/api/auth/me" \
      -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
      
    echo -e "\n4. Testing designs endpoint..."
    curl -s "$API_BASE_URL/api/designs" | jq .
else
    echo "❌ Admin login failed"
fi

echo -e "\n✅ Basic API tests completed!"
EOF

chmod +x test-api.sh
print_status "Test script created: ./test-api.sh"

# 7. Summary
echo ""
echo "🎉 Remote testing setup complete!"
echo ""
print_info "Next steps:"
echo "  1. Run: ./test-api.sh (to test your API)"
echo "  2. Check: docs/API_TESTING_GUIDE.md (for comprehensive testing)"
echo "  3. Monitor: wrangler tail (to see real-time logs)"
echo ""
print_info "Your API endpoints:"
if [ -n "$DEPLOYMENT_URL" ]; then
    echo "  • Health: $DEPLOYMENT_URL/health"
    echo "  • Login: $DEPLOYMENT_URL/api/auth/login"
    echo "  • Designs: $DEPLOYMENT_URL/api/designs"
fi
echo ""
print_info "Admin credentials:"
echo "  • Username: admin"
echo "  • Password: password123"
echo ""
print_status "Happy testing! 🚀" 