# Design Gallery Backend - Complete API Testing Guide 🧪

This comprehensive guide provides curl commands and test procedures for **every endpoint** in the Design Gallery Backend API. Use this guide to systematically test all functionality.

## 📋 Table of Contents

1. [Quick Setup](#-quick-setup)
2. [Health & Info Endpoints](#-health--info-endpoints)
3. [Authentication API](#-authentication-api)
4. [Design Management API](#-design-management-api)
5. [Admin Management API](#-admin-management-api)
6. [File Upload API](#-file-upload-api)
7. [Shopping Cart API](#-shopping-cart-api)
8. [Testing Scenarios](#-testing-scenarios)
9. [Error Testing](#-error-testing)
10. [Performance Testing](#-performance-testing)

---

## ⚡ Quick Setup

### Environment Variables
```bash
# Set your API base URL
export API_BASE_URL="http://localhost:8787"  # Local development
# OR
export API_BASE_URL="https://your-worker.your-subdomain.workers.dev"  # Production

# Test credentials (update as needed)
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="admin123"
export TEST_USERNAME="testuser_$(date +%s)"
export TEST_PASSWORD="testpass123"
```

### Authentication Tokens (will be set during testing)
```bash
export ADMIN_TOKEN=""
export USER_TOKEN=""
```

---

## 🏥 Health & Info Endpoints

### 1. Root Endpoint
```bash
curl -X GET "$API_BASE_URL/" \
  -H "Content-Type: application/json" | jq
```

**Expected Response:**
```json
{
  "success": true,
  "message": "API is running successfully",
  "data": {
    "message": "Design Gallery API",
    "version": "1.0.0",
    "environment": "development",
    "status": "running",
    "features": {
      "authentication": true,
      "design_management": true,
      "r2_storage": true,
      "admin_panel": true,
      "user_favorites": true,
      "search_and_filters": true,
      "shopping_cart": true,
      "whatsapp_sharing": true
    }
  }
}
```

### 2. Health Check
```bash
curl -X GET "$API_BASE_URL/health" \
  -H "Content-Type: application/json" | jq
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Health check completed",
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "services": {
      "database": "healthy",
      "r2_storage": "healthy"
    },
    "environment": "development"
  }
}
```

### 3. API Information
```bash
curl -X GET "$API_BASE_URL/info" \
  -H "Content-Type: application/json" | jq
```

### 4. Simple Test Endpoint
```bash
curl -X GET "$API_BASE_URL/test" \
  -H "Content-Type: application/json" | jq
```

---

## 🔐 Authentication API

### 1. User Registration

**Register a new user:**
```bash
curl -X POST "$API_BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USERNAME\",
    \"password\": \"$TEST_PASSWORD\"
  }" | jq
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Registration successful! Please wait for admin approval.",
  "data": {
    "id": 3,
    "username": "testuser_1705312345",
    "is_admin": false,
    "is_approved": false,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Test registration validation:**
```bash
# Short username (should fail)
curl -X POST "$API_BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ab",
    "password": "testpass123"
  }' | jq

# Short password (should fail)
curl -X POST "$API_BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "validuser",
    "password": "123"
  }' | jq

# Duplicate username (should fail)
curl -X POST "$API_BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USERNAME\",
    \"password\": \"anotherpass123\"
  }" | jq
```

### 2. User Login

**Login as admin:**
```bash
ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$ADMIN_USERNAME\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

echo "$ADMIN_LOGIN_RESPONSE" | jq

# Extract admin token
export ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESPONSE" | jq -r '.data.access_token')
echo "Admin Token: ${ADMIN_TOKEN:0:20}..."
```

**Try login with unapproved user (should fail):**
```bash
curl -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USERNAME\",
    \"password\": \"$TEST_PASSWORD\"
  }" | jq
```

**Test login validation:**
```bash
# Invalid credentials
curl -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nonexistent",
    "password": "wrongpass"
  }' | jq

# Missing password
curl -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser"
  }' | jq
```

### 3. Get Current User Profile

```bash
curl -X GET "$API_BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 4. Token Validation

```bash
curl -X GET "$API_BASE_URL/api/auth/check" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 5. Token Refresh

```bash
curl -X POST "$API_BASE_URL/api/auth/refresh" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 6. Logout

```bash
curl -X POST "$API_BASE_URL/api/auth/logout" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

---

## 🎨 Design Management API

### 1. Get All Designs

**Basic design listing:**
```bash
curl -X GET "$API_BASE_URL/api/designs" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

**With pagination:**
```bash
curl -X GET "$API_BASE_URL/api/designs?page=1&per_page=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

**With filters:**
```bash
# Filter by category
curl -X GET "$API_BASE_URL/api/designs?category=sarees" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq

# Filter by style
curl -X GET "$API_BASE_URL/api/designs?style=Traditional" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq

# Filter by color
curl -X GET "$API_BASE_URL/api/designs?colour=Red" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq

# Multiple filters
curl -X GET "$API_BASE_URL/api/designs?category=sarees&style=Traditional&featured=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

**With search:**
```bash
# Text search
curl -X GET "$API_BASE_URL/api/designs?q=royal%20blue" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq

# Search by design number
curl -X GET "$API_BASE_URL/api/designs?design_number=D003" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

**With sorting:**
```bash
# Sort by title ascending
curl -X GET "$API_BASE_URL/api/designs?sort_by=title&sort_order=asc" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq

# Sort by view count descending
curl -X GET "$API_BASE_URL/api/designs?sort_by=view_count&sort_order=desc" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 2. Get Featured Designs

```bash
curl -X GET "$API_BASE_URL/api/designs/featured" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq

# With limit
curl -X GET "$API_BASE_URL/api/designs/featured?limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 3. Get Single Design

```bash
# Get design by ID (replace 1 with actual design ID)
curl -X GET "$API_BASE_URL/api/designs/1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 4. Create New Design (Admin Only)

```bash
curl -X POST "$API_BASE_URL/api/designs" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Beautiful Lehenga",
    "description": "A stunning test lehenga for API testing",
    "short_description": "Beautiful test lehenga",
    "long_description": "This is a comprehensive test lehenga design created for API validation purposes. It features exquisite craftsmanship and attention to detail.",
    "r2_object_key": "designs/test/test-lehenga-001.jpg",
    "design_number": "TEST-001",
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
  }' | jq
```

### 5. Update Design (Admin Only)

```bash
# Update design (replace 1 with actual design ID)
curl -X PUT "$API_BASE_URL/api/designs/1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "short_description": "Updated beautiful test lehenga",
    "featured": false,
    "price_range": "₹30,000 - ₹40,000"
  }' | jq
```

### 6. Delete Design (Admin Only)

```bash
# Delete design (replace 1 with actual design ID)
curl -X DELETE "$API_BASE_URL/api/designs/2" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 7. Multiple Images Management

**Get all images for a design:**
```bash
# Get all images for a specific design (replace 1 with actual design ID)
curl -X GET "$API_BASE_URL/api/designs/1/images" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Design images retrieved successfully",
  "data": {
    "design_id": 1,
    "images": [
      {
        "id": 1,
        "design_id": 1,
        "image_url": "https://your-domain.com/designs/2024/01/image1.jpg",
        "r2_object_key": "designs/2024/01/image1.jpg",
        "image_order": 0,
        "is_primary": true,
        "alt_text": "Main view of the design",
        "caption": "Beautiful royal blue saree",
        "image_type": "standard",
        "file_size": 856432,
        "width": 1920,
        "height": 1080,
        "content_type": "image/jpeg",
        "uploaded_by": "admin",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      },
      {
        "id": 2,
        "design_id": 1,
        "image_url": "https://your-domain.com/designs/2024/01/image2.jpg",
        "r2_object_key": "designs/2024/01/image2.jpg",
        "image_order": 1,
        "is_primary": false,
        "alt_text": "Detail view",
        "caption": "Close-up of embroidery work",
        "image_type": "detail",
        "file_size": 642108,
        "width": 1920,
        "height": 1080,
        "content_type": "image/jpeg",
        "uploaded_by": "admin",
        "created_at": "2024-01-15T10:35:00Z",
        "updated_at": "2024-01-15T10:35:00Z"
      }
    ],
    "total_images": 2
  }
}
```

**Add image to design:**
```bash
# First upload an image to R2
curl -X POST "$API_BASE_URL/api/upload/image" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@test-image2.jpg" \
  -F "category=designs" | jq

# Extract the object_key from response, then add to design
curl -X POST "$API_BASE_URL/api/designs/1/images" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "r2_object_key": "designs/2024/01/20240115_abcd1234.jpg",
    "image_order": 2,
    "is_primary": false,
    "alt_text": "Side view of the design",
    "caption": "Beautiful draping style",
    "image_type": "standard",
    "width": 1920,
    "height": 1080
  }' | jq
```

**Update design image:**
```bash
# Update image metadata (replace 1 and 2 with actual design and image IDs)
curl -X PUT "$API_BASE_URL/api/designs/1/images/2" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alt_text": "Updated alt text",
    "caption": "Updated caption",
    "image_order": 1
  }' | jq
```

**Set primary image:**
```bash
# Set a specific image as primary for the design
curl -X POST "$API_BASE_URL/api/designs/1/images/2/set-primary" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

**Reorder design images:**
```bash
# Reorder multiple images at once
curl -X PUT "$API_BASE_URL/api/designs/1/images/reorder" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "image_orders": [
      {"image_id": 2, "order": 0},
      {"image_id": 1, "order": 1},
      {"image_id": 3, "order": 2}
    ]
  }' | jq
```

**Delete design image:**
```bash
# Delete a specific image from design
curl -X DELETE "$API_BASE_URL/api/designs/1/images/2" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 8. Favorites Management

**Add to favorites:**
```bash
# Add design to favorites (replace 1 with actual design ID)
curl -X POST "$API_BASE_URL/api/designs/1/favorite" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" | jq
```

**Remove from favorites:**
```bash
# Remove design from favorites (replace 1 with actual design ID)
curl -X DELETE "$API_BASE_URL/api/designs/1/favorite" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" | jq
```

**Get user favorites:**
```bash
curl -X GET "$API_BASE_URL/api/designs/user/favorites" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" | jq

# With pagination
curl -X GET "$API_BASE_URL/api/designs/user/favorites?page=1&per_page=10" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" | jq
```

---

## 👑 Admin Management API

### 1. Get All Users

```bash
# Get all users
curl -X GET "$API_BASE_URL/api/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq

# With pagination
curl -X GET "$API_BASE_URL/api/admin/users?page=1&per_page=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq

# Filter by status
curl -X GET "$API_BASE_URL/api/admin/users?status=pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq

curl -X GET "$API_BASE_URL/api/admin/users?status=approved" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 2. Get Pending Users

```bash
curl -X GET "$API_BASE_URL/api/admin/users/pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 3. User Approval Actions

**Approve user:**
```bash
# Get user ID from previous registration and approve
USER_ID=$(curl -s -X GET "$API_BASE_URL/api/admin/users/pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')

curl -X POST "$API_BASE_URL/api/admin/users/$USER_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq

curl -X POST "$API_BASE_URL/api/admin/users/"testuser"/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

**Reject user:**
```bash
# Reject user (replace USER_ID with actual ID)
curl -X POST "$API_BASE_URL/api/admin/users/$USER_ID/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

**Toggle admin status:**
```bash
# Toggle admin status (replace USER_ID with actual ID)
curl -X POST "$API_BASE_URL/api/admin/users/$USER_ID/toggle-admin" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

**Delete user:**
```bash
# Delete user (replace USER_ID with actual ID)
curl -X DELETE "$API_BASE_URL/api/admin/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 4. Bulk User Operations

**Bulk approve users:**
```bash
curl -X POST "$API_BASE_URL/api/admin/users/bulk-approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": [3, 4, 5]
  }' | jq
```

### 5. System Statistics

```bash
curl -X GET "$API_BASE_URL/api/admin/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 6. App Settings Management

**Get all settings:**
```bash
curl -X GET "$API_BASE_URL/api/admin/settings" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

**Create new setting:**
```bash
curl -X POST "$API_BASE_URL/api/admin/settings" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "test_setting",
    "value": "test_value",
    "description": "A test setting for API validation"
  }' | jq
```

**Update setting:**
```bash
curl -X PUT "$API_BASE_URL/api/admin/settings/test_setting" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "updated_test_value",
    "description": "Updated test setting description"
  }' | jq
```

**Delete setting:**
```bash
curl -X DELETE "$API_BASE_URL/api/admin/settings/test_setting" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

---

## 📁 File Upload API

### 1. R2 Storage Health Check

```bash
curl -X GET "$API_BASE_URL/api/upload/health" \
  -H "Content-Type: application/json" | jq
```

### 2. Upload Image

```bash
# Create a test image file first
echo "Creating test image..."
curl -o test-image.jpg "https://via.placeholder.com/800x600/0000FF/FFFFFF?text=Test+Design"

# Upload image
curl -X POST "$API_BASE_URL/api/upload/image" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@test-image.jpg" \
  -F "category=test" | jq

# Clean up
rm -f test-image.jpg
```

### 3. Get Presigned URL

```bash
curl -X GET "$API_BASE_URL/api/upload/presigned-url?filename=test-design.jpg&category=designs" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 4. List Images

```bash
# List all images
curl -X GET "$API_BASE_URL/api/upload/images" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq

# List with prefix filter
curl -X GET "$API_BASE_URL/api/upload/images?prefix=designs/&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 5. Get Image Info

```bash
# Get info for specific image (replace with actual object key)
curl -X GET "$API_BASE_URL/api/upload/image/designs/test/test-image.jpg/info" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 6. Batch Upload Images

```bash
# Upload multiple images at once
curl -X POST "$API_BASE_URL/api/upload/batch" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file0=@image1.jpg" \
  -F "file1=@image2.jpg" \
  -F "file2=@image3.jpg" \
  -F "category=designs" | jq
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Batch upload completed: 3 uploaded, 0 failed",
  "data": {
    "uploaded_images": [
      {
        "object_key": "designs/2024/01/20240115_123456.jpg",
        "public_url": "https://your-domain.com/designs/2024/01/20240115_123456.jpg",
        "message": "Image uploaded successfully",
        "success": true
      },
      {
        "object_key": "designs/2024/01/20240115_789012.jpg",
        "public_url": "https://your-domain.com/designs/2024/01/20240115_789012.jpg",
        "message": "Image uploaded successfully",
        "success": true
      },
      {
        "object_key": "designs/2024/01/20240115_345678.jpg",
        "public_url": "https://your-domain.com/designs/2024/01/20240115_345678.jpg",
        "message": "Image uploaded successfully",
        "success": true
      }
    ],
    "failed_uploads": [],
    "total_uploaded": 3,
    "total_failed": 0
  }
}
```

### 7. Upload Images Directly to Design

```bash
# Upload multiple images directly to a specific design
curl -X POST "$API_BASE_URL/api/upload/design/1/images" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file0=@main-view.jpg" \
  -F "file1=@detail-view.jpg" \
  -F "file2=@side-view.jpg" \
  -F "category=designs" | jq
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Design images upload completed: 3 uploaded, 0 failed",
  "data": {
    "uploaded_images": [
      {
        "object_key": "designs/2024/01/20240115_main.jpg",
        "public_url": "https://your-domain.com/designs/2024/01/20240115_main.jpg",
        "message": "Image uploaded and linked to design successfully",
        "success": true
      },
      {
        "object_key": "designs/2024/01/20240115_detail.jpg",
        "public_url": "https://your-domain.com/designs/2024/01/20240115_detail.jpg",
        "message": "Image uploaded and linked to design successfully",
        "success": true
      },
      {
        "object_key": "designs/2024/01/20240115_side.jpg",
        "public_url": "https://your-domain.com/designs/2024/01/20240115_side.jpg",
        "message": "Image uploaded and linked to design successfully",
        "success": true
      }
    ],
    "failed_uploads": [],
    "total_uploaded": 3,
    "total_failed": 0
  }
}
```

### 8. Delete Image

```bash
# Delete specific image (replace with actual object key)
curl -X DELETE "$API_BASE_URL/api/upload/image/designs/test/test-image.jpg" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq
```

---

## 🛒 Shopping Cart API

### 1. Get User Cart

```bash
curl -X GET "$API_BASE_URL/api/cart" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 2. Add Items to Cart

```bash
# Add design to cart (replace 1 with actual design ID)
curl -X POST "$API_BASE_URL/api/cart/items" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "design_id": 1,
    "quantity": 2,
    "notes": "Need in size M, urgent order"
  }' | jq

# Add another item
curl -X POST "$API_BASE_URL/api/cart/items" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "design_id": 2,
    "quantity": 1,
    "notes": "Custom color if possible"
  }' | jq
```

### 3. Update Cart Items

```bash
# Update cart item (replace 1 with actual cart item ID)
curl -X PUT "$API_BASE_URL/api/cart/items/1" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 3,
    "notes": "Updated requirements - need in size L"
  }' | jq
```

### 4. Remove Cart Items

```bash
# Remove specific cart item (replace 1 with actual cart item ID)
curl -X DELETE "$API_BASE_URL/api/cart/items/1" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 5. Clear Entire Cart

```bash
curl -X DELETE "$API_BASE_URL/api/cart" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 6. WhatsApp Sharing

```bash
# Share cart items via WhatsApp
curl -X POST "$API_BASE_URL/api/cart/share" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "design_ids": [1, 2, 3],
    "message": "Hi! I am interested in these beautiful designs from your gallery. Please provide more details and pricing information."
  }' | jq
```

---

## 🧪 Testing Scenarios

### Multiple Images Design Workflow Test

```bash
#!/bin/bash
echo "🖼️ Starting Multiple Images Design Workflow Test"

# 1. Upload multiple images to R2
echo "1. Uploading multiple images..."
BATCH_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/upload/batch" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file0=@test-image1.jpg" \
  -F "file1=@test-image2.jpg" \
  -F "file2=@test-image3.jpg" \
  -F "category=designs")

echo "Batch upload response:"
echo "$BATCH_RESPONSE" | jq

# Extract object keys from batch upload
OBJECT_KEY_1=$(echo "$BATCH_RESPONSE" | jq -r '.data.uploaded_images[0].object_key')
OBJECT_KEY_2=$(echo "$BATCH_RESPONSE" | jq -r '.data.uploaded_images[1].object_key')
OBJECT_KEY_3=$(echo "$BATCH_RESPONSE" | jq -r '.data.uploaded_images[2].object_key')

echo "Uploaded images:"
echo "Image 1: $OBJECT_KEY_1"
echo "Image 2: $OBJECT_KEY_2" 
echo "Image 3: $OBJECT_KEY_3"

# 2. Create design with first image
echo "2. Creating design with primary image..."
DESIGN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/designs" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Multi-Image Test Lehenga\",
    \"description\": \"A beautiful lehenga with multiple view angles\",
    \"short_description\": \"Test lehenga with gallery\",
    \"long_description\": \"This exquisite lehenga showcases traditional craftsmanship with modern elegance. Multiple images show different angles and details.\",
    \"r2_object_key\": \"$OBJECT_KEY_1\",
    \"category\": \"lehenga\",
    \"style\": \"Traditional\",
    \"colour\": \"Royal Blue\",
    \"fabric\": \"Silk\",
    \"occasion\": \"Wedding\",
    \"featured\": true
  }")

DESIGN_ID=$(echo "$DESIGN_RESPONSE" | jq -r '.data.id')
echo "Created design with ID: $DESIGN_ID"

# 3. Add additional images to the design
echo "3. Adding additional images to design..."
curl -s -X POST "$API_BASE_URL/api/designs/$DESIGN_ID/images" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"r2_object_key\": \"$OBJECT_KEY_2\",
    \"image_order\": 1,
    \"is_primary\": false,
    \"alt_text\": \"Detail view of embroidery\",
    \"caption\": \"Intricate golden threadwork\",
    \"image_type\": \"detail\"
  }" | jq -r '.message'

curl -s -X POST "$API_BASE_URL/api/designs/$DESIGN_ID/images" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"r2_object_key\": \"$OBJECT_KEY_3\",
    \"image_order\": 2,
    \"is_primary\": false,
    \"alt_text\": \"Back view of the lehenga\",
    \"caption\": \"Beautiful back design with tie details\",
    \"image_type\": \"variant\"
  }" | jq -r '.message'

# 4. Get all images for the design
echo "4. Retrieving all design images..."
IMAGES_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/designs/$DESIGN_ID/images" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
TOTAL_IMAGES=$(echo "$IMAGES_RESPONSE" | jq -r '.data.total_images')
echo "Design now has $TOTAL_IMAGES images"

# 5. Set a different primary image
echo "5. Changing primary image..."
SECOND_IMAGE_ID=$(echo "$IMAGES_RESPONSE" | jq -r '.data.images[1].id')
curl -s -X POST "$API_BASE_URL/api/designs/$DESIGN_ID/images/$SECOND_IMAGE_ID/set-primary" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.message'

# 6. Reorder images
echo "6. Reordering images..."
IMAGE_IDS=($(echo "$IMAGES_RESPONSE" | jq -r '.data.images[].id'))
curl -s -X PUT "$API_BASE_URL/api/designs/$DESIGN_ID/images/reorder" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"image_orders\": [
      {\"image_id\": ${IMAGE_IDS[2]}, \"order\": 0},
      {\"image_id\": ${IMAGE_IDS[0]}, \"order\": 1},
      {\"image_id\": ${IMAGE_IDS[1]}, \"order\": 2}
    ]
  }" | jq -r '.message'

# 7. Test direct upload to design
echo "7. Testing direct upload to design..."
curl -s -X POST "$API_BASE_URL/api/upload/design/$DESIGN_ID/images" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file0=@test-image4.jpg" \
  -F "category=designs" | jq -r '.message'

# 8. Final verification
echo "8. Final verification..."
FINAL_IMAGES=$(curl -s -X GET "$API_BASE_URL/api/designs/$DESIGN_ID/images" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
FINAL_COUNT=$(echo "$FINAL_IMAGES" | jq -r '.data.total_images')
PRIMARY_IMAGE=$(echo "$FINAL_IMAGES" | jq -r '.data.images[] | select(.is_primary == true) | .caption')

echo "✅ Multiple images test completed!"
echo "Final image count: $FINAL_COUNT"
echo "Primary image caption: $PRIMARY_IMAGE"
```

### Complete User Journey Test

```bash
#!/bin/bash
echo "🚀 Starting Complete User Journey Test"

# 1. Health Check
echo "1. Testing health endpoints..."
curl -s "$API_BASE_URL/health" | jq -r '.data.status'

# 2. Admin Login
echo "2. Admin login..."
ADMIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$ADMIN_USERNAME\", \"password\": \"$ADMIN_PASSWORD\"}")
export ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.data.access_token')

# 3. User Registration
echo "3. User registration..."
TEST_USER="testuser_$(date +%s)"
curl -s -X POST "$API_BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$TEST_USER\", \"password\": \"testpass123\"}" | jq -r '.message'

# 4. Get pending users
echo "4. Getting pending users..."
PENDING_USERS=$(curl -s -X GET "$API_BASE_URL/api/admin/users/pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
USER_ID=$(echo "$PENDING_USERS" | jq -r '.data[0].id')

# 5. Approve user
echo "5. Approving user..."
curl -s -X POST "$API_BASE_URL/api/admin/users/$USER_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.message'

# 6. User login
echo "6. User login..."
USER_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$TEST_USER\", \"password\": \"testpass123\"}")
export USER_TOKEN=$(echo "$USER_RESPONSE" | jq -r '.data.access_token')

# 7. Browse designs
echo "7. Browsing designs..."
DESIGNS=$(curl -s -X GET "$API_BASE_URL/api/designs?page=1&per_page=5" \
  -H "Authorization: Bearer $USER_TOKEN")
echo "Found $(echo "$DESIGNS" | jq -r '.data.total') designs"

# 8. Add to favorites
echo "8. Adding to favorites..."
DESIGN_ID=$(echo "$DESIGNS" | jq -r '.data.designs[0].id')
curl -s -X POST "$API_BASE_URL/api/designs/$DESIGN_ID/favorite" \
  -H "Authorization: Bearer $USER_TOKEN" | jq -r '.message'

# 9. Add to cart
echo "9. Adding to cart..."
curl -s -X POST "$API_BASE_URL/api/cart/items" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"design_id\": $DESIGN_ID, \"quantity\": 1}" | jq -r '.message'

# 10. View cart
echo "10. Viewing cart..."
CART=$(curl -s -X GET "$API_BASE_URL/api/cart" \
  -H "Authorization: Bearer $USER_TOKEN")
echo "Cart has $(echo "$CART" | jq -r '.data.total_items') items"

echo "✅ User journey test completed successfully!"
```

### Performance Test Script

```bash
#!/bin/bash
echo "⚡ Starting Performance Test"

# Concurrent requests test
echo "Testing concurrent requests..."
for i in {1..10}; do
  curl -s "$API_BASE_URL/health" > /dev/null &
  curl -s "$API_BASE_URL/api/designs" \
    -H "Authorization: Bearer $USER_TOKEN" > /dev/null &
done

wait
echo "✅ Concurrent requests test completed"

# Response time test
echo "Testing response times..."
TIME_START=$(date +%s%N)
curl -s "$API_BASE_URL/api/designs" \
  -H "Authorization: Bearer $USER_TOKEN" > /dev/null
TIME_END=$(date +%s%N)
RESPONSE_TIME=$((($TIME_END - $TIME_START) / 1000000))
echo "Design listing response time: ${RESPONSE_TIME}ms"
```

---

## ❌ Error Testing

### Authentication Errors

```bash
# No authorization header
curl -X GET "$API_BASE_URL/api/auth/me" | jq

# Invalid token
curl -X GET "$API_BASE_URL/api/auth/me" \
  -H "Authorization: Bearer invalid-token" | jq

# Malformed token
curl -X GET "$API_BASE_URL/api/auth/me" \
  -H "Authorization: invalid-format" | jq

# Non-admin accessing admin endpoint
curl -X GET "$API_BASE_URL/api/admin/users" \
  -H "Authorization: Bearer $USER_TOKEN" | jq
```

### Validation Errors

```bash
# Invalid JSON
curl -X POST "$API_BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username": "test"' | jq

# Missing required fields
curl -X POST "$API_BASE_URL/api/designs" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"style": "Traditional"}' | jq

# Invalid data types
curl -X POST "$API_BASE_URL/api/cart/items" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"design_id": "invalid", "quantity": -1}' | jq
```

### Not Found Errors

```bash
# Non-existent design
curl -X GET "$API_BASE_URL/api/designs/99999" \
  -H "Authorization: Bearer $USER_TOKEN" | jq

# Non-existent user
curl -X POST "$API_BASE_URL/api/admin/users/99999/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# Non-existent cart item
curl -X DELETE "$API_BASE_URL/api/cart/items/99999" \
  -H "Authorization: Bearer $USER_TOKEN" | jq
```

---

## 📊 Performance Testing

### Load Testing with Artillery

Create `artillery-test.yml`:
```yaml
config:
  target: 'http://localhost:8787'
  phases:
    - duration: 60
      arrivalRate: 5
  processor: "./test-processor.js"

scenarios:
  - name: "Complete API Load Test"
    weight: 100
    flow:
      - get:
          url: "/health"
      - post:
          url: "/api/auth/login"
          json:
            username: "admin"
            password: "admin123"
          capture:
            - json: "$.data.access_token"
              as: "token"
      - get:
          url: "/api/designs"
          headers:
            Authorization: "Bearer {{ token }}"
      - get:
          url: "/api/designs/featured"
          headers:
            Authorization: "Bearer {{ token }}"
      - get:
          url: "/api/admin/stats"
          headers:
            Authorization: "Bearer {{ token }}"
```

Run with: `artillery run artillery-test.yml`

---

## ✅ Test Checklist

### Core Functionality
- [ ] Health endpoints return 200
- [ ] User registration works
- [ ] User login generates valid JWT
- [ ] Admin approval workflow functions
- [ ] Design CRUD operations work
- [ ] Multiple images per design work
- [ ] Image upload and management work
- [ ] Batch image upload works
- [ ] Primary image setting works
- [ ] Image reordering works
- [ ] Favorites system functions
- [ ] Cart operations work
- [ ] File upload works
- [ ] WhatsApp sharing generates URLs

### Security Testing
- [ ] Protected routes require authentication
- [ ] Admin routes require admin privileges  
- [ ] JWT validation works correctly
- [ ] Invalid tokens are rejected
- [ ] User can only access their own data

### Error Handling
- [ ] Invalid JSON returns 400
- [ ] Missing auth returns 401
- [ ] Insufficient permissions return 403
- [ ] Not found returns 404
- [ ] Validation errors return proper messages

### Performance
- [ ] Response times under 500ms
- [ ] Handles concurrent requests
- [ ] Database queries are efficient
- [ ] Image uploads complete successfully

---

**🎯 This comprehensive testing guide ensures thorough validation of every endpoint and feature in the Design Gallery Backend API.** 