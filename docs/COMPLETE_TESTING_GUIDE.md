# Complete Testing Guide - Design Gallery Backend API

This comprehensive guide will walk you through setting up and testing the entire Design Gallery Backend API from scratch, including environment configuration, Cloudflare services setup, and complete API testing.

## 📋 Prerequisites

Before starting, ensure you have:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Cloudflare account](https://cloudflare.com/) (free tier is sufficient)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed globally
- [curl](https://curl.se/) or [Postman](https://postman.com/) for API testing

## 🚀 Step 1: Initial Setup

### 1.1 Install Dependencies

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd design-gallery-backend

# Install dependencies
npm install

# Install Wrangler CLI globally (if not already installed)
npm install -g wrangler
```

### 1.2 Login to Cloudflare

```bash
# Login to your Cloudflare account
wrangler login

# Verify login
wrangler whoami
```

### 1.3 Get Your Cloudflare Account ID

```bash
# List your accounts to get the Account ID
wrangler account list

# Note down your Account ID for later use
```

## 🗄️ Step 2: Database Setup (Cloudflare D1)

### 2.1 Create D1 Database

```bash
# Create a new D1 database
wrangler d1 create design-gallery-db

# Note the database ID from the output - you'll need this for wrangler.toml
```

### 2.2 Update wrangler.toml Configuration

Create or update your `wrangler.toml` file:

```toml
name = "design-gallery-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Environment variables (non-sensitive only)
[vars]
ENVIRONMENT = "development"
# JWT_SECRET is stored as a Cloudflare secret - not here!
CORS_ORIGINS = "*"
MAX_FILE_SIZE = "10485760"
DEFAULT_PAGE_SIZE = "20"
MAX_PAGE_SIZE = "100"
R2_PUBLIC_URL = "https://pub-YOUR-ACCOUNT-ID.r2.dev"  # Replace with your actual R2 public URL
CLOUDFLARE_ACCOUNT_ID = "your-cloudflare-account-id"  # Replace with your actual account ID

# D1 Database binding
[[d1_databases]]
binding = "DB"
database_name = "design-gallery-db"
database_id = "your-d1-database-id"  # Replace with your actual database ID

# R2 Storage binding
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "designs"

# Production environment configuration
[env.production]
vars = { 
  ENVIRONMENT = "production",
  CORS_ORIGINS = "https://yourdomain.com",
  R2_PUBLIC_URL = "https://your-production-r2-domain.com",
  CLOUDFLARE_ACCOUNT_ID = "your-cloudflare-account-id"
}
# JWT_SECRET for production is stored as a Cloudflare secret

[[env.production.d1_databases]]
binding = "DB"
database_name = "design-gallery-db-prod"
database_id = "your-production-database-id"

[[env.production.r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "design-gallery-images-prod"
```

## 🔐 **Important: Setting Up Secrets**

**Never store sensitive values in wrangler.toml!** Instead, use Cloudflare secrets:

```bash
# Set JWT secret for each environment
wrangler secret put JWT_SECRET
wrangler secret put JWT_SECRET --env production

# Verify secrets are set
wrangler secret list
```

### 2.3 Run Database Migrations

```bash
# Apply migrations to local development database
npm run db:migrate:local

# Verify migration success
wrangler d1 execute design-gallery-db --local --command "SELECT name FROM sqlite_master WHERE type='table';"

# You should see: users, designs, user_favorites, app_settings
```

## 🪣 Step 3: R2 Storage Setup

### 3.1 Create R2 Bucket

```bash
# Create R2 bucket for development
wrangler r2 bucket create design-gallery-images

# Create R2 bucket for production (optional for now)
wrangler r2 bucket create design-gallery-images-prod

# List buckets to verify creation
wrangler r2 bucket list
```

### 3.2 Configure R2 Public Access (Optional)

If you want to serve images directly from R2:

```bash
# Enable public access for your bucket (optional)
wrangler r2 bucket cors put design-gallery-images --rules '[{
  "AllowedOrigins": ["*"],
  "AllowedMethods": ["GET"],
  "AllowedHeaders": ["*"]
}]'
```

## 🔧 Step 4: Development Server Setup

### 4.1 Start Development Server

```bash
# Start the development server
npm run dev

# The server should start on http://localhost:8787
```

### 4.2 Verify Server is Running

```bash
# Test basic connectivity
curl http://localhost:8787/

# Expected response:
{
  "success": true,
  "message": "API is running successfully",
  "data": {
    "message": "Design Gallery API",
    "version": "1.0.0",
    "environment": "development",
    "status": "running",
    ...
  }
}
```

### 4.3 Health Check

```bash
# Check health endpoint
curl http://localhost:8787/health

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
    ...
  }
}
```

## 🔐 Step 5: Authentication Testing

### 5.1 Create First Admin User

Since the system requires admin approval, you need to create the first admin user manually:

```bash
# Connect to local database
wrangler d1 execute design-gallery-db --local --command "
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
# Admin: true
# Approved: true
```

### 5.2 Test User Registration

```bash
# Test user registration
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpassword123"
  }'

# Expected response:
{
  "success": true,
  "message": "User registered successfully. Awaiting admin approval.",
  "data": {
    "user": {
      "id": 2,
      "username": "testuser",
      "is_admin": false,
      "is_approved": false,
      ...
    }
  }
}
```

### 5.3 Test Admin Login

```bash
# Login as admin to get JWT token
curl -X POST http://localhost:8787/api/auth/login \
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
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "is_admin": true,
      "is_approved": true,
      ...
    }
  }
}

# Save the token for subsequent requests
export ADMIN_TOKEN="your-jwt-token-here"
```

## 🖼️ Step 6: Image Upload Testing

### 6.1 Test Image Upload

```bash
# Create a test image file (or use an existing one)
curl -o test-image.jpg "https://via.placeholder.com/800x600/0000FF/FFFFFF?text=Test+Design"

# Upload image to R2
curl -X POST http://localhost:8787/api/upload/image \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@test-image.jpg" \
  -F "category=sarees"

# Expected response:
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "object_key": "sarees/2024/01/20240101_12345678.jpg",
    "public_url": "https://your-domain.com/sarees/2024/01/20240101_12345678.jpg",
    "message": "Image uploaded successfully",
    "success": true
  }
}

# Save the object_key for design creation
export IMAGE_KEY="sarees/2024/01/20240101_12345678.jpg"
```

### 6.2 Test Image Listing

```bash
# List uploaded images
curl -X GET "http://localhost:8787/api/upload/images?limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected response:
{
  "success": true,
  "message": "Images listed successfully",
  "data": {
    "images": [
      {
        "key": "sarees/2024/01/20240101_12345678.jpg",
        "size": 45678,
        "lastModified": "2024-01-01T12:00:00.000Z",
        "public_url": "https://your-domain.com/sarees/2024/01/20240101_12345678.jpg"
      }
    ],
    "count": 1,
    "limit": 10
  }
}
```

## 🎨 Step 7: Design Management Testing

### 7.1 Create a Design

```bash
# Create a new design using the uploaded image
curl -X POST http://localhost:8787/api/designs \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Elegant Blue Silk Saree",
    "description": "A beautiful traditional silk saree perfect for special occasions",
    "short_description": "Blue silk saree with golden border",
    "long_description": "This exquisite blue silk saree features intricate golden embroidery along the border, making it perfect for weddings and festivals. The rich fabric drapes beautifully and the color combination is both elegant and traditional.",
    "r2_object_key": "'$IMAGE_KEY'",
    "category": "sarees",
    "style": "traditional",
    "colour": "blue",
    "fabric": "silk",
    "occasion": "wedding",
    "size_available": "Free Size",
    "price_range": "5000-10000",
    "tags": "silk,traditional,wedding,blue,elegant",
    "featured": true,
    "designer_name": "Meera Textiles",
    "collection_name": "Royal Heritage",
    "season": "all-season"
  }'

# Expected response:
{
  "success": true,
  "message": "Design created successfully",
  "data": {
    "id": 1,
    "title": "Elegant Blue Silk Saree",
    "description": "A beautiful traditional silk saree...",
    "image_url": "https://your-domain.com/sarees/2024/01/...",
    "r2_object_key": "sarees/2024/01/20240101_12345678.jpg",
    "category": "sarees",
    "featured": true,
    "status": "active",
    "view_count": 0,
    "like_count": 0,
    ...
  }
}

# Save the design ID for further testing
export DESIGN_ID=1
```

### 7.2 Test Design Retrieval

```bash
# Get all designs
curl "http://localhost:8787/api/designs?page=1&per_page=10"

# Get featured designs
curl "http://localhost:8787/api/designs/featured?limit=5"

# Get specific design (this increments view count)
curl "http://localhost:8787/api/designs/$DESIGN_ID"

# Search designs
curl "http://localhost:8787/api/designs?q=silk&category=sarees&colour=blue"
```

### 7.3 Test Design Updates

```bash
# Update design
curl -X PUT http://localhost:8787/api/designs/$DESIGN_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Elegant Blue Silk Saree",
    "featured": false,
    "price_range": "7000-12000"
  }'
```

## 👥 Step 8: User Management Testing

### 8.1 Approve Pending User

```bash
# Get pending users
curl -X GET "http://localhost:8787/api/admin/users/pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Approve the test user (replace USER_ID with actual ID)
export USER_ID=2
curl -X POST "http://localhost:8787/api/admin/users/$USER_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 8.2 Test Approved User Login

```bash
# Login as the approved test user
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpassword123"
  }'

# Save the user token
export USER_TOKEN="user-jwt-token-here"
```

### 8.3 Test User Favorites

```bash
# Add design to favorites
curl -X POST "http://localhost:8787/api/designs/$DESIGN_ID/favorite" \
  -H "Authorization: Bearer $USER_TOKEN"

# Get user favorites
curl -X GET "http://localhost:8787/api/designs/user/favorites" \
  -H "Authorization: Bearer $USER_TOKEN"

# Remove from favorites
curl -X DELETE "http://localhost:8787/api/designs/$DESIGN_ID/favorite" \
  -H "Authorization: Bearer $USER_TOKEN"
```

## 📊 Step 9: Admin Panel Testing

### 9.1 Test System Statistics

```bash
# Get system statistics
curl -X GET "http://localhost:8787/api/admin/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected response includes:
# - User statistics (total, approved, pending, admins)
# - Design statistics (total, active, featured)
# - Engagement metrics (views, likes, favorites)
# - Top designs by views and likes
# - Recent activity
```

### 9.2 Test User Management

```bash
# List all users
curl -X GET "http://localhost:8787/api/admin/users?page=1&per_page=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# List users by status
curl -X GET "http://localhost:8787/api/admin/users?status=approved" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Bulk approve users (replace with actual user IDs)
curl -X POST "http://localhost:8787/api/admin/users/bulk-approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": [2, 3, 4]
  }'
```

### 9.3 Test App Settings

```bash
# Create app setting
curl -X POST "http://localhost:8787/api/admin/settings" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "app_name",
    "value": "Design Gallery",
    "description": "Application name displayed in the app"
  }'

# Get all settings
curl -X GET "http://localhost:8787/api/admin/settings" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Update setting
curl -X PUT "http://localhost:8787/api/admin/settings/app_name" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "Design Gallery Pro",
    "description": "Updated application name"
  }'
```

## 🧪 Step 10: Advanced Testing Scenarios

### 10.1 Test Pagination

```bash
# Create multiple designs for pagination testing
for i in {2..10}; do
  curl -X POST http://localhost:8787/api/designs \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Test Design '$i'",
      "description": "Test design for pagination",
      "r2_object_key": "'$IMAGE_KEY'",
      "category": "sarees"
    }'
done

# Test pagination
curl "http://localhost:8787/api/designs?page=1&per_page=5"
curl "http://localhost:8787/api/designs?page=2&per_page=5"
```

### 10.2 Test Search and Filtering

```bash
# Full-text search
curl "http://localhost:8787/api/designs?q=silk"

# Filter by category
curl "http://localhost:8787/api/designs?category=sarees"

# Filter by multiple criteria
curl "http://localhost:8787/api/designs?category=sarees&colour=blue&featured=true"

# Filter by designer
curl "http://localhost:8787/api/designs?designer_name=Meera%20Textiles"
```

### 10.3 Test Error Handling

```bash
# Test invalid authentication
curl -X GET "http://localhost:8787/api/admin/users" \
  -H "Authorization: Bearer invalid-token"

# Test non-existent design
curl "http://localhost:8787/api/designs/999999"

# Test invalid file upload
curl -X POST http://localhost:8787/api/upload/image \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@invalid-file.txt"

# Test unauthorized access
curl -X POST "http://localhost:8787/api/admin/users/1/approve" \
  -H "Authorization: Bearer $USER_TOKEN"
```

## 🚀 Step 11: Production Deployment Testing

### 11.1 Deploy to Production

```bash
# Deploy to production
npm run deploy

# Or deploy with specific environment
wrangler deploy --env production
```

### 11.2 Test Production Deployment

```bash
# Replace with your actual production URL
export PROD_URL="https://design-gallery-api.your-subdomain.workers.dev"

# Test production health
curl "$PROD_URL/health"

# Test production info
curl "$PROD_URL/info"
```

## 🛠️ Step 12: Troubleshooting Common Issues

### 12.1 Database Issues

```bash
# Check database status
wrangler d1 info design-gallery-db

# Reset local database if needed
wrangler d1 execute design-gallery-db --local --command "DROP TABLE IF EXISTS users;"
npm run db:migrate:local

# Check database contents
wrangler d1 execute design-gallery-db --local --command "SELECT * FROM users LIMIT 5;"
```

### 12.2 R2 Storage Issues

```bash
# Check R2 bucket status
wrangler r2 bucket list

# Test R2 connectivity
wrangler r2 object list design-gallery-images --limit 10

# Check bucket permissions
wrangler r2 bucket cors get design-gallery-images
```

### 12.3 Authentication Issues

```bash
# Verify JWT secret is set
grep JWT_SECRET wrangler.toml

# Check user approval status
wrangler d1 execute design-gallery-db --local --command "SELECT username, is_approved, is_admin FROM users;"

# Reset admin password if needed
wrangler d1 execute design-gallery-db --local --command "
UPDATE users 
SET password_hash = '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiVSOPKz3.t6' 
WHERE username = 'admin';"
```

## 📝 Step 13: Testing Checklist

Use this checklist to ensure all functionality is working:

### ✅ Basic Setup
- [ ] Dependencies installed
- [ ] Wrangler CLI configured
- [ ] Database created and migrated
- [ ] R2 bucket created
- [ ] Development server starts without errors

### ✅ Authentication
- [ ] Admin user can login
- [ ] User registration works
- [ ] Admin approval process works
- [ ] JWT tokens are generated correctly
- [ ] Protected routes require authentication

### ✅ Design Management
- [ ] Designs can be created (admin only)
- [ ] Designs can be retrieved (with/without auth)
- [ ] Designs can be updated (admin only)
- [ ] Designs can be deleted (admin only)
- [ ] Search and filtering works
- [ ] Pagination works correctly
- [ ] View counts increment correctly

### ✅ Image Upload
- [ ] Images upload to R2 successfully
- [ ] Image validation works (type, size)
- [ ] Images can be listed
- [ ] Images can be deleted
- [ ] Image metadata is stored correctly

### ✅ User Favorites
- [ ] Users can add favorites
- [ ] Users can remove favorites
- [ ] Favorites list is retrieved correctly
- [ ] Like counts update correctly

### ✅ Admin Panel
- [ ] User management works
- [ ] System statistics are accurate
- [ ] Bulk operations work
- [ ] App settings can be managed

### ✅ Error Handling
- [ ] Invalid requests return appropriate errors
- [ ] Unauthorized access is blocked
- [ ] Rate limiting works
- [ ] 404 errors for non-existent resources

### ✅ Production
- [ ] Production deployment succeeds
- [ ] Production health checks pass
- [ ] Production environment variables are set
- [ ] Production database migrations applied

## 🎉 Success!

If all tests pass, your Design Gallery Backend API is fully functional and ready for production use. The API now provides:

- **Complete authentication system** with admin approval
- **Comprehensive design management** with rich metadata
- **Efficient R2 image storage** with organized file structure
- **Advanced search and filtering** capabilities
- **User favorites system** with engagement tracking
- **Full admin panel** with analytics and user management
- **Production-ready deployment** on Cloudflare Workers

## 📚 Additional Resources

- [API Documentation](./API_DOCUMENTATION.md) - Detailed API reference
- [Code Flow Guide](./CODE_FLOW_GUIDE.md) - Architecture overview
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)

---

**Happy Testing! 🚀** 