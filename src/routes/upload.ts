import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import { 
  generateR2ObjectKey, 
  getR2PublicUrl, 
  uploadToR2, 
  deleteFromR2, 
  listR2Files,
  r2FileExists,
  getR2FileInfo,
  isValidImageType,
  isValidFileSize,
  extractFilename,
  ResponseUtils 
} from '../utils'
import type { Env, ImageUploadResponse, PresignedUrlResponse, R2FileInfo } from '../types'

const app = new Hono<{ Bindings: Env }>()

// Apply CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

/**
 * Upload image to R2 storage
 * POST /upload/image
 */
app.post('/image', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const user = c.get('user')
    
    // Parse form data
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const category = formData.get('category') as string || 'general'
    
    if (!file) {
      return c.json(ResponseUtils.error('No file provided'), 400)
    }
    
    // Validate file type
    if (!isValidImageType(file.type)) {
      return c.json(
        ResponseUtils.error(
          `File type ${file.type} not allowed. Allowed types: image/jpeg, image/png, image/webp, image/gif`
        ), 
        400
      )
    }
    
    // Validate file size (10MB default)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (!isValidFileSize(file.size, maxSize)) {
      return c.json(
        ResponseUtils.error(`File too large. Maximum size: ${maxSize} bytes`), 
        400
      )
    }
    
    // Generate object key
    const objectKey = generateR2ObjectKey(file.name, category)
    
    // Convert file to ArrayBuffer
    const fileBuffer = await file.arrayBuffer()
    
    // Upload to R2 with metadata
    const metadata = {
      original_filename: file.name,
      uploaded_by: user.username,
      category: category,
      content_type: file.type,
      upload_timestamp: new Date().toISOString()
    }
    
    const success = await uploadToR2(env.R2_BUCKET, objectKey, fileBuffer, metadata)
    
    if (!success) {
      return c.json(ResponseUtils.error('Failed to upload image'), 500)
    }
    
    // Get public URL
    const publicUrl = getR2PublicUrl(objectKey, env)
    
    const response: ImageUploadResponse = {
      object_key: objectKey,
      public_url: publicUrl,
      message: 'Image uploaded successfully',
      success: true
    }
    
    return c.json(ResponseUtils.success(response, 'Image uploaded successfully'))
    
  } catch (error) {
    console.error('Upload error:', error)
    return c.json(ResponseUtils.error('Upload failed'), 500)
  }
})

/**
 * Generate presigned URL for direct R2 upload
 * GET /upload/presigned-url
 */
app.get('/presigned-url', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const user = c.get('user')
    
    const filename = c.req.query('filename')
    const category = c.req.query('category') || 'general'
    
    if (!filename) {
      return c.json(ResponseUtils.error('Filename is required'), 400)
    }
    
    // Generate object key
    const objectKey = generateR2ObjectKey(filename, category)
    
    // For R2, we can't generate presigned URLs directly like AWS S3
    // Instead, we'll return the object key and let the client upload through our API
    // Or we can implement a time-limited token system
    
    const publicUrl = getR2PublicUrl(objectKey, env)
    
    const response: PresignedUrlResponse = {
      object_key: objectKey,
      upload_url: `${c.req.url.replace('/presigned-url', '/image')}`, // Point to our upload endpoint
      public_url: publicUrl
    }
    
    return c.json(ResponseUtils.success(response, 'Presigned URL generated'))
    
  } catch (error) {
    console.error('Presigned URL error:', error)
    return c.json(ResponseUtils.error('Failed to generate presigned URL'), 500)
  }
})

/**
 * Delete image from R2 storage
 * DELETE /upload/image/:objectKey
 */
app.delete('/image/*', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const objectKey = c.req.param('*') // Get the full path after /image/
    
    if (!objectKey) {
      return c.json(ResponseUtils.error('Object key is required'), 400)
    }
    
    // Check if file exists
    const exists = await r2FileExists(env.R2_BUCKET, objectKey)
    if (!exists) {
      return c.json(ResponseUtils.error('Image not found'), 404)
    }
    
    // Delete from R2
    const success = await deleteFromR2(env.R2_BUCKET, objectKey)
    
    if (!success) {
      return c.json(ResponseUtils.error('Failed to delete image'), 500)
    }
    
    return c.json(ResponseUtils.success(null, 'Image deleted successfully'))
    
  } catch (error) {
    console.error('Delete error:', error)
    return c.json(ResponseUtils.error('Failed to delete image'), 500)
  }
})

/**
 * List images in R2 storage
 * GET /upload/images
 */
app.get('/images', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    
    const prefix = c.req.query('prefix') || ''
    const limit = parseInt(c.req.query('limit') || '50')
    const maxLimit = Math.min(limit, 100) // Cap at 100
    
    // List files from R2
    const files = await listR2Files(env.R2_BUCKET, prefix, maxLimit)
    
    // Add public URLs to each file
    const filesWithUrls: R2FileInfo[] = files.map(file => ({
      ...file,
      public_url: getR2PublicUrl(file.key, env)
    }))
    
    return c.json(ResponseUtils.success({
      images: filesWithUrls,
      count: filesWithUrls.length,
      prefix: prefix,
      limit: maxLimit
    }, 'Images listed successfully'))
    
  } catch (error) {
    console.error('List images error:', error)
    return c.json(ResponseUtils.error('Failed to list images'), 500)
  }
})

/**
 * Get image info from R2 storage
 * GET /upload/image/:objectKey/info
 */
app.get('/image/*/info', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const objectKey = c.req.param('*')
    
    if (!objectKey) {
      return c.json(ResponseUtils.error('Object key is required'), 400)
    }
    
    // Check if file exists and get info
    const fileInfo = await getR2FileInfo(env.R2_BUCKET, objectKey)
    
    if (!fileInfo) {
      return c.json(ResponseUtils.error('Image not found'), 404)
    }
    
    // Add public URL
    fileInfo.public_url = getR2PublicUrl(objectKey, env)
    
    return c.json(ResponseUtils.success(fileInfo, 'Image info retrieved successfully'))
    
  } catch (error) {
    console.error('Get image info error:', error)
    return c.json(ResponseUtils.error('Failed to get image info'), 500)
  }
})

/**
 * Health check for R2 storage
 * GET /upload/health
 */
app.get('/health', async (c) => {
  try {
    const env = c.env
    
    // Simple test to check R2 connectivity
    await env.R2_BUCKET.list({ limit: 1 })
    
    return c.json(ResponseUtils.success({
      status: 'healthy',
      service: 'R2 Storage',
      timestamp: new Date().toISOString()
    }, 'R2 storage is healthy'))
    
  } catch (error) {
    console.error('R2 health check failed:', error)
    return c.json(ResponseUtils.error('R2 storage health check failed'), 500)
  }
})

export default app 