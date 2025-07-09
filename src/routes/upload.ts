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
import type { Env, ImageUploadResponse, BatchImageUploadResponse, PresignedUrlResponse, R2FileInfo } from '../types'

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

/**
 * Batch upload images to R2 storage
 * POST /upload/batch
 */
app.post('/batch', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const user = c.get('user')
    
    // Parse form data
    const formData = await c.req.formData()
    const category = formData.get('category') as string || 'general'
    const maxBatchSize = 5 // Maximum files per batch
    
    // Get all files from form data
    const files: File[] = []
    let fileIndex = 0
    
    // Extract files (expecting file0, file1, file2, etc.)
    while (fileIndex < maxBatchSize) {
      const file = formData.get(`file${fileIndex}`) as File
      if (!file) {
        break
      }
      files.push(file)
      fileIndex++
    }
    
    // Also check for files with standard 'files' name
    const standardFiles = formData.getAll('files') as File[]
    files.push(...standardFiles.filter(f => f instanceof File))
    
    if (files.length === 0) {
      return c.json(ResponseUtils.error('No files provided'), 400)
    }
    
    if (files.length > maxBatchSize) {
      return c.json(ResponseUtils.error(`Maximum ${maxBatchSize} files allowed per batch`), 400)
    }
    
    const uploadedImages: ImageUploadResponse[] = []
    const failedUploads: { filename: string; error: string }[] = []
    
    // Process each file
    for (const file of files) {
      try {
        // Validate file type
        if (!isValidImageType(file.type)) {
          failedUploads.push({
            filename: file.name,
            error: `File type ${file.type} not allowed`
          })
          continue
        }
        
        // Validate file size (10MB default)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (!isValidFileSize(file.size, maxSize)) {
          failedUploads.push({
            filename: file.name,
            error: `File too large. Maximum size: ${maxSize} bytes`
          })
          continue
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
          failedUploads.push({
            filename: file.name,
            error: 'Failed to upload to R2 storage'
          })
          continue
        }
        
        // Get public URL
        const publicUrl = getR2PublicUrl(objectKey, env)
        
        uploadedImages.push({
          object_key: objectKey,
          public_url: publicUrl,
          message: 'Image uploaded successfully',
          success: true
        })
        
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error)
        failedUploads.push({
          filename: file.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    const response: BatchImageUploadResponse = {
      uploaded_images: uploadedImages,
      failed_uploads: failedUploads,
      total_uploaded: uploadedImages.length,
      total_failed: failedUploads.length,
      success: uploadedImages.length > 0,
      message: `Batch upload completed: ${uploadedImages.length} uploaded, ${failedUploads.length} failed`
    }
    
    const statusCode = uploadedImages.length > 0 ? 200 : 400
    return c.json(ResponseUtils.success(response, response.message), statusCode)
    
  } catch (error) {
    console.error('Batch upload error:', error)
    return c.json(ResponseUtils.error('Batch upload failed'), 500)
  }
})

/**
 * Upload multiple images for a specific design
 * POST /upload/design/:designId/images
 */
app.post('/design/:designId/images', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const user = c.get('user')
    const designId = parseInt(c.req.param('designId'))
    
    if (!designId) {
      return c.json(ResponseUtils.error('Invalid design ID'), 400)
    }
    
    // Check if design exists
    const design = await env.DB.prepare('SELECT id FROM designs WHERE id = ?')
      .bind(designId)
      .first()
    
    if (!design) {
      return c.json(ResponseUtils.error('Design not found'), 404)
    }
    
    // Parse form data
    const formData = await c.req.formData()
    const category = formData.get('category') as string || 'designs'
    const maxImages = 10 // Max images per design
    
    // Get current image count for this design
    const imageCount = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM design_images WHERE design_id = ?
    `).bind(designId).first()
    
    const currentCount = (imageCount as any)?.count || 0
    
    // Get all files from form data
    const files: File[] = []
    let fileIndex = 0
    const maxBatchSize = Math.min(5, maxImages - currentCount) // Don't exceed design limit
    
    while (fileIndex < maxBatchSize) {
      const file = formData.get(`file${fileIndex}`) as File
      if (!file) {
        break
      }
      files.push(file)
      fileIndex++
    }
    
    // Also check for files with standard 'files' name
    const standardFiles = formData.getAll('files') as File[]
    files.push(...standardFiles.filter(f => f instanceof File).slice(0, maxBatchSize))
    
    if (files.length === 0) {
      return c.json(ResponseUtils.error('No files provided'), 400)
    }
    
    if (currentCount + files.length > maxImages) {
      return c.json(ResponseUtils.error(`Maximum ${maxImages} images per design. Current: ${currentCount}`), 400)
    }
    
    const uploadedImages: ImageUploadResponse[] = []
    const failedUploads: { filename: string; error: string }[] = []
    
    // Process each file and add to design_images table
    for (const [index, file] of files.entries()) {
      try {
        // Validate file type
        if (!isValidImageType(file.type)) {
          failedUploads.push({
            filename: file.name,
            error: `File type ${file.type} not allowed`
          })
          continue
        }
        
        // Validate file size
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (!isValidFileSize(file.size, maxSize)) {
          failedUploads.push({
            filename: file.name,
            error: `File too large. Maximum size: ${maxSize} bytes`
          })
          continue
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
          upload_timestamp: new Date().toISOString(),
          design_id: designId.toString()
        }
        
        const uploadSuccess = await uploadToR2(env.R2_BUCKET, objectKey, fileBuffer, metadata)
        
        if (!uploadSuccess) {
          failedUploads.push({
            filename: file.name,
            error: 'Failed to upload to R2 storage'
          })
          continue
        }
        
        // Add to design_images table
        const isPrimary = index === 0 && currentCount === 0 // First image is primary if no images exist
        const now = new Date().toISOString()
        
        const dbResult = await env.DB.prepare(`
          INSERT INTO design_images (
            design_id, r2_object_key, image_order, is_primary, 
            image_type, file_size, content_type, uploaded_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          designId,
          objectKey,
          currentCount + index,
          isPrimary ? 1 : 0,
          'standard',
          file.size,
          file.type,
          user.username,
          now,
          now
        ).run()
        
        if (!dbResult.success) {
          // Try to clean up R2 upload
          await deleteFromR2(env.R2_BUCKET, objectKey)
          failedUploads.push({
            filename: file.name,
            error: 'Failed to save image record to database'
          })
          continue
        }
        
        // Get public URL
        const publicUrl = getR2PublicUrl(objectKey, env)
        
        uploadedImages.push({
          object_key: objectKey,
          public_url: publicUrl,
          message: 'Image uploaded and linked to design successfully',
          success: true
        })
        
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error)
        failedUploads.push({
          filename: file.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    const response: BatchImageUploadResponse = {
      uploaded_images: uploadedImages,
      failed_uploads: failedUploads,
      total_uploaded: uploadedImages.length,
      total_failed: failedUploads.length,
      success: uploadedImages.length > 0,
      message: `Design images upload completed: ${uploadedImages.length} uploaded, ${failedUploads.length} failed`
    }
    
    const statusCode = uploadedImages.length > 0 ? 200 : 400
    return c.json(ResponseUtils.success(response, response.message), statusCode)
    
  } catch (error) {
    console.error('Design images upload error:', error)
    return c.json(ResponseUtils.error('Design images upload failed'), 500)
  }
})

export default app 