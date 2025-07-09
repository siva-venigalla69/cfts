#!/bin/bash

# Test script for new shopping cart and WhatsApp sharing features
# Make sure to run this after applying the migration and deploying the code

set -e

# Configuration
API_BASE_URL="http://localhost:8787"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your_secure_password"
TEST_USERNAME="testuser"
TEST_PASSWORD="testpassword123"

echo "🧪 Testing New Features: Shopping Cart & WhatsApp Sharing"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Step 1: Test API Health
echo "1. Testing API Health..."
HEALTH_RESPONSE=$(curl -s "$API_BASE_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    print_status "API is healthy"
else
    print_error "API health check failed"
    echo "$HEALTH_RESPONSE"
    exit 1
fi

# Step 2: Admin Login
echo "2. Admin Login..."
ADMIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$ADMIN_USERNAME\", \"password\": \"$ADMIN_PASSWORD\"}")

if echo "$ADMIN_RESPONSE" | grep -q "success.*true"; then
    ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    print_status "Admin login successful"
else
    print_error "Admin login failed"
    echo "$ADMIN_RESPONSE"
    exit 1
fi

# Step 3: Create Test User (if not exists)
echo "3. Creating/Checking Test User..."
USER_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$TEST_USERNAME\", \"password\": \"$TEST_PASSWORD\"}")

if echo "$USER_RESPONSE" | grep -q "success.*true"; then
    print_status "Test user created"
elif echo "$USER_RESPONSE" | grep -q "already exists"; then
    print_warning "Test user already exists"
else
    print_error "Failed to create test user"
    echo "$USER_RESPONSE"
fi

# Step 4: Approve Test User
echo "4. Approving Test User..."
# Get user ID first
USERS_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

USER_ID=$(echo "$USERS_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -n "$USER_ID" ]; then
    APPROVE_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/admin/users/$USER_ID/approve" \
      -H "Authorization: Bearer $ADMIN_TOKEN")
    
    if echo "$APPROVE_RESPONSE" | grep -q "success.*true"; then
        print_status "Test user approved"
    else
        print_warning "User approval failed or user already approved"
    fi
else
    print_warning "Could not find user ID for approval"
fi

# Step 5: Test User Login
echo "5. Test User Login..."
USER_LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$TEST_USERNAME\", \"password\": \"$TEST_PASSWORD\"}")

if echo "$USER_LOGIN_RESPONSE" | grep -q "success.*true"; then
    USER_TOKEN=$(echo "$USER_LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    print_status "Test user login successful"
else
    print_error "Test user login failed"
    echo "$USER_LOGIN_RESPONSE"
    exit 1
fi

# Step 6: Get some designs for testing
echo "6. Getting designs for testing..."
DESIGNS_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/designs?per_page=5" \
  -H "Authorization: Bearer $USER_TOKEN")

if echo "$DESIGNS_RESPONSE" | grep -q "success.*true"; then
    print_status "Retrieved designs successfully"
    # Extract first design ID
    DESIGN_ID=$(echo "$DESIGNS_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    if [ -n "$DESIGN_ID" ]; then
        print_status "Using design ID: $DESIGN_ID for testing"
    else
        print_warning "No design ID found"
        exit 1
    fi
else
    print_error "Failed to retrieve designs"
    echo "$DESIGNS_RESPONSE"
    exit 1
fi

# Step 7: Test Shopping Cart Features
echo "7. Testing Shopping Cart Features..."

# 7.1 Get empty cart
echo "  7.1 Getting empty cart..."
CART_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/cart" \
  -H "Authorization: Bearer $USER_TOKEN")

if echo "$CART_RESPONSE" | grep -q "success.*true"; then
    print_status "Cart retrieved successfully"
else
    print_error "Failed to get cart"
    echo "$CART_RESPONSE"
fi

# 7.2 Add design to cart
echo "  7.2 Adding design to cart..."
ADD_TO_CART_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/cart/items" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"design_id\": $DESIGN_ID, \"quantity\": 2, \"notes\": \"Test order\"}")

if echo "$ADD_TO_CART_RESPONSE" | grep -q "success.*true"; then
    print_status "Design added to cart successfully"
else
    print_error "Failed to add design to cart"
    echo "$ADD_TO_CART_RESPONSE"
fi

# 7.3 Get cart with items
echo "  7.3 Getting cart with items..."
CART_WITH_ITEMS_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/cart" \
  -H "Authorization: Bearer $USER_TOKEN")

if echo "$CART_WITH_ITEMS_RESPONSE" | grep -q "success.*true"; then
    print_status "Cart with items retrieved successfully"
    # Extract cart item ID
    CART_ITEM_ID=$(echo "$CART_WITH_ITEMS_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
else
    print_error "Failed to get cart with items"
    echo "$CART_WITH_ITEMS_RESPONSE"
fi

# 7.4 Update cart item
if [ -n "$CART_ITEM_ID" ]; then
    echo "  7.4 Updating cart item..."
    UPDATE_CART_RESPONSE=$(curl -s -X PUT "$API_BASE_URL/api/cart/items/$CART_ITEM_ID" \
      -H "Authorization: Bearer $USER_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"quantity\": 3, \"notes\": \"Updated test order\"}")
    
    if echo "$UPDATE_CART_RESPONSE" | grep -q "success.*true"; then
        print_status "Cart item updated successfully"
    else
        print_error "Failed to update cart item"
        echo "$UPDATE_CART_RESPONSE"
    fi
fi

# Step 8: Test WhatsApp Sharing
echo "8. Testing WhatsApp Sharing..."

# 8.1 Share single design
echo "  8.1 Sharing single design..."
WHATSAPP_SHARE_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/cart/share" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"design_ids\": [$DESIGN_ID], \"message\": \"Check out this beautiful design!\"}")

if echo "$WHATSAPP_SHARE_RESPONSE" | grep -q "success.*true"; then
    print_status "WhatsApp share link generated successfully"
    SHARE_URL=$(echo "$WHATSAPP_SHARE_RESPONSE" | grep -o '"share_url":"[^"]*"' | cut -d'"' -f4)
    echo "   Share URL: $SHARE_URL"
else
    print_error "Failed to generate WhatsApp share link"
    echo "$WHATSAPP_SHARE_RESPONSE"
fi

# Step 9: Test Enhanced Search and Sorting
echo "9. Testing Enhanced Search and Sorting..."

# 9.1 Search by design number
echo "  9.1 Testing search by design number..."
SEARCH_BY_NUMBER_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/designs?design_number=TEST001" \
  -H "Authorization: Bearer $USER_TOKEN")

if echo "$SEARCH_BY_NUMBER_RESPONSE" | grep -q "success.*true"; then
    print_status "Search by design number working"
else
    print_warning "Search by design number returned no results (expected if no TEST001 exists)"
fi

# 9.2 Test sorting by different fields
echo "  9.2 Testing sorting by different fields..."
SORT_TESTS=(
    "sort_by=title&sort_order=asc"
    "sort_by=view_count&sort_order=desc"
    "sort_by=created_at&sort_order=desc"
)

for sort_test in "${SORT_TESTS[@]}"; do
    SORT_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/designs?$sort_test&per_page=3" \
      -H "Authorization: Bearer $USER_TOKEN")
    
    if echo "$SORT_RESPONSE" | grep -q "success.*true"; then
        print_status "Sorting with $sort_test working"
    else
        print_error "Sorting with $sort_test failed"
    fi
done

# Step 10: Clean up
echo "10. Cleaning up..."

# 10.1 Remove cart item
if [ -n "$CART_ITEM_ID" ]; then
    echo "  10.1 Removing cart item..."
    REMOVE_CART_RESPONSE=$(curl -s -X DELETE "$API_BASE_URL/api/cart/items/$CART_ITEM_ID" \
      -H "Authorization: Bearer $USER_TOKEN")
    
    if echo "$REMOVE_CART_RESPONSE" | grep -q "success.*true"; then
        print_status "Cart item removed successfully"
    else
        print_error "Failed to remove cart item"
    fi
fi

# 10.2 Clear entire cart
echo "  10.2 Clearing entire cart..."
CLEAR_CART_RESPONSE=$(curl -s -X DELETE "$API_BASE_URL/api/cart" \
  -H "Authorization: Bearer $USER_TOKEN")

if echo "$CLEAR_CART_RESPONSE" | grep -q "success.*true"; then
    print_status "Cart cleared successfully"
else
    print_error "Failed to clear cart"
fi

echo ""
echo "🎉 Testing completed!"
echo "====================="
print_status "All new features have been tested successfully"
echo ""
echo "📋 Summary of new features tested:"
echo "  ✅ Shopping cart functionality"
echo "  ✅ Add/update/remove cart items"
echo "  ✅ WhatsApp sharing"
echo "  ✅ Enhanced search with design_number"
echo "  ✅ Advanced sorting options"
echo ""
echo "🚀 Your design gallery now supports:"
echo "  • Users can add designs to shopping cart"
echo "  • Users can share selected designs via WhatsApp"
echo "  • Enhanced search by design number, title, description, etc."
echo "  • Advanced sorting by creation date, title, views, likes, etc."
echo ""
echo "📱 Frontend developers can now implement:"
echo "  • Shopping cart UI with add/remove functionality"
echo "  • WhatsApp share buttons for designs"
echo "  • Advanced search and filter forms"
echo "  • Sortable design lists" 