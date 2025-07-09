# API Technical Specification - Design Gallery Backend

## 📋 Overview

The Design Gallery Backend API is a RESTful service built on Cloudflare Workers, providing comprehensive functionality for managing a design gallery application with user authentication, design management, image storage, and administrative features.

**Base URL:** `https://your-domain.workers.dev`  
**API Version:** v1  
**Environment:** Production/Development  
**Database:** Cloudflare D1 (SQLite)  
**Storage:** Cloudflare R2  
**Authentication:** JWT Bearer Token  

## 🔐 Authentication

### Authentication Types
- **Public Endpoints:** No authentication required
- **User Endpoints:** Requires valid JWT token
- **Admin Endpoints:** Requires valid JWT token with admin privileges

### JWT Token Format
```
Authorization: Bearer <jwt_token>
```

### Token Structure
```json
{
  "userId": 1,
  "username": "admin",
  "isAdmin": true,
  "isApproved": true,
  "iat": 1234567890,
  "exp": 1234567890
}
```

## 📡 API Response Format

### Standard Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data object
  },
  "meta": {
    // Optional metadata (pagination, etc.)
  }
}
```

### Standard Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  }
}
```

## 📊 HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## 🛡️ Rate Limiting

### Default Rate Limits
- **Global Rate Limit:** 100 requests per 15 minutes per IP
- **Upload Endpoints:** 10 requests per minute per IP
- **Admin Endpoints:** 50 requests per minute per IP

### Rate Limit Headers
When rate limits are exceeded, the following headers are included:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 120
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
```

### Rate Limit Response
```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "retry_after_seconds": 120
  }
}
```

## ✅ Validation Rules

### User Registration
- **Username:** 3-50 characters, alphanumeric and underscore only
- **Password:** Minimum 6 characters (8+ recommended)

### Design Creation
- **Title:** Required, 1-200 characters
- **Description:** Optional, max 1000 characters
- **Category:** Required, predefined values
- **Tags:** Optional, comma-separated, max 500 characters
- **Price Range:** Optional, format: "min-max" (e.g., "5000-10000")

### Image Upload
- **File Types:** image/jpeg, image/png, image/webp, image/gif
- **File Size:** Maximum 10MB (10,485,760 bytes)
- **Dimensions:** No strict limits (recommended: max 2048x2048)

### Pagination
- **Page:** Minimum 1, default 1
- **Per Page:** Minimum 1, maximum 100, default 20
- **Search Query:** Maximum 200 characters

## 🏷️ Data Models

### User Model
```json
{
  "id": 1,
  "username": "user123",
  "is_admin": false,
  "is_approved": true,
  "profile": {
    "display_name": "John Doe",
    "email": "user@example.com",
    "avatar_url": "https://example.com/avatar.jpg",
    "bio": "Fashion enthusiast"
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "last_login": "2024-01-01T00:00:00Z"
}
```

### Design Model
```json
{
  "id": 1,
  "title": "Elegant Silk Saree",
  "description": "Beautiful traditional silk saree",
  "short_description": "Blue silk saree with golden border",
  "long_description": "Detailed description...",
  "image_url": "https://cdn.example.com/image.jpg",
  "r2_object_key": "sarees/2024/01/image.jpg",
  "category": "sarees",
  "style": "traditional",
  "colour": "blue",
  "fabric": "silk",
  "occasion": "wedding",
  "size_available": "Free Size",
  "price_range": "5000-10000",
  "tags": "silk,traditional,wedding,blue",
  "featured": true,
  "status": "active",
  "designer_name": "Meera Textiles",
  "collection_name": "Royal Heritage",
  "season": "all-season",
  "view_count": 150,
  "like_count": 25,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "created_by": 1
}
```

### Pagination Meta
```json
{
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```

---

## 🔗 API Endpoints

### 1. System Endpoints

#### 1.1 Get API Info
```
GET /
```
**Access:** Public  
**Description:** Get basic API information and status

**Response:**
```json
{
  "success": true,
  "message": "API is running successfully",
  "data": {
    "message": "Design Gallery API",
    "version": "1.0.0",
    "environment": "production",
    "status": "running",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

#### 1.2 Health Check
```
GET /health
```
**Access:** Public  
**Description:** Check API health and service status

**Response:**
```json
{
  "success": true,
  "message": "Health check completed",
  "data": {
    "status": "healthy",
    "services": {
      "database": "healthy",
      "r2_storage": "healthy"
    },
    "timestamp": "2024-01-01T00:00:00Z",
    "uptime": "24h 30m 15s"
  }
}
```

#### 1.3 Get API Information
```
GET /info
```
**Access:** Public  
**Description:** Get detailed API information and documentation

**Response:**
```json
{
  "success": true,
  "message": "API information retrieved",
  "data": {
    "app_name": "Design Gallery API",
    "version": "1.0.0",
    "description": "Backend API for Design Gallery React Native App featuring Indian traditional wear designs",
    "environment": "production",
    "features": {
      "authentication": "JWT-based authentication with admin approval system",
      "design_management": "Complete CRUD operations for design catalog",
      "r2_storage": "Cloudflare R2 for efficient image storage and delivery",
      "admin_panel": "Comprehensive admin controls for user and content management",
      "user_favorites": "Personal favorites system for users",
      "search_and_filters": "Advanced search and filtering capabilities",
      "analytics": "View counts, like counts, and engagement metrics"
    },
    "endpoints": {
      "auth": "/api/auth/*",
      "designs": "/api/designs/*",
      "upload": "/api/upload/*",
      "admin": "/api/admin/*"
    }
  }
}
```

---

### 2. Authentication Endpoints

#### 2.1 User Registration
```
POST /api/auth/register
```
**Access:** Public  
**Description:** Register a new user account

**Request Body:**
```json
{
  "username": "newuser",
  "password": "securepassword123"
}
```

**Validation Rules:**
- Username: 3-50 characters, alphanumeric and underscore only
- Password: Minimum 8 characters

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Awaiting admin approval.",
  "data": {
    "user": {
      "id": 2,
      "username": "newuser",
      "is_admin": false,
      "is_approved": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### 2.2 User Login
```
POST /api/auth/login
```
**Access:** Public  
**Description:** Authenticate user and get JWT token

**Request Body:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "id": 1,
      "username": "admin",
      "is_admin": true,
      "is_approved": true,
      "last_login": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### 2.3 Get Current User
```
GET /api/auth/me
```
**Access:** User  
**Description:** Get current authenticated user profile

**Response:**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "is_admin": true,
      "is_approved": true,
      "created_at": "2024-01-01T00:00:00Z",
      "last_login": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### 2.4 Logout User
```
POST /api/auth/logout
```
**Access:** User  
**Description:** Logout current user (invalidates token)

**Response:**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": {}
}
```

#### 2.5 Check Token Validity
```
GET /api/auth/check
```
**Access:** User  
**Description:** Verify if current token is valid

**Response:**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "valid": true,
    "user": {
      "id": 1,
      "username": "admin",
      "is_admin": true
    }
  }
}
```

#### 2.6 Refresh Token
```
POST /api/auth/refresh
```
**Access:** User  
**Description:** Refresh JWT token with new expiration

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 86400
  }
}
```

---

### 3. Design Management Endpoints

#### 3.1 Get Designs
```
GET /api/designs
```
**Access:** Public  
**Description:** Get list of designs with pagination, search, and filtering

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| per_page | integer | 20 | Items per page (max 100) |
| q | string | - | Search query (title, description, tags) |
| category | string | - | Filter by category |
| style | string | - | Filter by style |
| colour | string | - | Filter by colour |
| fabric | string | - | Filter by fabric |
| occasion | string | - | Filter by occasion |
| featured | boolean | - | Filter featured designs |
| designer_name | string | - | Filter by designer |
| collection_name | string | - | Filter by collection |
| status | string | active | Filter by status |
| sort_by | string | created_at | Sort field |
| sort_order | string | desc | Sort order (asc/desc) |

**Example Request:**
```
GET /api/designs?page=1&per_page=10&category=sarees&colour=blue&featured=true
```

**Response:**
```json
{
  "success": true,
  "message": "Designs retrieved successfully",
  "data": {
    "designs": [
      {
        "id": 1,
        "title": "Elegant Blue Silk Saree",
        "short_description": "Blue silk saree with golden border",
        "image_url": "https://cdn.example.com/image.jpg",
        "category": "sarees",
        "colour": "blue",
        "featured": true,
        "view_count": 150,
        "like_count": 25,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 10,
      "total": 50,
      "total_pages": 5,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

#### 3.2 Get Featured Designs
```
GET /api/designs/featured
```
**Access:** Public  
**Description:** Get featured designs

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 10 | Number of featured designs (max 50) |

**Response:**
```json
{
  "success": true,
  "message": "Featured designs retrieved successfully",
  "data": {
    "designs": [
      // Array of featured design objects
    ],
    "count": 5
  }
}
```

#### 3.3 Get Single Design
```
GET /api/designs/{id}
```
**Access:** Public  
**Description:** Get single design by ID (increments view count)

**Path Parameters:**
- `id` (integer): Design ID

**Response:**
```json
{
  "success": true,
  "message": "Design retrieved successfully",
  "data": {
    "design": {
      // Complete design object with all fields
    }
  }
}
```

#### 3.4 Create Design
```
POST /api/designs
```
**Access:** Admin  
**Description:** Create a new design

**Request Body:**
```json
{
  "title": "New Design Title",
  "description": "Design description",
  "short_description": "Short description",
  "long_description": "Detailed description",
  "r2_object_key": "category/2024/01/image.jpg",
  "category": "sarees",
  "style": "traditional",
  "colour": "red",
  "fabric": "silk",
  "occasion": "wedding",
  "size_available": "Free Size",
  "price_range": "5000-10000",
  "tags": "silk,traditional,wedding,red",
  "featured": false,
  "designer_name": "Designer Name",
  "collection_name": "Collection Name",
  "season": "all-season"
}
```

**Required Fields:**
- title, description, r2_object_key, category

**Response:**
```json
{
  "success": true,
  "message": "Design created successfully",
  "data": {
    "design": {
      // Complete created design object
    }
  }
}
```

#### 3.5 Update Design
```
PUT /api/designs/{id}
```
**Access:** Admin  
**Description:** Update existing design

**Path Parameters:**
- `id` (integer): Design ID

**Request Body:** (All fields optional)
```json
{
  "title": "Updated Title",
  "featured": true,
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Design updated successfully",
  "data": {
    "design": {
      // Updated design object
    }
  }
}
```

#### 3.6 Delete Design
```
DELETE /api/designs/{id}
```
**Access:** Admin  
**Description:** Delete design and associated image

**Path Parameters:**
- `id` (integer): Design ID

**Response:**
```json
{
  "success": true,
  "message": "Design deleted successfully",
  "data": {
    "deleted_design_id": 1
  }
}
```

---

### 4. User Favorites Endpoints

#### 4.1 Add to Favorites
```
POST /api/designs/{id}/favorite
```
**Access:** User  
**Description:** Add design to user favorites

**Path Parameters:**
- `id` (integer): Design ID

**Response:**
```json
{
  "success": true,
  "message": "Design added to favorites",
  "data": {
    "design_id": 1,
    "is_favorite": true
  }
}
```

#### 4.2 Remove from Favorites
```
DELETE /api/designs/{id}/favorite
```
**Access:** User  
**Description:** Remove design from user favorites

**Path Parameters:**
- `id` (integer): Design ID

**Response:**
```json
{
  "success": true,
  "message": "Design removed from favorites",
  "data": {
    "design_id": 1,
    "is_favorite": false
  }
}
```

#### 4.3 Get User Favorites
```
GET /api/designs/user/favorites
```
**Access:** User  
**Description:** Get user's favorite designs

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| per_page | integer | 20 | Items per page |

**Response:**
```json
{
  "success": true,
  "message": "User favorites retrieved successfully",
  "data": {
    "favorites": [
      {
        "design": {
          // Complete design object
        },
        "favorited_at": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      // Pagination info
    }
  }
}
```

---

### 5. Image Upload Endpoints

#### 5.1 Upload Image
```
POST /api/upload/image
```
**Access:** Admin  
**Description:** Upload image to R2 storage

**Request:** Multipart Form Data
- `file` (file): Image file (JPEG, PNG, WebP)
- `category` (string): Image category

**File Validation:**
- Max size: 10MB
- Allowed types: image/jpeg, image/png, image/webp
- Required category for organized storage

**Response:**
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "object_key": "sarees/2024/01/20240101_12345678.jpg",
    "public_url": "https://cdn.example.com/sarees/2024/01/20240101_12345678.jpg",
    "file_size": 245760,
    "content_type": "image/jpeg"
  }
}
```

#### 5.2 List Images
```
GET /api/upload/images
```
**Access:** Admin  
**Description:** List uploaded images

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 50 | Max images to return |
| prefix | string | - | Filter by key prefix |

**Response:**
```json
{
  "success": true,
  "message": "Images listed successfully",
  "data": {
    "images": [
      {
        "key": "sarees/2024/01/image.jpg",
        "size": 245760,
        "lastModified": "2024-01-01T00:00:00Z",
        "public_url": "https://cdn.example.com/sarees/2024/01/image.jpg"
      }
    ],
    "count": 10,
    "limit": 50
  }
}
```

#### 5.3 Generate Presigned Upload URL
```
GET /api/upload/presigned-url
```
**Access:** Admin  
**Description:** Generate presigned URL for direct R2 upload

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filename | string | Yes | Original filename |
| category | string | Yes | Image category |
| content_type | string | No | MIME type (defaults to image/jpeg) |

**Response:**
```json
{
  "success": true,
  "message": "Presigned URL generated successfully",
  "data": {
    "upload_url": "https://r2-presigned-url...",
    "object_key": "sarees/2024/01/20240101_12345678.jpg",
    "expires_in": 3600,
    "fields": {
      "key": "sarees/2024/01/20240101_12345678.jpg",
      "Content-Type": "image/jpeg"
    }
  }
}
```

#### 5.4 Get Image Information
```
GET /api/upload/image/{object_key}/info
```
**Access:** Admin  
**Description:** Get metadata for uploaded image

**Path Parameters:**
- `object_key` (string): R2 object key (URL encoded)

**Response:**
```json
{
  "success": true,
  "message": "Image information retrieved successfully",
  "data": {
    "object_key": "sarees/2024/01/image.jpg",
    "size": 245760,
    "last_modified": "2024-01-01T00:00:00Z",
    "content_type": "image/jpeg",
    "public_url": "https://cdn.example.com/sarees/2024/01/image.jpg",
    "metadata": {
      "uploaded_by": "admin",
      "category": "sarees",
      "original_filename": "elegant-saree.jpg"
    }
  }
}
```

#### 5.5 R2 Storage Health Check
```
GET /api/upload/health
```
**Access:** Public  
**Description:** Check R2 storage health and connectivity

**Response:**
```json
{
  "success": true,
  "message": "R2 storage health check completed",
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "storage_info": {
      "bucket_accessible": true,
      "upload_enabled": true,
      "response_time_ms": 45
    }
  }
}
```

#### 5.6 Delete Image
```
DELETE /api/upload/image/{object_key}
```
**Access:** Admin  
**Description:** Delete image from R2 storage

**Path Parameters:**
- `object_key` (string): R2 object key (URL encoded)

**Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully",
  "data": {
    "deleted_key": "sarees/2024/01/image.jpg"
  }
}
```

---

### 6. Admin Panel Endpoints

#### 6.1 Get System Statistics
```
GET /api/admin/stats
```
**Access:** Admin  
**Description:** Get comprehensive system statistics

**Response:**
```json
{
  "success": true,
  "message": "Statistics retrieved successfully",
  "data": {
    "users": {
      "total": 150,
      "approved": 120,
      "pending": 25,
      "admins": 5,
      "new_this_month": 15
    },
    "designs": {
      "total": 500,
      "active": 480,
      "featured": 50,
      "categories": {
        "sarees": 200,
        "lehengas": 150,
        "suits": 150
      }
    },
    "engagement": {
      "total_views": 15000,
      "total_likes": 2500,
      "total_favorites": 1200,
      "avg_views_per_design": 30
    },
    "top_designs": {
      "by_views": [
        {
          "id": 1,
          "title": "Popular Design",
          "view_count": 500
        }
      ],
      "by_likes": [
        {
          "id": 2,
          "title": "Liked Design",
          "like_count": 100
        }
      ]
    },
    "recent_activity": [
      {
        "type": "user_registration",
        "data": "New user registered: john_doe",
        "timestamp": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### 6.2 List Users
```
GET /api/admin/users
```
**Access:** Admin  
**Description:** List all users with pagination and filtering

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| per_page | integer | 20 | Items per page |
| status | string | - | Filter by approval status |
| search | string | - | Search username |

**Response:**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": 1,
        "username": "admin",
        "is_admin": true,
        "is_approved": true,
        "created_at": "2024-01-01T00:00:00Z",
        "last_login": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      // Pagination info
    }
  }
}
```

#### 6.3 Get Pending Users
```
GET /api/admin/users/pending
```
**Access:** Admin  
**Description:** Get users awaiting approval

**Response:**
```json
{
  "success": true,
  "message": "Pending users retrieved successfully",
  "data": {
    "users": [
      {
        "id": 2,
        "username": "newuser",
        "is_admin": false,
        "is_approved": false,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "count": 5
  }
}
```

#### 6.4 Approve User
```
POST /api/admin/users/{id}/approve
```
**Access:** Admin  
**Description:** Approve pending user

**Path Parameters:**
- `id` (integer): User ID

**Response:**
```json
{
  "success": true,
  "message": "User approved successfully",
  "data": {
    "user": {
      "id": 2,
      "username": "newuser",
      "is_approved": true
    }
  }
}
```

#### 6.5 Reject User
```
POST /api/admin/users/{id}/reject
```
**Access:** Admin  
**Description:** Reject pending user registration

**Path Parameters:**
- `id` (integer): User ID

**Response:**
```json
{
  "success": true,
  "message": "User rejected successfully",
  "data": {
    "user": {
      "id": 2,
      "username": "newuser",
      "is_approved": false,
      "status": "rejected"
    }
  }
}
```

#### 6.6 Toggle Admin Privileges
```
POST /api/admin/users/{id}/toggle-admin
```
**Access:** Admin  
**Description:** Toggle admin privileges for a user

**Path Parameters:**
- `id` (integer): User ID

**Response:**
```json
{
  "success": true,
  "message": "Admin privileges updated successfully",
  "data": {
    "user": {
      "id": 2,
      "username": "newuser",
      "is_admin": true,
      "updated_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### 6.7 Bulk Approve Users
```
POST /api/admin/users/bulk-approve
```
**Access:** Admin  
**Description:** Approve multiple users at once

**Request Body:**
```json
{
  "user_ids": [2, 3, 4, 5]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Users approved successfully",
  "data": {
    "approved_count": 4,
    "approved_users": [2, 3, 4, 5]
  }
}
```

#### 6.8 Delete User
```
DELETE /api/admin/users/{id}
```
**Access:** Admin  
**Description:** Delete user account

**Path Parameters:**
- `id` (integer): User ID

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "deleted_user_id": 2
  }
}
```

#### 6.9 Get App Settings
```
GET /api/admin/settings
```
**Access:** Admin  
**Description:** Get all application settings

**Response:**
```json
{
  "success": true,
  "message": "Settings retrieved successfully",
  "data": {
    "settings": [
      {
        "key": "app_name",
        "value": "Design Gallery",
        "description": "Application name",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### 6.10 Create App Setting
```
POST /api/admin/settings
```
**Access:** Admin  
**Description:** Create new application setting

**Request Body:**
```json
{
  "key": "maintenance_mode",
  "value": "false",
  "description": "Enable/disable maintenance mode"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Setting created successfully",
  "data": {
    "setting": {
      "key": "maintenance_mode",
      "value": "false",
      "description": "Enable/disable maintenance mode",
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### 6.11 Update App Setting
```
PUT /api/admin/settings/{key}
```
**Access:** Admin  
**Description:** Update existing application setting

**Path Parameters:**
- `key` (string): Setting key

**Request Body:**
```json
{
  "value": "true",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Setting updated successfully",
  "data": {
    "setting": {
      "key": "maintenance_mode",
      "value": "true",
      "description": "Updated description",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### 6.12 Delete App Setting
```
DELETE /api/admin/settings/{key}
```
**Access:** Admin  
**Description:** Delete application setting

**Path Parameters:**
- `key` (string): Setting key

**Response:**
```json
{
  "success": true,
  "message": "Setting deleted successfully",
  "data": {
    "deleted_key": "maintenance_mode"
  }
}
```

---

## 🎯 Frontend Integration Examples

### React/Next.js Integration Example

```javascript
// API client setup
class DesignGalleryAPI {
  constructor(baseURL, token = null) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  }

  // Authentication
  async login(username, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  // Designs
  async getDesigns(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/api/designs?${queryString}`);
  }

  async getDesign(id) {
    return this.request(`/api/designs/${id}`);
  }

  // Favorites
  async addToFavorites(designId) {
    return this.request(`/api/designs/${designId}/favorite`, {
      method: 'POST',
    });
  }

  // Image upload
  async uploadImage(file, category) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    return this.request('/api/upload/image', {
      method: 'POST',
      headers: {}, // Remove Content-Type for FormData
      body: formData,
    });
  }
}

// Usage in React component
const useDesigns = (params) => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        setLoading(true);
        const api = new DesignGalleryAPI(process.env.NEXT_PUBLIC_API_URL);
        const response = await api.getDesigns(params);
        setDesigns(response.data.designs);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDesigns();
  }, [params]);

  return { designs, loading, error };
};
```

### Error Handling Best Practices

```javascript
// Centralized error handling
class APIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const handleAPIError = (error) => {
  if (error.status === 401) {
    // Redirect to login
    window.location.href = '/login';
  } else if (error.status === 403) {
    // Show permission denied message
    toast.error('You don\'t have permission to perform this action');
  } else if (error.status === 429) {
    // Rate limited
    toast.error('Too many requests. Please try again later.');
  } else {
    // Generic error
    toast.error(error.message || 'Something went wrong');
  }
};
```

## 📝 Notes for Frontend Development

### Pagination Implementation
- Always include pagination meta in list responses
- Implement infinite scroll or traditional pagination
- Consider caching strategies for better performance

### Image Handling
- Use lazy loading for design images
- Implement responsive images with multiple sizes
- Consider using image optimization services

### State Management
- Store JWT token securely (localStorage/sessionStorage)
- Implement token refresh mechanism
- Cache frequently accessed data (categories, settings)

### Search and Filtering
- Debounce search inputs to avoid excessive API calls
- Implement URL-based state for shareable filtered views
- Use query parameters for maintaining filter state

### Real-time Updates
- Consider implementing WebSocket connection for real-time notifications
- Update like/view counts optimistically with rollback on failure
- Implement proper cache invalidation strategies

---

**API Version:** 1.0.0  
**Last Updated:** January 2024  
**Maintainer:** Design Gallery Team 