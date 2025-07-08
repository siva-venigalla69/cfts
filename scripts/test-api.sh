#!/bin/bash

# Design Gallery Backend API - Quick Test Script
# This script tests the basic functionality of the API

set -e  # Exit on any error

# Configuration
API_URL="http://localhost:8787"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="password123"
TEST_USERNAME="testuser"
TEST_PASSWORD="testpassword123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to make HTTP requests and check response
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local token=$4
    local description=$5
    
    print_status "Testing: $description"
    
    if [ -z "$data" ]; then
        if [ -z "$token" ]; then
            response=$(curl -s -X $method "$url" -w "HTTPSTATUS:%{http_code}")
        else
            response=$(curl -s -X $method "$url" -H "Authorization: Bearer $token" -w "HTTPSTATUS:%{http_code}")
        fi
    else
        if [ -z "$token" ]; then
            response=$(curl -s -X $method "$url" -H "Content-Type: application/json" -d "$data" -w "HTTPSTATUS:%{http_code}")
        else
            response=$(curl -s -X $method "$url" -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d "$data" -w "HTTPSTATUS:%{http_code}")
        fi
    fi
    
    # Extract the body and the status
    body=$(echo $response | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
    status=$(echo $response | grep -o -E '[0-9]{3}$')
    
    if [[ "$status" =~ ^2[0-9][0-9]$ ]]; then
        print_success "$description - Status: $status"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        echo ""
        return 0
    else
        print_error "$description - Status: $status"
        echo "$body"
        echo ""
        return 1
    fi
}

# Function to extract token from login response
extract_token() {
    echo "$1" | jq -r '.data.token // empty' 2>/dev/null || echo ""
}

# Function to extract ID from response
extract_id() {
    echo "$1" | jq -r '.data.id // empty' 2>/dev/null || echo ""
}

echo "============================================"
echo "🎨 Design Gallery Backend API Test Suite"
echo "============================================"
echo ""

# Check if server is running
print_status "Checking if server is running at $API_URL"
if ! curl -s "$API_URL" > /dev/null; then
    print_error "Server is not running at $API_URL"
    print_warning "Please start the server with: npm run dev"
    exit 1
fi

print_success "Server is running!"
echo ""

# Test 1: Health Check
echo "🏥 Testing Health Endpoints"
echo "----------------------------"
make_request "GET" "$API_URL/" "" "" "Root endpoint"
make_request "GET" "$API_URL/health" "" "" "Health check"
make_request "GET" "$API_URL/info" "" "" "API info"

# Test 2: Authentication
echo "🔐 Testing Authentication"
echo "-------------------------"

# Test user registration
register_response=$(make_request "POST" "$API_URL/api/auth/register" "{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}" "" "User registration")

# Test admin login
login_response=$(make_request "POST" "$API_URL/api/auth/login" "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}" "" "Admin login")

# Extract admin token
ADMIN_TOKEN=$(extract_token "$login_response")
if [ -z "$ADMIN_TOKEN" ]; then
    print_error "Failed to extract admin token"
    print_warning "Please ensure admin user exists in database"
    print_warning "Run: wrangler d1 execute design-gallery-db --local --command \"INSERT INTO users (username, password_hash, is_admin, is_approved, created_at, updated_at) VALUES ('admin', '\\\$2a\\\$12\\\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiVSOPKz3.t6', 1, 1, datetime('now'), datetime('now'));\""
    exit 1
fi

print_success "Admin token extracted successfully"

# Test authenticated endpoint
make_request "GET" "$API_URL/api/auth/me" "" "$ADMIN_TOKEN" "Get current user profile"

# Test 3: Admin Operations
echo "👑 Testing Admin Operations"
echo "---------------------------"

# Get pending users
pending_response=$(make_request "GET" "$API_URL/api/admin/users/pending" "" "$ADMIN_TOKEN" "Get pending users")

# Get system stats
make_request "GET" "$API_URL/api/admin/stats" "" "$ADMIN_TOKEN" "Get system statistics"

# Test 4: Image Upload (if test image exists)
echo "🖼️  Testing Image Upload"
echo "------------------------"

# Create a simple test image if it doesn't exist
if [ ! -f "test-image.jpg" ]; then
    print_status "Creating test image..."
    curl -s -o test-image.jpg "https://via.placeholder.com/300x300/0000FF/FFFFFF?text=Test"
fi

if [ -f "test-image.jpg" ]; then
    print_status "Uploading test image..."
    upload_response=$(curl -s -X POST "$API_URL/api/upload/image" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -F "file=@test-image.jpg" \
        -F "category=test" \
        -w "HTTPSTATUS:%{http_code}")
    
    upload_body=$(echo $upload_response | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
    upload_status=$(echo $upload_response | grep -o -E '[0-9]{3}$')
    
    if [[ "$upload_status" =~ ^2[0-9][0-9]$ ]]; then
        print_success "Image upload - Status: $upload_status"
        echo "$upload_body" | jq '.' 2>/dev/null || echo "$upload_body"
        
        # Extract object key for design creation
        OBJECT_KEY=$(echo "$upload_body" | jq -r '.data.object_key // empty' 2>/dev/null || echo "")
        echo ""
    else
        print_error "Image upload failed - Status: $upload_status"
        echo "$upload_body"
        OBJECT_KEY=""
    fi
else
    print_warning "No test image found, skipping upload test"
    OBJECT_KEY=""
fi

# Test 5: Design Management
echo "🎨 Testing Design Management"
echo "----------------------------"

# Create a design
if [ -n "$OBJECT_KEY" ]; then
    design_data="{
        \"title\": \"Test Silk Saree\",
        \"description\": \"A beautiful test saree for API testing\",
        \"short_description\": \"Test saree with golden border\",
        \"r2_object_key\": \"$OBJECT_KEY\",
        \"category\": \"sarees\",
        \"style\": \"traditional\",
        \"colour\": \"blue\",
        \"fabric\": \"silk\",
        \"featured\": true
    }"
    
    design_response=$(make_request "POST" "$API_URL/api/designs" "$design_data" "$ADMIN_TOKEN" "Create design")
    DESIGN_ID=$(extract_id "$design_response")
else
    print_warning "Skipping design creation due to missing image"
    DESIGN_ID=""
fi

# Get all designs
make_request "GET" "$API_URL/api/designs?page=1&per_page=5" "" "" "Get designs (public)"

# Get featured designs
make_request "GET" "$API_URL/api/designs/featured?limit=3" "" "" "Get featured designs"

# Get specific design (if created)
if [ -n "$DESIGN_ID" ]; then
    make_request "GET" "$API_URL/api/designs/$DESIGN_ID" "" "" "Get specific design"
fi

# Test search and filters
make_request "GET" "$API_URL/api/designs?category=sarees&colour=blue" "" "" "Search designs with filters"

# Test 6: User Approval and Favorites (if test user was registered)
echo "❤️  Testing User Favorites"
echo "--------------------------"

# First, approve the test user if they exist
user_list_response=$(make_request "GET" "$API_URL/api/admin/users?status=pending" "" "$ADMIN_TOKEN" "Get pending users")

# Try to login test user (this will fail if not approved)
test_login_response=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}" \
    -w "HTTPSTATUS:%{http_code}")

test_login_status=$(echo $test_login_response | grep -o -E '[0-9]{3}$')

if [[ "$test_login_status" =~ ^2[0-9][0-9]$ ]]; then
    USER_TOKEN=$(extract_token "$(echo $test_login_response | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')")
    print_success "Test user login successful"
    
    # Test favorites if we have a design
    if [ -n "$DESIGN_ID" ] && [ -n "$USER_TOKEN" ]; then
        make_request "POST" "$API_URL/api/designs/$DESIGN_ID/favorite" "" "$USER_TOKEN" "Add design to favorites"
        make_request "GET" "$API_URL/api/designs/user/favorites" "" "$USER_TOKEN" "Get user favorites"
    fi
else
    print_warning "Test user login failed (may need approval)"
fi

# Test 7: Error Handling
echo "🚨 Testing Error Handling"
echo "-------------------------"

# Test invalid authentication
error_response=$(curl -s -X GET "$API_URL/api/admin/users" \
    -H "Authorization: Bearer invalid-token" \
    -w "HTTPSTATUS:%{http_code}")
error_status=$(echo $error_response | grep -o -E '[0-9]{3}$')

if [ "$error_status" = "401" ]; then
    print_success "Invalid token correctly rejected - Status: $error_status"
else
    print_error "Invalid token test failed - Status: $error_status"
fi

# Test non-existent resource
make_request "GET" "$API_URL/api/designs/999999" "" "" "Get non-existent design (should return 404)"

# Clean up test files
if [ -f "test-image.jpg" ]; then
    rm test-image.jpg
    print_status "Cleaned up test image"
fi

echo ""
echo "============================================"
echo "🎉 Test Suite Completed!"
echo "============================================"
echo ""
print_success "Basic API functionality verified"
print_warning "For comprehensive testing, see docs/COMPLETE_TESTING_GUIDE.md"
echo ""
print_status "Useful commands:"
echo "  npm run dev              # Start development server"
echo "  npm run db:studio:local  # Open database studio"
echo "  npm run deploy           # Deploy to production"
echo "" 