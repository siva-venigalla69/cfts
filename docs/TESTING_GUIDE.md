# Design Gallery Backend - Testing Guide 🧪

This comprehensive testing guide covers manual testing procedures, automated testing strategies, and step-by-step instructions for validating all functionality of the Design Gallery backend.

## 📋 Table of Contents

1. [Quick Test Setup](#quick-test-setup)
2. [Manual Testing Procedures](#manual-testing-procedures)
3. [API Testing with cURL](#api-testing-with-curl)
4. [Automated Testing](#automated-testing)
5. [Performance Testing](#performance-testing)
6. [Security Testing](#security-testing)
7. [Integration Testing](#integration-testing)
8. [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Test Setup

### Prerequisites

1. **Backend Running**: Ensure the backend is running locally or deployed
   ```bash
   npm run dev  # For local development
   # OR
   # Access your deployed Worker URL
   ```

2. **Test Environment Variables**:
   ```bash
   export API_BASE_URL="http://localhost:8787"  # Local
   # OR
   export API_BASE_URL="https://your-worker.your-subdomain.workers.dev"  # Deployed
   ```

3. **Install Testing Tools**:
   ```bash
   # For API testing
   brew install curl jq  # macOS
   # OR
   sudo apt-get install curl jq  # Ubuntu

   # Optional: Install HTTPie for easier API testing
   pip install httpie
   ```

---

## 🧪 Manual Testing Procedures

### Test Suite 1: Health & Info Endpoints

#### Test 1.1: Root Endpoint
```bash
curl -X GET "$API_BASE_URL/"
```

**Expected Result**:
```json
{
  "success": true,
  "message": "Design Gallery API is running",
  "data": {
    "name": "Design Gallery Backend API",
    "version": "1.0.0",
    "environment": "development",
    "status": "operational"
  }
}
```

#### Test 1.2: Health Check
```bash
curl -X GET "$API_BASE_URL/health"
```

**Expected Result**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "checks": {
    "database": {
      "status": "healthy",
      "latency_ms": 25
    },
    "storage": {
      "status": "healthy"
    }
  }
}
```

#### Test 1.3: API Documentation (Development Only)
```bash
curl -X GET "$API_BASE_URL/docs"
```

**Expected Result**: Comprehensive API documentation JSON

---

### Test Suite 2: Authentication Flow

#### Test 2.1: User Registration

**Step 1**: Register a new user
```bash
curl -X POST "$API_BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser1",
    "password": "testpass123"
  }'
```

**Expected Result**:
```json
{
  "success": true,
  "message": "Registration successful! Please wait for admin approval.",
  "data": {
    "id": 3,
    "username": "testuser1",
    "is_admin": false,
    "is_approved": false,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Step 2**: Try to register with same username (should fail)
```bash
curl -X POST "$API_BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser1",
    "password": "anotherpass123"
  }'
```

**Expected Result**: 409 Conflict error

**Step 3**: Test validation errors
```bash
# Short username
curl -X POST "$API_BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ab",
    "password": "testpass123"
  }'

# Short password  
curl -X POST "$API_BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "validuser",
    "password": "12345"
  }'
```

**Expected Result**: 400 Validation errors

#### Test 2.2: User Login

**Step 1**: Try login with unapproved user
```bash
curl -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser1",
    "password": "testpass123"
  }'
```

**Expected Result**: 401 Authentication error (pending approval)

**Step 2**: Login with admin user (pre-seeded)
```bash
curl -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Expected Result**:
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
      "is_approved": true
    }
  }
}
```

**Step 3**: Save admin token for further tests
```bash
# Save the token from the login response
export ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Test 2.3: Token Validation

**Step 1**: Get current user profile
```bash
curl -X GET "$API_BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Result**: Admin user profile

**Step 2**: Check token validity
```bash
curl -X GET "$API_BASE_URL/api/auth/check" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Result**:
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "valid": true,
    "user": {
      "user_id": 1,
      "username": "admin",
      "is_admin": true
    }
  }
}
```

---

### Test Suite 3: User Management (Admin Functions)

#### Test 3.1: User Approval

**Step 1**: Get pending users
```bash
curl -X GET "$API_BASE_URL/api/admin/users/pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Result**: List of unapproved users including testuser1

**Step 2**: Approve the test user
```bash
curl -X POST "$API_BASE_URL/api/admin/users/3/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Result**: Success message

**Step 3**: Verify user can now login
```bash
curl -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser1",
    "password": "testpass123"
  }'
```

**Expected Result**: Successful login with token

```bash
# Save the user token
export USER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Test 3.2: List All Users

```bash
curl -X GET "$API_BASE_URL/api/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Result**: Paginated list of all users

#### Test 3.3: Get Analytics

```bash
curl -X GET "$API_BASE_URL/api/admin/analytics" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Result**:
```json
{
  "success": true,
  "data": {
    "users": {
      "total_users": 3,
      "approved_users": 2,
      "pending_users": 1,
      "admin_users": 1
    },
    "designs": {
      "total_designs": 3,
      "active_designs": 3,
      "featured_designs": 2
    }
  }
}
```

---

### Test Suite 4: Design Management

#### Test 4.1: List Designs (Public Access)

**Step 1**: Get all designs (no authentication)
```bash
curl -X GET "$API_BASE_URL/api/designs"
```

**Expected Result**: List of active designs with image URLs

**Step 2**: Get designs with filters
```bash
curl -X GET "$API_BASE_URL/api/designs?style=Traditional&page=1&limit=5"
```

**Expected Result**: Filtered and paginated results

**Step 3**: Search designs
```bash
curl -X GET "$API_BASE_URL/api/designs?q=saree"
```

**Expected Result**: Designs matching search term

#### Test 4.2: Get Single Design

```bash
curl -X GET "$API_BASE_URL/api/designs/1"
```

**Expected Result**: Complete design details with image URLs

#### Test 4.3: Create Design (Admin Only)

```bash
curl -X POST "$API_BASE_URL/api/designs" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "designname": "Test Lehenga",
    "style": "Contemporary",
    "colour": "Pink",
    "short_description": "Beautiful test lehenga",
    "long_description": "This is a test lehenga for API testing purposes.",
    "categories": "lehenga,test,contemporary",
    "cloudflare_image_id": "test-image-id-123",
    "featured": true,
    "designer_name": "Test Designer",
    "collection_name": "Test Collection"
  }'
```

**Expected Result**: Created design with generated ID

#### Test 4.4: Update Design (Admin Only)

```bash
# Assuming design ID 4 was created above
curl -X PUT "$API_BASE_URL/api/designs/4" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "short_description": "Updated test lehenga description",
    "featured": false
  }'
```

**Expected Result**: Updated design data

---

### Test Suite 5: Favorites System

#### Test 5.1: Toggle Favorites

**Step 1**: Add design to favorites
```bash
curl -X POST "$API_BASE_URL/api/designs/1/favorite" \
  -H "Authorization: Bearer $USER_TOKEN"
```

**Expected Result**:
```json
{
  "success": true,
  "message": "Design added to favorites",
  "data": {
    "is_favorited": true
  }
}
```

**Step 2**: Remove design from favorites
```bash
curl -X POST "$API_BASE_URL/api/designs/1/favorite" \
  -H "Authorization: Bearer $USER_TOKEN"
```

**Expected Result**:
```json
{
  "success": true,
  "message": "Design removed from favorites",
  "data": {
    "is_favorited": false
  }
}
```

**Step 3**: Add multiple favorites
```bash
curl -X POST "$API_BASE_URL/api/designs/1/favorite" \
  -H "Authorization: Bearer $USER_TOKEN"

curl -X POST "$API_BASE_URL/api/designs/2/favorite" \
  -H "Authorization: Bearer $USER_TOKEN"
```

#### Test 5.2: Get User Favorites

```bash
curl -X GET "$API_BASE_URL/api/designs/favorites" \
  -H "Authorization: Bearer $USER_TOKEN"
```

**Expected Result**: List of user's favorite designs

---

### Test Suite 6: Error Handling

#### Test 6.1: Authentication Errors

**Step 1**: Access protected route without token
```bash
curl -X GET "$API_BASE_URL/api/auth/me"
```

**Expected Result**: 401 Unauthorized

**Step 2**: Access protected route with invalid token
```bash
curl -X GET "$API_BASE_URL/api/auth/me" \
  -H "Authorization: Bearer invalid-token"
```

**Expected Result**: 401 Unauthorized

**Step 3**: Access admin route as regular user
```bash
curl -X GET "$API_BASE_URL/api/admin/users" \
  -H "Authorization: Bearer $USER_TOKEN"
```

**Expected Result**: 403 Forbidden

#### Test 6.2: Validation Errors

**Step 1**: Send invalid JSON
```bash
curl -X POST "$API_BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username": "test"'  # Invalid JSON
```

**Expected Result**: 400 Bad Request

**Step 2**: Missing required fields
```bash
curl -X POST "$API_BASE_URL/api/designs" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "style": "Traditional"
  }'  # Missing required designname
```

**Expected Result**: 400 Validation Error

#### Test 6.3: Not Found Errors

```bash
curl -X GET "$API_BASE_URL/api/designs/99999"
```

**Expected Result**: 404 Not Found

---

## 🚀 API Testing with cURL

### Complete Test Script

Create a test script `test-api.sh`:

```bash
#!/bin/bash

# Configuration
API_BASE_URL="http://localhost:8787"
TEST_USERNAME="apitest_$(date +%s)"
TEST_PASSWORD="testpass123"

echo "🧪 Design Gallery API Test Suite"
echo "================================"

# Test 1: Health Check
echo "1. Testing health endpoint..."
health_response=$(curl -s "$API_BASE_URL/health")
if echo "$health_response" | grep -q "healthy"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

# Test 2: Admin Login
echo "2. Logging in as admin..."
admin_login=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "admin123"}')

ADMIN_TOKEN=$(echo "$admin_login" | jq -r '.data.access_token')
if [ "$ADMIN_TOKEN" != "null" ]; then
    echo "✅ Admin login successful"
else
    echo "❌ Admin login failed"
    exit 1
fi

# Test 3: User Registration
echo "3. Registering new user..."
register_response=$(curl -s -X POST "$API_BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$TEST_USERNAME\", \"password\": \"$TEST_PASSWORD\"}")

if echo "$register_response" | grep -q "success.*true"; then
    echo "✅ User registration successful"
else
    echo "❌ User registration failed"
    exit 1
fi

# Test 4: Get Designs
echo "4. Fetching designs..."
designs_response=$(curl -s "$API_BASE_URL/api/designs")
if echo "$designs_response" | grep -q "success.*true"; then
    echo "✅ Design listing successful"
else
    echo "❌ Design listing failed"
    exit 1
fi

# Test 5: Create Design (Admin)
echo "5. Creating new design..."
create_design=$(curl -s -X POST "$API_BASE_URL/api/designs" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "designname": "API Test Design",
        "style": "Test",
        "colour": "Blue",
        "short_description": "Test design for API validation",
        "cloudflare_image_id": "test-image-123"
    }')

if echo "$create_design" | grep -q "success.*true"; then
    echo "✅ Design creation successful"
    DESIGN_ID=$(echo "$create_design" | jq -r '.data.id')
else
    echo "❌ Design creation failed"
    exit 1
fi

echo ""
echo "🎉 All tests passed!"
echo "Test user: $TEST_USERNAME"
echo "Design ID: $DESIGN_ID"
echo "Admin token: ${ADMIN_TOKEN:0:20}..."
```

Make it executable and run:
```bash
chmod +x test-api.sh
./test-api.sh
```

---

## 🔧 Automated Testing

### Unit Tests Setup

Create `tests/setup.ts`:
```typescript
import { beforeAll, afterAll, beforeEach } from 'vitest'

// Global test setup
beforeAll(async () => {
  // Setup test database
  console.log('Setting up test environment...')
})

afterAll(async () => {
  // Cleanup
  console.log('Cleaning up test environment...')
})

beforeEach(async () => {
  // Reset state before each test
})
```

### Sample Unit Tests

Create `tests/unit/auth.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { SecurityUtils } from '../../src/utils'

describe('SecurityUtils', () => {
  it('should hash passwords correctly', async () => {
    const password = 'testpassword123'
    const hash = await SecurityUtils.hashPassword(password)
    
    expect(hash).toBeDefined()
    expect(hash).not.toBe(password)
    expect(hash.length).toBeGreaterThan(50)
  })

  it('should verify passwords correctly', async () => {
    const password = 'testpassword123'
    const hash = await SecurityUtils.hashPassword(password)
    
    const isValid = await SecurityUtils.verifyPassword(password, hash)
    expect(isValid).toBe(true)
    
    const isInvalid = await SecurityUtils.verifyPassword('wrongpassword', hash)
    expect(isInvalid).toBe(false)
  })

  it('should extract bearer tokens correctly', () => {
    const validHeader = 'Bearer abc123token'
    const token = SecurityUtils.extractBearerToken(validHeader)
    expect(token).toBe('abc123token')
    
    const invalidHeader = 'Basic abc123'
    const noToken = SecurityUtils.extractBearerToken(invalidHeader)
    expect(noToken).toBeNull()
  })
})
```

### Integration Tests

Create `tests/integration/auth.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { app } from '../../src/index'

describe('Authentication Integration', () => {
  let testEnv: any

  beforeEach(() => {
    // Setup test environment
    testEnv = {
      DB: mockD1Database,
      JWT_SECRET: 'test-secret',
      // ... other env vars
    }
  })

  it('should register a new user', async () => {
    const response = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123'
      })
    }, testEnv)

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.username).toBe('testuser')
  })

  it('should login with valid credentials', async () => {
    // First register user
    await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123'
      })
    }, testEnv)

    // Then login
    const response = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123'
      })
    }, testEnv)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.access_token).toBeDefined()
  })
})
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test auth.test.ts

# Run in watch mode
npm run test:watch
```

---

## 📊 Performance Testing

### Load Testing with Artillery

Install Artillery:
```bash
npm install -g artillery
```

Create `artillery-config.yml`:
```yaml
config:
  target: 'http://localhost:8787'
  phases:
    - duration: 60
      arrivalRate: 10
  variables:
    username:
      - "user1"
      - "user2"
      - "user3"

scenarios:
  - name: "Design Gallery Load Test"
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
          url: "/api/designs/1"
```

Run performance test:
```bash
artillery run artillery-config.yml
```

### Stress Testing

Create `stress-test.sh`:
```bash
#!/bin/bash

echo "🔥 Stress Testing Design Gallery API"

# Concurrent requests to different endpoints
for i in {1..100}; do
    curl -s "$API_BASE_URL/health" > /dev/null &
    curl -s "$API_BASE_URL/api/designs" > /dev/null &
    curl -s "$API_BASE_URL/" > /dev/null &
done

wait
echo "✅ Stress test completed"
```

---

## 🔒 Security Testing

### Authentication Security Tests

```bash
# Test 1: SQL Injection in username
curl -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin'\'''; DROP TABLE users; --",
    "password": "any"
  }'

# Expected: Should not succeed and not break the system

# Test 2: XSS in design name
curl -X POST "$API_BASE_URL/api/designs" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "designname": "<script>alert(\"xss\")</script>",
    "cloudflare_image_id": "test"
  }'

# Expected: Should be handled safely

# Test 3: Rate limiting
for i in {1..150}; do
    curl -s "$API_BASE_URL/api/designs" > /dev/null
done

# Expected: Should eventually return 429 Too Many Requests
```

### JWT Security Tests

```bash
# Test 1: Tampered JWT
TAMPERED_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwiaXNfYWRtaW4iOnRydWV9.tamperedSignature"

curl -X GET "$API_BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $TAMPERED_TOKEN"

# Expected: 401 Unauthorized

# Test 2: Expired JWT (if you have one)
EXPIRED_TOKEN="your-expired-token-here"

curl -X GET "$API_BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $EXPIRED_TOKEN"

# Expected: 401 Unauthorized
```

---

## 🔗 Integration Testing

### Testing with Frontend Integration

Create a mock React Native test:

```javascript
// Mock frontend test
const API_BASE = 'http://localhost:8787'

async function testFrontendIntegration() {
  try {
    // 1. Login
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    })
    
    const { data: { access_token } } = await loginResponse.json()
    
    // 2. Get designs
    const designsResponse = await fetch(`${API_BASE}/api/designs`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    })
    
    const designs = await designsResponse.json()
    console.log('✅ Frontend integration test passed')
    
    return designs
  } catch (error) {
    console.error('❌ Frontend integration test failed:', error)
  }
}

testFrontendIntegration()
```

### Database Integration Tests

```bash
# Test database operations directly
wrangler d1 execute design-gallery-db --local \
  --command "SELECT COUNT(*) as user_count FROM users"

wrangler d1 execute design-gallery-db --local \
  --command "SELECT COUNT(*) as design_count FROM designs"

# Test database health
wrangler d1 execute design-gallery-db --local \
  --command "SELECT 1 as health_check"
```

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Issue 1: Database Connection Errors

**Symptoms**: 500 errors on any database operation

**Debug Steps**:
```bash
# Check D1 database status
wrangler d1 info design-gallery-db

# Test direct database access
wrangler d1 execute design-gallery-db --command "SELECT 1"

# Check wrangler.toml configuration
cat wrangler.toml | grep -A 5 d1_databases
```

**Solution**: Verify database ID and binding configuration

#### Issue 2: Authentication Failures

**Symptoms**: All protected routes return 401

**Debug Steps**:
```bash
# Check JWT secret
echo $JWT_SECRET

# Test token generation manually
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign({user_id: 1, username: 'test'}, 'your-secret');
console.log(token);
"

# Verify token format
echo "$ADMIN_TOKEN" | base64 -d 2>/dev/null || echo "Invalid base64"
```

**Solution**: Ensure JWT_SECRET is properly set and tokens are valid

#### Issue 3: CORS Errors

**Symptoms**: Browser requests fail with CORS errors

**Debug Steps**:
```bash
# Test CORS headers
curl -I -X OPTIONS "$API_BASE_URL/api/designs" \
  -H "Origin: http://localhost:3000"

# Check CORS configuration
curl -I "$API_BASE_URL/api/designs"
```

**Solution**: Configure CORS_ORIGINS in wrangler.toml

#### Issue 4: Rate Limiting Issues

**Symptoms**: 429 Too Many Requests errors

**Debug Steps**:
```bash
# Check rate limit headers
curl -I "$API_BASE_URL/api/designs"

# Wait for rate limit reset
sleep 60

# Test again
curl "$API_BASE_URL/api/designs"
```

**Solution**: Implement proper retry logic or adjust rate limits

### Debug Mode Testing

Enable debug logging:
```bash
# Local development
DEBUG=1 npm run dev

# Check logs
wrangler tail --local
```

### Test Data Reset

Reset test data:
```bash
# Drop and recreate tables (local only)
wrangler d1 execute design-gallery-db --local \
  --command "DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS designs; DROP TABLE IF EXISTS user_favorites;"

# Re-run migrations
wrangler d1 migrations apply design-gallery-db --local
```

---

## 📈 Test Coverage Reports

### Generate Coverage Reports

```bash
# Run tests with coverage
npm run test:coverage

# View HTML report
open coverage/index.html

# Check coverage thresholds
npm run test:coverage:check
```

### Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

---

## ✅ Test Checklist

### Pre-Deployment Testing

- [ ] All health endpoints return 200
- [ ] User registration and login work
- [ ] Admin functions work correctly
- [ ] Design CRUD operations work
- [ ] Favorites system works
- [ ] Image upload integration works
- [ ] Error handling returns proper status codes
- [ ] Rate limiting works correctly
- [ ] CORS headers are set properly
- [ ] Database queries execute successfully
- [ ] JWT tokens are valid and secure
- [ ] Validation prevents invalid input
- [ ] Security measures prevent common attacks

### Post-Deployment Testing

- [ ] Production health check passes
- [ ] Database migrations applied successfully
- [ ] Environment variables set correctly
- [ ] HTTPS endpoints work
- [ ] Performance meets requirements
- [ ] Monitoring and logging work
- [ ] Backup and recovery tested

---

**🎯 This testing guide ensures comprehensive validation of the Design Gallery backend functionality, security, and performance.** 