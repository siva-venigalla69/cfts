# Complete Testing Guide - Design Gallery Application

This guide provides step-by-step instructions for testing your Design Gallery application, including both backend API and frontend mobile app testing.

## 📋 Table of Contents

1. [Project Structure](#project-structure)
2. [Backend Testing](#backend-testing)
3. [Frontend Setup & Testing](#frontend-setup--testing)
4. [Integration Testing](#integration-testing)
5. [User Flow Testing](#user-flow-testing)
6. [Production Deployment Testing](#production-deployment-testing)
7. [Troubleshooting](#troubleshooting)

## 📁 Project Structure

```
/home/murali/cfts/
├── src/                    # Backend API (Cloudflare Worker)
├── frontend/               # Expo React Native App (NEW)
├── archive/
│   └── frontend-old/       # Old React Native code (archived)
├── docs/                   # Documentation
├── migrations/             # Database migrations
└── scripts/               # Utility scripts
```

## 🔧 Backend Testing

### Step 1: Verify Backend Deployment

```bash
# 1. Deploy your backend first
cd /home/murali/cfts
npm run deploy

# 2. Test basic connectivity
curl https://your-worker-name.your-username.workers.dev/test

# 3. Test health endpoint
curl https://your-worker-name.your-username.workers.dev/health
```

### Step 2: Test Authentication Endpoints

```bash
# Register a new user
curl -X POST https://your-worker-name.your-username.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123"}'

# Try to login (should fail until admin approval)
curl -X POST https://your-worker-name.your-username.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123"}'
```

### Step 3: Test Design Endpoints

```bash
# Get designs (requires authentication)
curl https://your-worker-name.your-username.workers.dev/api/designs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test search
curl "https://your-worker-name.your-username.workers.dev/api/designs?q=saree" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📱 Frontend Setup & Testing

### Step 1: Install Expo Go on Your Phone

1. **Android**: Download from [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. **iOS**: Download from [Apple App Store](https://apps.apple.com/app/expo-go/id982107779)

### Step 2: Configure Backend URL

```bash
# Navigate to frontend
cd /home/murali/cfts/frontend

# Edit the API configuration
nano src/services/api.ts
```

Update the `BASE_URL`:
```typescript
const BASE_URL = 'https://your-actual-worker-name.your-username.workers.dev/api';
```

### Step 3: Start Frontend Development Server

```bash
cd /home/murali/cfts/frontend
npm start
```

**Expected Output:**
- QR code appears in terminal
- Metro bundler starts successfully
- No TypeScript errors

### Step 4: Load App on Your Phone

1. **Scan QR code** with Expo Go app (Android) or Camera app (iOS)
2. **Wait for app to load** (first time may take 30-60 seconds)
3. **Verify login screen appears**

## 🧪 Integration Testing

### Phase 1: Authentication Flow Testing

#### Test 1: User Registration
```
Logic: Test new user registration and admin approval workflow

Steps:
1. Open app on phone
2. Tap "Don't have an account? Sign Up"
3. Enter username: "testuser2"
4. Enter password: "password123"
5. Confirm password: "password123"
6. Tap "Create Account"

Expected Results:
✅ Success message appears
✅ "Please wait for admin approval" message shown
✅ Redirected to login screen
✅ Backend receives registration request
```

#### Test 2: Login Before Approval
```
Logic: Verify users cannot login before admin approval

Steps:
1. On login screen, enter:
   - Username: "testuser2"
   - Password: "password123"
2. Tap "Sign In"

Expected Results:
❌ Error message: "Account pending approval"
❌ User remains on login screen
✅ Appropriate error handling shown
```

#### Test 3: Admin User Creation (Backend)
```bash
# Create admin user via backend
curl -X POST https://your-worker-name.your-username.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Manually approve admin in database or use admin endpoint
```

#### Test 4: Admin Login
```
Steps:
1. Login with admin credentials
2. Verify successful authentication
3. Check if admin features are accessible

Expected Results:
✅ Login successful
✅ Redirected to main app
✅ Admin-specific UI elements visible (if implemented)
```

### Phase 2: Design Gallery Testing

#### Test 5: Design Browsing
```
Logic: Test design listing and pagination

Steps:
1. Login successfully
2. Navigate to Home tab
3. Scroll through designs
4. Test pagination (load more)

Expected Results:
✅ Designs load properly
✅ Images display correctly
✅ Pagination works smoothly
✅ Loading states show appropriately
```

#### Test 6: Design Search
```
Logic: Test search functionality

Steps:
1. Navigate to Search tab
2. Enter search term: "saree"
3. Apply filters (category, color, etc.)
4. Verify results

Expected Results:
✅ Search returns relevant results
✅ Filters work correctly
✅ No results state handled gracefully
✅ Search is responsive
```

#### Test 7: Design Details
```
Logic: Test individual design viewing

Steps:
1. Tap on any design from list
2. View design details
3. Swipe through multiple images
4. Check all design information

Expected Results:
✅ Design details load properly
✅ All images display correctly
✅ Design information is complete
✅ Navigation works smoothly
```

### Phase 3: Favorites System Testing

#### Test 8: Add to Favorites
```
Logic: Test favorites functionality

Steps:
1. View any design
2. Tap heart/favorite icon
3. Navigate to Favorites tab
4. Verify design appears in favorites

Expected Results:
✅ Heart icon changes state
✅ Design appears in favorites list
✅ Favorites persist across app restarts
✅ API calls succeed
```

#### Test 9: Remove from Favorites
```
Steps:
1. In favorites list, tap heart icon again
2. Verify design is removed
3. Check design detail view heart state

Expected Results:
✅ Design removed from favorites list
✅ Heart icon state updates everywhere
✅ Change persists
```

### Phase 4: Shopping Cart Testing

#### Test 10: Add to Cart
```
Logic: Test cart functionality

Steps:
1. View any design
2. Tap "Add to Cart" button
3. Select quantity
4. Add notes (optional)
5. Confirm addition

Expected Results:
✅ Item added to cart
✅ Cart badge shows item count
✅ Cart persists across sessions
✅ Quantity and notes saved correctly
```

#### Test 11: Cart Management
```
Steps:
1. Navigate to Cart tab
2. View cart items
3. Update quantities
4. Remove items
5. Test clear cart

Expected Results:
✅ All cart operations work
✅ Total count updates
✅ Items persist correctly
✅ Empty cart state shown properly
```

#### Test 12: WhatsApp Sharing
```
Logic: Test cart sharing feature

Steps:
1. Add items to cart
2. Tap "Share on WhatsApp"
3. Verify WhatsApp opens with correct message

Expected Results:
✅ WhatsApp opens automatically
✅ Message contains cart details
✅ Formatted message is readable
✅ Sharing works consistently
```

## 🎯 User Flow Testing

### Complete User Journey Test

```
Scenario: New user discovers and shares designs

1. User Registration
   → Register new account
   → Wait for approval message
   → Verify email/notification (if implemented)

2. Admin Approval (Manual step)
   → Admin approves user
   → User gets notification (if implemented)

3. First Login
   → User logs in successfully
   → Onboarding flow (if implemented)
   → Explore main interface

4. Design Discovery
   → Browse featured designs
   → Use search to find specific items
   → Apply various filters
   → View design details

5. Favorites Management
   → Add designs to favorites
   → View favorites list
   → Remove some favorites
   → Verify persistence

6. Shopping Cart Usage
   → Add multiple designs to cart
   → Adjust quantities
   → Add notes to items
   → Share cart via WhatsApp

7. Account Management
   → View profile
   → Update preferences (if implemented)
   → Logout and login again
```

## 🚀 Production Deployment Testing

### Frontend Production Build

```bash
# Build for production
cd /home/murali/cfts/frontend
expo build:android

# Test the built APK
# Install APK on device and test all flows
```

### Performance Testing

```
Areas to Test:
1. App load time
2. Image loading performance
3. Search response time
4. Cart operations speed
5. Navigation smoothness
6. Memory usage
7. Battery impact
```

### Cross-Device Testing

```
Test On:
1. Different Android versions
2. Various screen sizes
3. Different network conditions
4. Low-end devices
5. High-end devices
```

## 🔍 Detailed Logic Explanation

### Authentication Logic
```
Flow: Registration → Admin Approval → Login → JWT Token → API Access

1. User registers with username/password
2. Backend stores user with is_approved=false
3. Admin manually approves user
4. User can now login and receive JWT token
5. JWT token used for all authenticated API calls
6. Token includes user permissions (admin flag)
```

### State Management Logic
```
Zustand Stores:
- authStore: Manages authentication state, persists to AsyncStorage
- designStore: Manages design data, pagination, search results
- cartStore: Manages shopping cart, syncs with backend

Data Flow:
API Service → Zustand Store → React Components → UI Updates
```

### Caching Strategy
```
- Authentication: Persisted in AsyncStorage
- Designs: Cached in memory, invalidated on refresh
- Cart: Synced with backend, cached locally
- Favorites: Cached and synced across sessions
```

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### App Won't Load on Phone
```
1. Check WiFi connection (same network)
2. Restart Expo development server
3. Clear Expo Go app cache
4. Restart phone
5. Try different network
```

#### API Connection Issues
```
1. Verify backend URL is correct
2. Check backend deployment status
3. Test API endpoints manually with curl
4. Verify CORS configuration
5. Check authentication tokens
```

#### TypeScript Errors
```bash
# Check for type errors
cd /home/murali/cfts/frontend
npx tsc --noEmit

# Common fixes:
npm install @types/[missing-package]
```

#### Performance Issues
```
1. Check image sizes and optimization
2. Verify pagination is working
3. Monitor network requests
4. Check for memory leaks
5. Optimize component re-renders
```

### Debug Mode Testing

```bash
# Enable debug mode
cd /home/murali/cfts/frontend
npm start
# Press 'j' to open debugger
```

### Network Debugging

```
Use tools:
1. Expo Dev Tools (automatic)
2. React Native Debugger
3. Flipper (for advanced debugging)
4. Chrome DevTools
```

## ✅ Testing Checklist

### Pre-Testing Setup
- [ ] Backend deployed and accessible
- [ ] Frontend API URL configured
- [ ] Expo Go installed on test device
- [ ] Test user accounts created
- [ ] Admin user has approval permissions

### Authentication Testing
- [ ] User registration works
- [ ] Admin approval flow tested
- [ ] Login/logout functionality
- [ ] Token persistence
- [ ] Session management

### Core Features Testing
- [ ] Design browsing and pagination
- [ ] Search and filtering
- [ ] Design detail views
- [ ] Favorites add/remove
- [ ] Cart operations
- [ ] WhatsApp sharing

### UI/UX Testing
- [ ] All screens render correctly
- [ ] Navigation flows smoothly
- [ ] Loading states appropriate
- [ ] Error messages clear
- [ ] Responsive design

### Integration Testing
- [ ] Backend API integration
- [ ] Real-time data updates
- [ ] Cross-screen state management
- [ ] Offline behavior (if implemented)

### Performance Testing
- [ ] App startup time
- [ ] Image loading speed
- [ ] Smooth scrolling
- [ ] Memory usage reasonable
- [ ] Battery impact minimal

This comprehensive testing guide ensures your Design Gallery application works perfectly across all features and user scenarios! 