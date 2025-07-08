# Design Gallery Backend - Code Flow Guide 📋

This document provides a comprehensive overview of how the Design Gallery backend processes requests, manages data, and integrates with Cloudflare services.

## 📋 Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Request Lifecycle](#request-lifecycle)
3. [Authentication Flow](#authentication-flow)
4. [Design Management Flow](#design-management-flow)
5. [Image Upload Flow](#image-upload-flow)
6. [Database Operations](#database-operations)
7. [Error Handling](#error-handling)
8. [Security Implementation](#security-implementation)
9. [Performance Optimizations](#performance-optimizations)

---

## 🏗️ System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React Native)                    │
│  • Authentication screens    • Design gallery              │
│  • Admin panel              • User favorites               │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS Requests
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              CLOUDFLARE WORKERS (Edge Runtime)              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Middleware  │ │    Hono     │ │ TypeScript  │          │
│  │   Layer     │ │  Framework  │ │   Runtime   │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│Cloudflare D1│ │Cloudflare   │ │ KV Store    │
│ (Database)  │ │  Images     │ │ (Optional)  │
│             │ │ (Storage)   │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
```

### Component Interaction

```
Request → Middleware → Route Handler → Service Layer → Database/Storage
   ↓         ↓            ↓              ↓               ↓
Logger   Auth Check   Business Logic  Data Access   Cloudflare APIs
CORS     Validation   Error Handling  SQL Queries   Image Processing
Rate     Type Safety  Response Format Database Ops  CDN Delivery
```

---

## 🔄 Request Lifecycle

### 1. Request Reception

```typescript
// src/index.ts - Main application entry point
const app = new Hono<{ Bindings: Env }>()

// Global middleware stack (order matters!)
app.use('*', errorHandlingMiddleware)     // 1. Error handling wrapper
app.use('*', loggingMiddleware)           // 2. Request logging
app.use('*', corsMiddleware)              // 3. CORS headers
app.use('*', prettyJSON())                // 4. JSON formatting
app.use('*', rateLimitMiddleware(100))    // 5. Rate limiting
```

### 2. Middleware Processing Pipeline

```
Incoming Request
       │
       ▼
┌─────────────────┐
│ Error Handler   │ ← Wraps entire request
│ (outermost)     │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Request Logger  │ ← Logs request details
│                 │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ CORS Handler    │ ← Sets CORS headers
│                 │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Rate Limiter    │ ← Checks request limits
│                 │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Route Handler   │ ← Processes business logic
│                 │
└─────────┬───────┘
          │
          ▼
    Response Sent
```

### 3. Route Resolution

```typescript
// Routes are organized by functionality
app.route('/api/auth', auth)         // Authentication endpoints
app.route('/api/designs', designs)   // Design management
app.route('/api/admin', admin)       // Admin operations
app.route('/api/upload', upload)     // File upload
```

---

## 🔐 Authentication Flow

### User Registration Flow

```
1. Client POST /api/auth/register
        │
        ▼
2. Zod Validation (UserCreateSchema)
   ├─ Username: 3-50 chars, alphanumeric + underscore
   ├─ Password: min 6 chars
   └─ Format validation
        │
        ▼
3. Database Service.createUser()
   ├─ Check if username exists
   ├─ Hash password with bcrypt (12 rounds)
   ├─ Insert user (is_approved = 0)
   └─ Return sanitized user data
        │
        ▼
4. Response: User created, pending approval
```

**Code Flow:**
```typescript
// src/routes/auth.ts
auth.post('/register', zValidator('json', UserCreateSchema), async (c) => {
  const userData = c.req.valid('json')
  const db = new DatabaseService(c.env)
  
  // Create user with hashed password
  const user = await db.createUser(userData)
  
  // Return safe user data (no password hash)
  return ResponseUtils.json(
    ResponseUtils.success(DatabaseUtils.toUserResponse(user))
  )
})
```

### User Login Flow

```
1. Client POST /api/auth/login
        │
        ▼
2. Credential Validation
   ├─ Zod schema validation
   └─ Required fields check
        │
        ▼
3. User Authentication
   ├─ Find user by username
   ├─ Verify password with bcrypt
   ├─ Check if user is approved
   └─ Check admin status
        │
        ▼
4. JWT Token Generation
   ├─ Create payload: {user_id, username, is_admin}
   ├─ Sign with JWT secret (HS256)
   ├─ Set expiration (24 hours)
   └─ Return token + user data
        │
        ▼
5. Response: Token + user profile
```

**Code Flow:**
```typescript
// src/services/database.ts
async authenticateUser(credentials: UserLogin): Promise<User | null> {
  // Get user by username
  const user = await this.getUserByUsername(credentials.username)
  if (!user) return null

  // Verify password
  const isValid = await SecurityUtils.verifyPassword(
    credentials.password, 
    user.password_hash
  )
  
  return isValid ? user : null
}
```

### Protected Route Access

```
1. Client Request with Authorization header
        │
        ▼
2. authMiddleware() execution
   ├─ Extract Bearer token
   ├─ Verify JWT signature
   ├─ Check token expiration
   ├─ Extract user payload
   └─ Attach user to context
        │
        ▼
3. Route Handler Access
   ├─ Access user via c.get('user')
   ├─ Use user.user_id for operations
   └─ Check user.is_admin for admin routes
```

---

## 🎨 Design Management Flow

### Listing Designs with Filters

```
1. Client GET /api/designs?style=Traditional&colour=Blue&page=1
        │
        ▼
2. Query Parameter Processing
   ├─ Parse filter parameters
   ├─ Validate pagination (page, limit)
   ├─ Sanitize search query
   └─ Set default sorting
        │
        ▼
3. Database Query Construction
   ├─ Build WHERE clause dynamically
   ├─ Add pagination (LIMIT, OFFSET)
   ├─ Include ORDER BY clause
   └─ Execute query with parameters
        │
        ▼
4. Result Processing
   ├─ Generate Cloudflare Image URLs
   ├─ Check user favorites (if authenticated)
   ├─ Format response data
   └─ Add pagination metadata
        │
        ▼
5. Response: Paginated design list
```

**Database Query Builder:**
```typescript
// src/utils/index.ts - DatabaseUtils
static buildWhereClause(filters: Record<string, any>) {
  const conditions: string[] = []
  const params: any[] = []

  Object.entries(filters).forEach(([key, value]) => {
    if (key === 'q') {
      // Multi-field search
      conditions.push(`(
        designname LIKE ? OR 
        short_description LIKE ? OR 
        categories LIKE ?
      )`)
      const searchTerm = `%${value}%`
      params.push(searchTerm, searchTerm, searchTerm)
    } else if (value !== undefined) {
      conditions.push(`${key} = ?`)
      params.push(value)
    }
  })

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  }
}
```

### Creating a Design (Admin Only)

```
1. Client POST /api/designs (with admin token)
        │
        ▼
2. Authentication & Authorization
   ├─ Verify JWT token
   ├─ Check user.is_admin = true
   └─ Proceed if authorized
        │
        ▼
3. Input Validation
   ├─ Zod schema validation
   ├─ Required fields check
   ├─ Field length validation
   └─ Cloudflare Image ID validation
        │
        ▼
4. Database Insert
   ├─ Insert design record
   ├─ Set default values (status, featured)
   ├─ Generate timestamps
   └─ Return design ID
        │
        ▼
5. Response Formatting
   ├─ Generate image URLs
   ├─ Format design response
   └─ Return created design
```

---

## 🖼️ Image Upload Flow

### Cloudflare Images Integration

```
1. Admin uploads image
        │
        ▼
2. Client calls /api/upload/presigned-url
   ├─ Verify admin authentication
   ├─ Generate unique image ID
   └─ Return Cloudflare upload URL
        │
        ▼
3. Direct upload to Cloudflare Images
   ├─ Client uploads to Cloudflare directly
   ├─ Image processing (resize, optimize)
   └─ Returns image ID on success
        │
        ▼
4. Create design with image ID
   ├─ Call /api/designs with cloudflare_image_id
   ├─ Store metadata in database
   └─ Generate responsive image URLs
```

**Image URL Generation:**
```typescript
// src/config/index.ts
getImageUrl(imageId: string, variant: 'thumbnail' | 'medium' | 'original'): string {
  const baseUrl = `https://imagedelivery.net/${this.cloudflareAccountId}/${imageId}`
  
  switch (variant) {
    case 'thumbnail': return `${baseUrl}/thumbnail`  // 200x200
    case 'medium': return `${baseUrl}/medium`        // 600x600
    case 'original': return baseUrl                  // Original size
  }
}
```

---

## 🗃️ Database Operations

### D1 Database Interaction Pattern

```typescript
// Connection through environment binding
const db = this.config.database  // From Cloudflare D1 binding

// Prepared statements for security
const result = await db.prepare(`
  SELECT * FROM designs 
  WHERE status = ? AND style = ?
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
`).bind('active', 'Traditional', 20, 0).all()
```

### Transaction-like Operations

```typescript
// Since D1 doesn't support transactions, we handle failures gracefully
async toggleFavorite(userId: number, designId: number) {
  try {
    // Check if design exists first
    const design = await this.db.prepare(
      'SELECT id FROM designs WHERE id = ?'
    ).bind(designId).first()
    
    if (!design) throw new NotFoundError('Design not found')

    // Check existing favorite
    const existing = await this.db.prepare(`
      SELECT id FROM user_favorites 
      WHERE user_id = ? AND design_id = ?
    `).bind(userId, designId).first()

    if (existing) {
      // Remove favorite
      await this.db.prepare(`
        DELETE FROM user_favorites 
        WHERE user_id = ? AND design_id = ?
      `).bind(userId, designId).run()
      
      return { is_favorited: false }
    } else {
      // Add favorite
      await this.db.prepare(`
        INSERT INTO user_favorites (user_id, design_id) 
        VALUES (?, ?)
      `).bind(userId, designId).run()
      
      return { is_favorited: true }
    }
  } catch (error) {
    // Proper error handling and logging
    console.error('Error toggling favorite:', error)
    throw error
  }
}
```

### Data Transformation Pipeline

```
Raw Database Row → Validation → Sanitization → Response Formatting

Example:
{
  id: 1,
  designname: "Silk Saree",
  cloudflare_image_id: "abc123",
  is_admin: 1,           // SQLite integer
  created_at: "2024-01-15 10:30:00"
}
                ↓
{
  id: 1,
  designname: "Silk Saree",
  image_urls: {
    thumbnail: "https://imagedelivery.net/account/abc123/thumbnail",
    medium: "https://imagedelivery.net/account/abc123/medium", 
    original: "https://imagedelivery.net/account/abc123"
  },
  is_admin: true,        // Converted to boolean
  created_at: "2024-01-15T10:30:00Z"
}
```

---

## ❌ Error Handling

### Error Hierarchy

```typescript
// Custom error classes with specific status codes
AppError (500)
├── ValidationError (400)
├── AuthenticationError (401)
├── AuthorizationError (403)
├── NotFoundError (404)
└── ConflictError (409)
```

### Error Processing Flow

```
1. Error occurs in route handler
        │
        ▼
2. Custom error thrown
   ├─ ValidationError: Bad input data
   ├─ AuthenticationError: Invalid/missing token
   ├─ AuthorizationError: Insufficient permissions
   ├─ NotFoundError: Resource not found
   └─ ConflictError: Duplicate resource
        │
        ▼
3. Error middleware catches error
   ├─ Log error with context
   ├─ Determine appropriate status code
   ├─ Format error response
   └─ Return JSON error
        │
        ▼
4. Client receives standardized error
   {
     "success": false,
     "message": "User-friendly message",
     "error": "ERROR_CODE",
     "timestamp": "2024-01-15T10:30:00Z"
   }
```

**Error Handler Implementation:**
```typescript
// src/utils/index.ts - ResponseUtils
static handleError(error: unknown): Response {
  console.error('API Error:', error)

  if (error instanceof AppError) {
    return ResponseUtils.json(
      ResponseUtils.error(error.message, error.code),
      error.statusCode
    )
  }

  // Fallback for unexpected errors
  return ResponseUtils.json(
    ResponseUtils.error('Internal server error'),
    500
  )
}
```

---

## 🔒 Security Implementation

### Password Security

```typescript
// Password hashing with bcrypt (12 rounds)
class SecurityUtils {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12  // High security level
    return bcrypt.hash(password, saltRounds)
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }
}
```

### JWT Token Management

```typescript
// JWT creation with proper claims
static async createJWT(payload: JWTPayload, secret: string, expiresIn: number) {
  const encoder = new TextEncoder()
  const secretKey = encoder.encode(secret)

  return new SignJWT({
    user_id: payload.user_id,
    username: payload.username,
    is_admin: payload.is_admin
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(secretKey)
}
```

### SQL Injection Prevention

```typescript
// Always use prepared statements
❌ BAD:
const query = `SELECT * FROM users WHERE username = '${username}'`

✅ GOOD:
const result = await db.prepare(`
  SELECT * FROM users WHERE username = ?
`).bind(username).first()
```

### Rate Limiting

```typescript
// Simple in-memory rate limiter
const rateLimitMiddleware = (requests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const clients = new Map<string, { count: number; resetTime: number }>()
  
  return async (c: Context, next: Next) => {
    const clientId = c.req.header('CF-Connecting-IP') || 'unknown'
    const now = Date.now()
    
    // Check and update rate limit
    // Return 429 if limit exceeded
  }
}
```

---

## ⚡ Performance Optimizations

### Database Query Optimization

```sql
-- Efficient indexing strategy
CREATE INDEX idx_designs_status ON designs(status);
CREATE INDEX idx_designs_featured ON designs(featured);
CREATE INDEX idx_designs_style ON designs(style);
CREATE INDEX idx_designs_created_at ON designs(created_at);

-- Optimized queries with proper LIMIT/OFFSET
SELECT * FROM designs 
WHERE status = 'active' 
ORDER BY created_at DESC 
LIMIT 20 OFFSET 0;
```

### Image URL Generation

```typescript
// Generate all variants at once for efficiency
getAllImageUrls(imageId: string) {
  const baseUrl = `https://imagedelivery.net/${this.accountId}/${imageId}`
  
  return {
    thumbnail: `${baseUrl}/thumbnail`,
    medium: `${baseUrl}/medium`,
    original: baseUrl
  }
}
```

### Response Caching Strategy

```typescript
// Cache-friendly response headers
c.res.headers.set('Cache-Control', 'public, max-age=300') // 5 minutes
c.res.headers.set('ETag', `"${designId}-${lastModified}"`)
```

### Pagination Efficiency

```typescript
// Efficient pagination with total count
const countQuery = `SELECT COUNT(*) as count FROM designs WHERE status = 'active'`
const dataQuery = `SELECT * FROM designs WHERE status = 'active' LIMIT ? OFFSET ?`

// Execute queries efficiently
const [countResult, designs] = await Promise.all([
  db.prepare(countQuery).first(),
  db.prepare(dataQuery).bind(limit, offset).all()
])
```

---

## 🔄 Data Flow Summary

### Complete Request-Response Cycle

```
Client Request
     │
     ▼
┌─────────────────┐
│ Cloudflare Edge │ ← Global CDN, DDoS protection
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Workers Runtime │ ← Middleware pipeline
│ • Logging       │
│ • CORS          │
│ • Rate Limiting │
│ • Auth Check    │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Route Handler   │ ← Business logic
│ • Validation    │
│ • Processing    │
│ • Error Handling│
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Service Layer   │ ← Data operations
│ • Database calls│
│ • External APIs │
│ • Transformations│
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Data Sources    │ ← Persistent storage
│ • Cloudflare D1 │
│ • CF Images     │
│ • KV Store      │
└─────────┬───────┘
          │
          ▼
    JSON Response
```

This architecture provides:
- **🚀 High Performance**: Edge computing with global distribution
- **🔒 Security**: Multiple layers of protection
- **📈 Scalability**: Automatic scaling with Cloudflare
- **🛠️ Maintainability**: Clean separation of concerns
- **📊 Observability**: Comprehensive logging and monitoring

---

**💡 This code flow guide serves as a reference for understanding the internal workings of the Design Gallery backend and can help with debugging, maintenance, and feature development.** 