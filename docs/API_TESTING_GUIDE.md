# Design Gallery API Testing Guide

## Overview
Comprehensive testing guide for the Design Gallery Backend API with all endpoints, authentication flows, and data operations.

## Base URL and Environment
```
Production: https://design-gallery-backend.your-domain.com
Development: http://localhost:8787
```

## Authentication

### 1. User Registration
**Endpoint:** `POST /api/auth/register`

**Request:**
```json
{
  "username": "testuser",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful! Please wait for admin approval.",
  "data": {
    "id": 1,
    "username": "testuser",
    "is_admin": false,
    "is_approved": false,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### 2. User Login
**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "username": "testuser",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "is_admin": false,
      "is_approved": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Get Current User Profile
**Endpoint:** `GET /api/auth/me`
**Auth Required:** Bearer Token

**Response (200):**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": 1,
    "username": "testuser",
    "is_admin": false,
    "is_approved": true,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

## Design Management

### 4. List Designs (Public)
**Endpoint:** `GET /api/designs`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `category` - Filter by category
- `featured` - true/false for featured designs
- `search` - Search in title, description, tags
- `design_number` - Search by design number
- `sort_by` - created_at, title, view_count, like_count, design_number, category, style
- `sort_order` - asc, desc (default: desc)

**Example Request:**
```
GET /api/designs?page=1&limit=10&category=saree&featured=true&search=silk&sort_by=created_at&sort_order=desc
```

**Response (200):**
```json
{
  "success": true,
  "message": "Designs retrieved successfully",
  "data": [
    {
      "id": 1,
      "title": "Elegant Silk Saree",
      "description": "Beautiful traditional silk saree",
      "design_number": "SAR001",
      "category": "saree",
      "style": "traditional",
      "colour": "red",
      "fabric": "silk",
      "featured": true,
      "status": "active",
      "view_count": 150,
      "like_count": 25,
      "image_url": "https://r2-public-url/designs/12345.jpg",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "total_pages": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

### 5. Get Single Design
**Endpoint:** `GET /api/designs/{id}`

**Response (200):**
```json
{
  "success": true,
  "message": "Design retrieved successfully",
  "data": {
    "id": 1,
    "title": "Elegant Silk Saree",
    "description": "Beautiful traditional silk saree",
    "short_description": "Elegant silk saree",
    "long_description": "This beautiful traditional silk saree...",
    "design_number": "SAR001",
    "category": "saree",
    "style": "traditional",
    "colour": "red",
    "fabric": "silk",
    "occasion": "wedding",
    "size_available": "Free Size",
    "price_range": "5000-8000",
    "tags": "silk,traditional,wedding",
    "featured": true,
    "status": "active",
    "view_count": 151,
    "like_count": 25,
    "designer_name": "Designer Name",
    "collection_name": "Collection 2024",
    "season": "Winter",
    "image_url": "https://r2-public-url/designs/12345.jpg",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T11:30:00Z"
  }
}
```

## User Favorites

### 6. Add to Favorites
**Endpoint:** `POST /api/designs/{id}/favorite`
**Auth Required:** Bearer Token

**Response (200):**
```json
{
  "success": true,
  "message": "Design added to favorites",
  "data": {
    "is_favorite": true
  }
}
```

### 7. Remove from Favorites
**Endpoint:** `DELETE /api/designs/{id}/favorite`
**Auth Required:** Bearer Token

**Response (200):**
```json
{
  "success": true,
  "message": "Design removed from favorites",
  "data": {
    "is_favorite": false
  }
}
```

### 8. Get User Favorites
**Endpoint:** `GET /api/designs/favorites`
**Auth Required:** Bearer Token

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response (200):**
```json
{
  "success": true,
  "message": "Favorite designs retrieved successfully",
  "data": [
    {
      "id": 1,
      "title": "Elegant Silk Saree",
      "design_number": "SAR001",
      "category": "saree",
      "image_url": "https://r2-public-url/designs/12345.jpg",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

## Shopping Cart

### 9. Get Cart
**Endpoint:** `GET /api/cart`
**Auth Required:** Bearer Token

**Response (200):**
```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "cart_id": 1,
    "items": [
      {
        "id": 1,
        "design_id": 1,
        "quantity": 2,
        "notes": "Please confirm availability",
        "design": {
          "id": 1,
          "title": "Elegant Silk Saree",
          "design_number": "SAR001",
          "category": "saree",
          "image_url": "https://r2-public-url/designs/12345.jpg"
        },
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T11:30:00Z"
      }
    ],
    "total_items": 1,
    "total_quantity": 2,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T11:30:00Z"
  }
}
```

### 10. Add Item to Cart
**Endpoint:** `POST /api/cart/items`
**Auth Required:** Bearer Token

**Request:**
```json
{
  "design_id": 1,
  "quantity": 2,
  "notes": "Please confirm availability in red color"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Item added to cart successfully",
  "data": {
    "item_id": 1,
    "design_id": 1,
    "quantity": 2,
    "notes": "Please confirm availability in red color"
  }
}
```

### 11. Update Cart Item
**Endpoint:** `PUT /api/cart/items/{item_id}`
**Auth Required:** Bearer Token

**Request:**
```json
{
  "quantity": 3,
  "notes": "Updated notes"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Cart item updated successfully",
  "data": {
    "item_id": 1,
    "quantity": 3,
    "notes": "Updated notes"
  }
}
```

### 12. Remove Cart Item
**Endpoint:** `DELETE /api/cart/items/{item_id}`
**Auth Required:** Bearer Token

**Response (200):**
```json
{
  "success": true,
  "message": "Item removed from cart successfully"
}
```

### 13. Clear Cart
**Endpoint:** `DELETE /api/cart`
**Auth Required:** Bearer Token

**Response (200):**
```json
{
  "success": true,
  "message": "Cart cleared successfully"
}
```

## WhatsApp Sharing

### 14. Share Cart via WhatsApp
**Endpoint:** `POST /api/cart/share`
**Auth Required:** Bearer Token

**Request:**
```json
{
  "contact_index": 0,
  "message": "Hi! I'm interested in these designs. Please let me know availability and pricing."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "WhatsApp share link generated successfully",
  "data": {
    "whatsapp_url": "https://wa.me/919876543210?text=Hi%21%20I%27m%20interested...",
    "contact_number": "+919876543210",
    "design_count": 3,
    "message": "Hi! I'm interested in these designs..."
  }
}
```

## Admin Endpoints

### 15. Get All Users (Admin)
**Endpoint:** `GET /api/admin/users`
**Auth Required:** Bearer Token (Admin)

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `approved` - true/false filter

**Response (200):**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": 1,
      "username": "testuser",
      "is_admin": false,
      "is_approved": true,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  }
}
```

### 16. Approve User (Admin)
**Endpoint:** `POST /api/admin/users/{user_id}/approve`
**Auth Required:** Bearer Token (Admin)

**Response (200):**
```json
{
  "success": true,
  "message": "User approved successfully",
  "data": {
    "user_id": 1,
    "is_approved": true
  }
}
```

### 17. Revoke User Access (Admin)
**Endpoint:** `POST /api/admin/users/{user_id}/revoke`
**Auth Required:** Bearer Token (Admin)

**Response (200):**
```json
{
  "success": true,
  "message": "User access revoked successfully",
  "data": {
    "user_id": 1,
    "is_approved": false
  }
}
```

## File Upload

### 18. Upload Design Image (Admin)
**Endpoint:** `POST /api/upload/design`
**Auth Required:** Bearer Token (Admin)
**Content-Type:** `multipart/form-data`

**Request:**
```
FormData:
- file: [image file]
- title: "Elegant Silk Saree"
- description: "Beautiful traditional design"
- design_number: "SAR001"
- category: "saree"
- style: "traditional"
- colour: "red"
- fabric: "silk"
```

**Response (201):**
```json
{
  "success": true,
  "message": "Design uploaded successfully",
  "data": {
    "design_id": 1,
    "title": "Elegant Silk Saree",
    "design_number": "SAR001",
    "image_url": "https://r2-public-url/designs/12345.jpg",
    "r2_object_key": "designs/12345.jpg"
  }
}
```

## Error Responses

### Common Error Formats

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Invalid request data",
  "error": "VALIDATION_ERROR"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "AUTHENTICATION_ERROR"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "error": "AUTHORIZATION_ERROR"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Resource not found",
  "error": "NOT_FOUND"
}
```

**409 Conflict:**
```json
{
  "success": false,
  "message": "Username already exists",
  "error": "CONFLICT"
}
```

**429 Rate Limited:**
```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later.",
  "error": "RATE_LIMIT_EXCEEDED"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "INTERNAL_ERROR"
}
```

## Testing Scenarios

### 1. Complete User Journey
1. Register new user
2. Wait for admin approval
3. Login with approved user
4. Browse designs with filters
5. Add designs to favorites
6. Add designs to cart
7. Share cart via WhatsApp

### 2. Admin Workflow
1. Login as admin
2. View pending user approvals
3. Approve users
4. Upload new designs
5. Manage app settings

### 3. Cart Management
1. Add multiple items to cart
2. Update quantities and notes
3. Remove specific items
4. Share via WhatsApp
5. Clear entire cart

### 4. Search and Filter Testing
1. Search by text in various fields
2. Filter by category, style, color
3. Sort by different criteria
4. Test pagination
5. Search by design number

## Performance Testing

### Load Testing Endpoints
- `GET /api/designs` (most frequently accessed)
- `POST /api/auth/login` (authentication bottleneck)
- `GET /api/cart` (user-specific data)
- `POST /api/cart/items` (write operations)

### Expected Response Times
- Authentication: < 500ms
- Design listing: < 300ms
- Single design: < 200ms
- Cart operations: < 400ms
- File upload: < 2000ms

## Security Testing

### Authentication Tests
1. Test with invalid tokens
2. Test with expired tokens
3. Test admin-only endpoints with regular user
4. Test rate limiting

### Input Validation Tests
1. SQL injection attempts in search
2. XSS attempts in text fields
3. File upload validation
4. Large payload handling

## Automated Testing Script

Use the provided test script:
```bash
chmod +x scripts/test-new-features.sh
./scripts/test-new-features.sh
```

This script tests:
- User registration and login
- Design browsing and search
- Cart operations
- WhatsApp sharing
- Admin functions
- Error handling

## Configuration for Testing

### Environment Variables
```bash
# Development
export JWT_SECRET="your-secret-key-here"
export ENVIRONMENT="development"
export R2_PUBLIC_URL="your-r2-public-url"

# Database
wrangler d1 execute design-gallery-db --file=migrations/0001_initial.sql
wrangler d1 execute design-gallery-db --file=migrations/0002_add_design_number.sql
wrangler d1 execute design-gallery-db --file=migrations/0003_add_shopping_cart.sql
```

### Admin User Setup
1. Update admin password hash in migration
2. Or create admin via API after deployment

## Monitoring and Logs

### Key Metrics to Monitor
- Response times per endpoint
- Error rates by endpoint
- Authentication success/failure rates
- Cart conversion rates
- File upload success rates

### Log Examples
```
[2024-01-15T10:30:00Z] POST /api/auth/login - 200 - 245ms - IP: 192.168.1.1
[2024-01-15T10:30:15Z] GET /api/designs?page=1 - 200 - 187ms - IP: 192.168.1.1
[2024-01-15T10:30:30Z] POST /api/cart/items - 201 - 312ms - IP: 192.168.1.1
```

This comprehensive testing guide ensures thorough validation of all API functionality before production deployment. 