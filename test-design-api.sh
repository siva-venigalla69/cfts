#!/bin/bash

# Set API base URL
export API_BASE_URL="https://design-gallery-backend.shiva-venigalla.workers.dev"

echo "🧪 Testing Design API Fixes"
echo "=========================="

# 1. Login as admin
echo "1. Logging in as admin..."
ADMIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

if [[ $? -ne 0 ]]; then
  echo "❌ Login failed"
  exit 1
fi

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.data.access_token')
if [[ "$ADMIN_TOKEN" == "null" || -z "$ADMIN_TOKEN" ]]; then
  echo "❌ Failed to get admin token"
  echo "Response: $ADMIN_RESPONSE"
  exit 1
fi

echo "✅ Admin login successful"
echo "Token: ${ADMIN_TOKEN:0:20}..."

# 2. Test creating design with D003 design number
echo ""
echo "2. Creating design with design_number 'D003'..."
CREATE_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/designs" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Beautiful Lehenga",
    "description": "A stunning test lehenga for API testing",
    "short_description": "Beautiful test lehenga",
    "long_description": "This is a comprehensive test lehenga design created for API validation purposes. It features exquisite craftsmanship and attention to detail.",
    "r2_object_key": "Sarees/D003.jpeg",
    "design_number": "D003",
    "category": "lehenga",
    "style": "Contemporary",
    "colour": "Royal Blue",
    "fabric": "Silk",
    "occasion": "Wedding",
    "size_available": "S, M, L, XL",
    "price_range": "₹25,000 - ₹35,000",
    "tags": "test,api,lehenga,contemporary,blue",
    "featured": true,
    "designer_name": "Test Designer",
    "collection_name": "API Test Collection",
    "season": "All Season"
  }')

echo "Create Response:"
echo "$CREATE_RESPONSE" | jq

# Extract design ID
DESIGN_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id // empty')
SUCCESS=$(echo "$CREATE_RESPONSE" | jq -r '.success')

if [[ "$SUCCESS" == "true" && -n "$DESIGN_ID" ]]; then
  echo "✅ Design created successfully with ID: $DESIGN_ID"
else
  echo "❌ Design creation failed"
  exit 1
fi

# 3. Test searching by design number
echo ""
echo "3. Searching for design by design_number 'D003'..."
SEARCH_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/designs?design_number=D003" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "Search Response:"
echo "$SEARCH_RESPONSE" | jq

# Check if we found exactly one design
FOUND_COUNT=$(echo "$SEARCH_RESPONSE" | jq -r '.data.total // 0')
FOUND_DESIGN_NUMBER=$(echo "$SEARCH_RESPONSE" | jq -r '.data.designs[0].design_number // empty')

if [[ "$FOUND_COUNT" == "1" && "$FOUND_DESIGN_NUMBER" == "D003" ]]; then
  echo "✅ Search by design_number working correctly! Found 1 design with number D003"
else
  echo "❌ Search by design_number failed. Found $FOUND_COUNT designs"
fi

# 4. Test general search for 'D003'
echo ""
echo "4. Testing general search for 'D003'..."
GENERAL_SEARCH=$(curl -s -X GET "$API_BASE_URL/api/designs?q=D003" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "General Search Response:"
echo "$GENERAL_SEARCH" | jq '.data.designs[].design_number'

# 5. Get the created design by ID to verify design_number was saved
echo ""
echo "5. Fetching created design by ID to verify design_number..."
GET_DESIGN=$(curl -s -X GET "$API_BASE_URL/api/designs/$DESIGN_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

SAVED_DESIGN_NUMBER=$(echo "$GET_DESIGN" | jq -r '.data.design_number // "null"')
echo "Saved design_number: $SAVED_DESIGN_NUMBER"

if [[ "$SAVED_DESIGN_NUMBER" == "D003" ]]; then
  echo "✅ Design number saved correctly in database!"
else
  echo "❌ Design number not saved correctly. Got: $SAVED_DESIGN_NUMBER"
fi

echo ""
echo "🎯 Test Summary:"
echo "==============="
if [[ "$SUCCESS" == "true" && "$FOUND_COUNT" == "1" && "$SAVED_DESIGN_NUMBER" == "D003" ]]; then
  echo "✅ All tests passed! Design creation and search are working correctly."
else
  echo "❌ Some tests failed. Check the output above."
fi 