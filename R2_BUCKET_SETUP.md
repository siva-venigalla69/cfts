# R2 Bucket Public Access Setup

## Problem
Your R2 bucket is currently private, causing 401 Unauthorized errors when trying to access images from the frontend.

## Solution: Make R2 Bucket Public (RECOMMENDED)

### Step 1: Access Cloudflare Dashboard
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage**
3. Select your bucket: `designs`

### Step 2: Configure Public Access
1. Click on your bucket name
2. Go to **Settings** tab
3. Find **Public Access** section
4. **Enable "Public Access"** for the bucket
5. Save changes

### Step 3: Verify Public URL
After enabling public access, your images should be accessible at:
```
https://pub-0b3de96b3a72833e38311290e9acfc3a.r2.dev/[object-key]
```

### Step 4: Test Image Access
Test if images are now accessible:
```bash
curl -I "https://pub-0b3de96b3a72833e38311290e9acfc3a.r2.dev/Sarees/D003.jpeg"
```

You should get a **200 OK** response instead of **401 Unauthorized**.

### Step 5: Revert Backend Changes
After making the bucket public, revert the backend to use public URLs:

1. In `src/routes/designs.ts`, change back to:
   ```typescript
   image_url: getR2PublicUrl(design.r2_object_key, env),
   ```

2. In `src/utils/index.ts`, remove the `getAuthenticatedImageUrl` function

3. In frontend, remove the authentication headers from Image components

## Alternative: Use Cloudflare Images (More Advanced)

If you want better image optimization, consider using Cloudflare Images instead of R2:

1. Go to **Images** in Cloudflare Dashboard
2. Upload images through the Images API
3. Use the delivery URLs: `https://imagedelivery.net/[account-id]/[image-id]/[variant]`

## Current Status
- ✅ Backend correctly generates public URLs
- ✅ Frontend correctly uses `image_url` field
- ❌ R2 bucket is private (401 errors)
- 🔧 Need to enable public access on R2 bucket

## Testing
After making the bucket public, test the frontend again. Images should now load properly.

## Why This is Better Than Authenticated URLs
1. **Performance**: Direct R2 access is faster than going through your API
2. **Scalability**: R2 handles image serving directly
3. **Caching**: Better caching at the CDN level
4. **Simplicity**: No need for complex authentication in image URLs 