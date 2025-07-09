# 🧪 **Complete API Testing Guide**

## 🌍 **Understanding Cloudflare Environments**

### **Environment Overview**
```
┌─────────────┬─────────────────┬─────────────────────────────┬─────────────────────┐
│ Environment │ Purpose         │ URL Pattern                 │ Database            │
├─────────────┼─────────────────┼─────────────────────────────┼─────────────────────┤
│ Development │ Daily testing   │ design-gallery-backend.*.dev│ design-gallery-db   │
│ Preview     │ Staging/testing │ *.pages.dev or custom       │ design-gallery-db-  │
│             │                 │                             │ preview             │
│ Production  │ Live users      │ your-domain.com             │ design-gallery-db-  │
│             │                 │                             │ prod                │
└─────────────┴─────────────────┴─────────────────────────────┴─────────────────────┘
```

### **Why Use Different Environments?**
- **Development**: Test new features without breaking production
- **Preview**: Final testing before production deployment  
- **Production**: Live application serving real users

---

## 🚀 **Setup and Deployment Commands**

### **1. Deploy to Different Environments**

```bash
# Deploy to development (default)
wrangler deploy

# Deploy to preview environment
wrangler deploy --env preview

# Deploy to production
wrangler deploy --env production
```

### **2. Database Operations**

```bash
# Apply migrations to remote databases
wrangler d1 migrations apply design-gallery-db --remote                    # Development
wrangler d1 migrations apply design-gallery-db-preview --env preview --remote  # Preview
wrangler d1 migrations apply design-gallery-db-prod --env production --remote  # Production

# Check database status
wrangler d1 execute design-gallery-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

### **3. Secret Management**

```bash
# Set secrets for each environment
wrangler secret put JWT_SECRET                    # Development
wrangler secret put JWT_SECRET --env preview     # Preview  
wrangler secret put JWT_SECRET --env production  # Production

# List secrets
wrangler secret list
wrangler secret list --env production
```

---

## 🔧 **API Testing Setup**

### **Base URLs for Testing**

```bash
# Get your deployment URLs
wrangler deployments list                    # Development
wrangler deployments list --env preview     # Preview
wrangler deployments list --env production  # Production

# Example URLs (replace with your actual URLs)
DEV_URL="https://design-gallery-backend.your-account.workers.dev"
PREVIEW_URL="https://design-gallery-backend-preview.your-account.workers.dev"  
PROD_URL="https://your-domain.com"
```

### **Testing Environment Variables**

```bash
# Set your testing environment
export API_BASE_URL="https://design-gallery-backend.your-account.workers.dev"
export ADMIN_TOKEN=""  # You'll get this after login
export USER_TOKEN=""   # You'll get this after user login
```

---

## 🔐 **Authentication Testing**

### **1. Create First Admin User**

```bash
# Connect to remote database and create admin user
wrangler d1 execute design-gallery-db --remote --command "
INSERT INTO users (username, password_hash, is_admin, is_approved, created_at, updated_at) 
VALUES (
  'admin', 
  '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiVSOPKz3.t6', 
  1, 
  1, 
  datetime('now'), 
  datetime('now')
);"

# This creates an admin user with:
# Username: admin
# Password: password123
```

### **2. Test Admin Login**

```bash
# Login as admin
curl -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'

# Expected response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "id": 1,
      "username": "admin",
      "is_admin": true,
      "is_approved": true
    }
  }
}

# Save the token for subsequent requests
export ADMIN_TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
```

### **3. Test User Registration**

```bash
# Register a new user
curl -X POST "$API_BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpassword123"
  }'

# Expected response:
{
  "success": true,
  "message": "Registration successful! Please wait for admin approval.",
  "data": {
    "id": 2,
    "username": "testuser",
    "is_admin": false,
    "is_approved": false
  }
}
```

### **4. Test Token Validation**

```bash
# Check if token is valid
curl -X GET "$API_BASE_URL/api/auth/check" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get current user profile
curl -X GET "$API_BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 🎨 **Design Management Testing**

### **1. Create a Design (Admin Only)**

```bash
# Create a new design
curl -X POST "$API_BASE_URL/api/designs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "title": "Elegant Red Saree",
    "description": "Beautiful traditional red saree with gold border",
    "short_description": "Red saree with gold border",
    "r2_object_key": "sarees/2024/01/elegant-red-saree.jpg",
    "category": "sarees",
    "style": "Traditional",
    "colour": "Red",
    "fabric": "Silk",
    "occasion": "Wedding",
    "featured": true
  }'
```

### **2. List Designs (Public)**

```bash
# Get all designs
curl -X GET "$API_BASE_URL/api/designs"

# Get designs with filters
curl -X GET "$API_BASE_URL/api/designs?category=sarees&style=Traditional&page=1&per_page=10"

# Get featured designs only
curl -X GET "$API_BASE_URL/api/designs/featured"
```

### **3. Get Single Design**

```bash
# Get design by ID (increments view count)
curl -X GET "$API_BASE_URL/api/designs/1"
```

### **4. Update Design (Admin Only)**

```bash
# Update a design
curl -X PUT "$API_BASE_URL/api/designs/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "title": "Updated Elegant Red Saree",
    "featured": false,
    "status": "active"
  }'
```

### **5. Delete Design (Admin Only)**

```bash
# Delete a design
curl -X DELETE "$API_BASE_URL/api/designs/1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 📸 **Image Upload Testing**

### **1. Upload Image (Admin Only)**

```bash
# Upload an image file
curl -X POST "$API_BASE_URL/api/upload/image" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@/path/to/your/image.jpg" \
  -F "category=sarees"

# Expected response:
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "object_key": "sarees/2024/01/20240101_12345678.jpg",
    "public_url": "https://pub-0b3de96b3a72833e38311290e9acfc3a.r2.dev/sarees/2024/01/20240101_12345678.jpg"
  }
}
```

### **2. List Uploaded Images**

```bash
# List all images
curl -X GET "$API_BASE_URL/api/upload/images" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# List images with prefix filter
curl -X GET "$API_BASE_URL/api/upload/images?prefix=sarees/&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### **3. Get Image Information**

```bash
# Get image metadata
curl -X GET "$API_BASE_URL/api/upload/image/sarees/2024/01/image.jpg/info" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### **4. Delete Image**

```bash
# Delete an image
curl -X DELETE "$API_BASE_URL/api/upload/image/sarees/2024/01/image.jpg" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 👑 **Admin Panel Testing**

### **1. User Management**

```bash
# List all users
curl -X GET "$API_BASE_URL/api/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get pending user approvals
curl -X GET "$API_BASE_URL/api/admin/users/pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Approve a user
curl -X POST "$API_BASE_URL/api/admin/users/2/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Reject a user
curl -X POST "$API_BASE_URL/api/admin/users/2/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Toggle admin privileges
curl -X POST "$API_BASE_URL/api/admin/users/2/toggle-admin" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Delete a user
curl -X DELETE "$API_BASE_URL/api/admin/users/2" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### **2. Bulk Operations**

```bash
# Bulk approve users
curl -X POST "$API_BASE_URL/api/admin/users/bulk-approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "user_ids": [2, 3, 4]
  }'
```

### **3. System Statistics**

```bash
# Get system stats
curl -X GET "$API_BASE_URL/api/admin/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### **4. App Settings**

```bash
# Get all settings
curl -X GET "$API_BASE_URL/api/admin/settings" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Update a setting
curl -X PUT "$API_BASE_URL/api/admin/settings/site_name" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "value": "My Design Gallery"
  }'
```

---

## 💎 **User Features Testing**

### **1. Favorites System (Authenticated Users)**

```bash
# Login as regular user first (after approval)
curl -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpassword123"
  }'

export USER_TOKEN="user_jwt_token_here"

# Add design to favorites
curl -X POST "$API_BASE_URL/api/designs/1/favorite" \
  -H "Authorization: Bearer $USER_TOKEN"

# Remove from favorites  
curl -X DELETE "$API_BASE_URL/api/designs/1/favorite" \
  -H "Authorization: Bearer $USER_TOKEN"

# Get user's favorites
curl -X GET "$API_BASE_URL/api/designs/user/favorites" \
  -H "Authorization: Bearer $USER_TOKEN"
```

---

## 🏥 **Health Checks and Monitoring**

### **1. API Health Check**

```bash
# Check API health
curl -X GET "$API_BASE_URL/health"

# Expected response:
{
  "success": true,
  "message": "Health check completed",
  "data": {
    "status": "healthy",
    "services": {
      "database": "healthy",
      "r2_storage": "healthy"
    },
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

### **2. R2 Storage Health Check**

```bash
# Check R2 storage connectivity
curl -X GET "$API_BASE_URL/api/upload/health"
```

---

## 🧪 **Testing Scripts**

### **Complete Test Script**

```bash
#!/bin/bash

# API Testing Script
API_BASE_URL="https://design-gallery-backend.your-account.workers.dev"

echo "🧪 Starting API Tests..."

# 1. Health Check
echo "1. Testing Health Check..."
curl -s "$API_BASE_URL/health" | jq .

# 2. Admin Login
echo "2. Testing Admin Login..."
ADMIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | jq -r '.data.access_token')
echo "Admin Token: ${ADMIN_TOKEN:0:20}..."

# 3. Create Design
echo "3. Testing Design Creation..."
curl -s -X POST "$API_BASE_URL/api/designs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "title": "Test Saree",
    "description": "Test description",
    "r2_object_key": "test/saree.jpg",
    "category": "sarees"
  }' | jq .

# 4. List Designs
echo "4. Testing Design Listing..."
curl -s "$API_BASE_URL/api/designs" | jq .

echo "✅ API Tests Completed!"
```

### **Performance Testing**

```bash
# Load testing with ab (Apache Bench)
ab -n 100 -c 10 "$API_BASE_URL/api/designs"

# Load testing with curl
for i in {1..10}; do
  curl -s "$API_BASE_URL/health" > /dev/null &
done
wait
echo "Parallel requests completed"
```

---

## ⚠️ **Common Testing Issues & Solutions**

### **1. Authentication Errors**
```bash
# Problem: 401 Unauthorized
# Solution: Check token format and expiration
curl -X GET "$API_BASE_URL/api/auth/check" \
  -H "Authorization: Bearer $TOKEN"
```

### **2. CORS Issues**
```bash
# Problem: CORS errors in browser
# Solution: Check CORS_ORIGINS in wrangler.toml
# For development: CORS_ORIGINS = "*"
# For production: CORS_ORIGINS = "https://yourdomain.com"
```

### **3. Database Connection Issues**
```bash
# Problem: Database errors
# Solution: Check database ID and apply migrations
wrangler d1 migrations apply design-gallery-db --remote
```

### **4. File Upload Issues**
```bash
# Problem: File upload fails
# Solution: Check R2 bucket exists and is configured
wrangler r2 bucket list
```

---

## 📊 **Monitoring and Logs**

### **View Real-time Logs**

```bash
# Tail development logs
wrangler tail

# Tail production logs
wrangler tail --env production

# Filter logs
wrangler tail --format pretty
```

### **Analytics and Metrics**

```bash
# Get deployment info
wrangler deployments list

# Get worker info
wrangler whoami
```

---

## 🎯 **Testing Checklist**

### **✅ Basic Functionality**
- [ ] Health check returns 200
- [ ] Admin can login and get JWT token
- [ ] New users can register
- [ ] Admin can approve/reject users
- [ ] Designs can be created, read, updated, deleted
- [ ] Images can be uploaded to R2
- [ ] Favorites system works

### **✅ Security Testing**
- [ ] Unauthenticated requests return 401
- [ ] Non-admin users cannot access admin endpoints
- [ ] JWT tokens expire correctly
- [ ] Input validation works
- [ ] Rate limiting functions (if enabled)

### **✅ Performance Testing**
- [ ] API responds under 500ms for simple requests
- [ ] Database queries are optimized
- [ ] File uploads complete successfully
- [ ] Concurrent requests handled properly

### **✅ Error Handling**
- [ ] Invalid JSON returns 400
- [ ] Missing resources return 404
- [ ] Server errors return 500 with proper messages
- [ ] Validation errors provide clear feedback

---

## 🚀 **Production Deployment Checklist**

### **Before Production Deploy**
- [ ] All tests pass in preview environment
- [ ] Database migrations applied
- [ ] Production secrets configured
- [ ] Custom domain configured (optional)
- [ ] CORS settings updated for production
- [ ] Rate limiting configured
- [ ] Error monitoring setup

### **After Production Deploy**
- [ ] Health check passes
- [ ] Admin login works
- [ ] Key user journeys tested
- [ ] Performance monitoring active
- [ ] Backup procedures documented

---

**🎉 Your API is now ready for comprehensive testing!**

Use this guide to test all functionality across development, preview, and production environments. Each environment serves a specific purpose in your development workflow. 