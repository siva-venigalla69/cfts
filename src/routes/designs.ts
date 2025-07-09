import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import { ResponseUtils, ValidationUtils, SecurityUtils, getR2PublicUrl, r2FileExists } from '../utils'
import type { 
  Env, 
  DesignCreate, 
  DesignUpdate, 
  DesignResponse, 
  DesignListResponse,
  DesignSearchFilters,
  DesignImageCreate,
  DesignImageResponse,
  BatchImageUploadResponse,
  PaginationParams 
} from '../types'

const app = new Hono<{ Bindings: Env }>()

// Apply CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

/**
 * Helper function to format design response
 */
function formatDesignResponse(design: any, env: Env, images: DesignImageResponse[] = []): DesignResponse {
  return {
    id: design.id,
    title: design.title,
    description: design.description,
    short_description: design.short_description,
    long_description: design.long_description,
    image_url: getR2PublicUrl(design.r2_object_key, env),
    images: images,
    r2_object_key: design.r2_object_key,
    design_number: design.design_number, // Customer-facing design number
    category: design.category,
    style: design.style,
    colour: design.colour,
    fabric: design.fabric,
    occasion: design.occasion,
    size_available: design.size_available,
    price_range: design.price_range,
    tags: design.tags,
    featured: Boolean(design.featured),
    status: design.status,
    view_count: design.view_count || 0,
    like_count: design.like_count || 0,
    designer_name: design.designer_name,
    collection_name: design.collection_name,
    season: design.season,
    created_at: design.created_at,
    updated_at: design.updated_at
  }
}

/**
 * Get designs with pagination and filters
 * GET /designs
 */
app.get('/', authMiddleware, async (c) => {
  try {
    const env = c.env
    const user = c.get('user')
    
    // Parse query parameters
    const page = parseInt(c.req.query('page') || '1')
    const per_page = parseInt(c.req.query('per_page') || '20')
    const q = c.req.query('q')
    const design_number = c.req.query('design_number') // Search by design number
    const category = c.req.query('category')
    const style = c.req.query('style')
    const colour = c.req.query('colour')
    const fabric = c.req.query('fabric')
    const occasion = c.req.query('occasion')
    const featured = c.req.query('featured') ? c.req.query('featured') === 'true' : undefined
    const designer_name = c.req.query('designer_name')
    const collection_name = c.req.query('collection_name')
    const season = c.req.query('season')
    const sort_by = c.req.query('sort_by') || 'created_at' // Default sort by creation date
    const sort_order = c.req.query('sort_order') || 'desc' // Default descending order
    
    // Validate pagination
    const { page: validPage, limit: validLimit } = ValidationUtils.validatePagination(page, per_page, 100)
    
    // Build query conditions
    const conditions: string[] = []
    const params: any[] = []
    
    // Only show active designs to non-admin users
    if (!user.is_admin) {
      conditions.push('status = ?')
      params.push('active')
    }
    
    // Add search query (full-text search)
    if (q) {
      conditions.push(`(
        title LIKE ? OR 
        description LIKE ? OR 
        short_description LIKE ? OR 
        long_description LIKE ? OR 
        tags LIKE ? OR
        designer_name LIKE ? OR
        collection_name LIKE ? OR
        design_number LIKE ?
      )`)
      const searchTerm = `%${q}%`
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
    }
    
    // Add design number filter
    if (design_number) {
      conditions.push('design_number = ?')
      params.push(design_number)
    }
    
    // Add filters
    const filters = {
      category,
      style,
      colour,
      fabric,
      occasion,
      designer_name,
      collection_name,
      season
    }
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        conditions.push(`${key} = ?`)
        params.push(value)
      }
    })
    
    if (featured !== undefined) {
      conditions.push('featured = ?')
      params.push(featured ? 1 : 0)
    }
    
    // Build WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM designs ${whereClause}`
    const countResult = await env.DB.prepare(countQuery).bind(...params).first()
    const total = countResult?.count || 0
    
    // Calculate pagination
    const total_pages = Math.ceil((total as number) / validLimit)
    const offset = (validPage - 1) * validLimit
    
    // Validate sort parameters
    const allowedSortFields = ['created_at', 'title', 'view_count', 'like_count', 'design_number', 'category', 'style']
    const allowedSortOrders = ['asc', 'desc']
    
    const validSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'created_at'
    const validSortOrder = allowedSortOrders.includes(sort_order.toLowerCase()) ? sort_order.toUpperCase() : 'DESC'
    
    // Get designs
    const designsQuery = `
      SELECT * FROM designs 
      ${whereClause} 
      ORDER BY ${validSortBy} ${validSortOrder} 
      LIMIT ? OFFSET ?
    `
    const designsResult = await env.DB.prepare(designsQuery)
      .bind(...params, validLimit, offset)
      .all()
    
    const designs = designsResult.results?.map((design: any) => 
      formatDesignResponse(design, env)
    ) || []
    
    const response: DesignListResponse = {
      designs,
      total: total as number,
      page: validPage,
      per_page: validLimit,
      total_pages
    }
    
    return c.json(ResponseUtils.success(response, 'Designs retrieved successfully'))
    
  } catch (error) {
    console.error('Get designs error:', error)
    return c.json(ResponseUtils.error('Failed to retrieve designs'), 500)
  }
})

/**
 * Get featured designs
 * GET /designs/featured
 */
app.get('/featured', authMiddleware, async (c) => {
  try {
    const env = c.env
    const limit = Math.min(parseInt(c.req.query('limit') || '10'), 50)
    
    const query = `
      SELECT * FROM designs 
      WHERE featured = 1 AND status = 'active'
      ORDER BY created_at DESC 
      LIMIT ?
    `
    
    const result = await env.DB.prepare(query).bind(limit).all()
    
    const designs = result.results?.map((design: any) => 
      formatDesignResponse(design, env)
    ) || []
    
    return c.json(ResponseUtils.success(designs, 'Featured designs retrieved successfully'))
    
  } catch (error) {
    console.error('Get featured designs error:', error)
    return c.json(ResponseUtils.error('Failed to retrieve featured designs'), 500)
  }
})

/**
 * Get a specific design by ID
 * GET /designs/:id
 */
app.get('/:id', authMiddleware, async (c) => {
  try {
    const env = c.env
    const user = c.get('user')
    const designId = parseInt(c.req.param('id'))
    
    if (!designId) {
      return c.json(ResponseUtils.error('Invalid design ID'), 400)
    }
    
    // Get design from database
    const designQuery = `SELECT * FROM designs WHERE id = ?`
    const design = await env.DB.prepare(designQuery).bind(designId).first()
    
    if (!design) {
      return c.json(ResponseUtils.error('Design not found'), 404)
    }
    
    // Check if non-admin user can view non-active designs
    if (!user.is_admin && design.status !== 'active') {
      return c.json(ResponseUtils.error('Design not found'), 404)
    }
    
    // Increment view count
    await env.DB.prepare(`UPDATE designs SET view_count = view_count + 1 WHERE id = ?`)
      .bind(designId)
      .run()
    
    // Update view count in response
    design.view_count = ((design.view_count as number) || 0) + 1
    
    const response = formatDesignResponse(design, env)
    
    return c.json(ResponseUtils.success(response, 'Design retrieved successfully'))
    
  } catch (error) {
    console.error('Get design error:', error)
    return c.json(ResponseUtils.error('Failed to retrieve design'), 500)
  }
})

  /**
   * Create a new design (admin only)
   * POST /designs
   */
  app.post('/', authMiddleware, adminMiddleware, async (c) => {
    try {
      const env = c.env
      const user = c.get('user')
      
      const designData: DesignCreate = await c.req.json()
      
      // Validate required fields
      if (!designData.title || !designData.r2_object_key || !designData.category) {
        return c.json(ResponseUtils.error('Title, r2_object_key, and category are required'), 400)
      }
      
      // Verify R2 object exists
      const exists = await r2FileExists(env.R2_BUCKET, designData.r2_object_key)
      if (!exists) {
        return c.json(ResponseUtils.error('R2 object key not found'), 400)
      }
      
      // Generate design number if not provided
      let designNumber = designData.design_number
      if (!designNumber) {
        // Extract filename from r2_object_key
        const filename = designData.r2_object_key.split('/').pop() || ''
        designNumber = SecurityUtils.generateDesignNumber(filename, designData.category)
      }
      
      // Validate design number format
      if (!SecurityUtils.isValidDesignNumber(designNumber)) {
        return c.json(ResponseUtils.error('Invalid design number format. Use format like DGN-001, SAR-123'), 400)
      }
      
      // Check if design number already exists
      const existingDesign = await env.DB.prepare('SELECT id FROM designs WHERE design_number = ?')
        .bind(designNumber)
        .first()
      
      if (existingDesign) {
        return c.json(ResponseUtils.error(`Design number ${designNumber} already exists`), 400)
      }
      
      // Create design
      const now = new Date().toISOString()
      const insertQuery = `
        INSERT INTO designs (
          title, description, short_description, long_description,
          r2_object_key, design_number, category, style, colour, fabric, occasion,
          size_available, price_range, tags, featured, status,
          view_count, like_count, designer_name, collection_name,
          season, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      
      const result = await env.DB.prepare(insertQuery).bind(
        designData.title,
        designData.description || null,
        designData.short_description || null,
        designData.long_description || null,
        designData.r2_object_key,
        designNumber,
        designData.category,
        designData.style || null,
        designData.colour || null,
        designData.fabric || null,
        designData.occasion || null,
        designData.size_available || null,
        designData.price_range || null,
        designData.tags || null,
        designData.featured ? 1 : 0,
        'active',
        0, // view_count
        0, // like_count
        designData.designer_name || null,
        designData.collection_name || null,
        designData.season || null,
        now,
        now
      ).run()
      
      if (!result.success) {
        return c.json(ResponseUtils.error('Failed to create design'), 500)
      }
      
      // Get the created design
      const createdDesign = await env.DB.prepare('SELECT * FROM designs WHERE id = ?')
        .bind(result.meta.last_row_id)
        .first()
      
      const response = formatDesignResponse(createdDesign, env)
      
      return c.json(ResponseUtils.success(response, 'Design created successfully'), 201)
      
    } catch (error) {
      console.error('Create design error:', error)
      return c.json(ResponseUtils.error('Failed to create design'), 500)
    }
  })

/**
 * Update a design (admin only)
 * PUT /designs/:id
 */
app.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const designId = parseInt(c.req.param('id'))
    const updateData: DesignUpdate = await c.req.json()
    
    if (!designId) {
      return c.json(ResponseUtils.error('Invalid design ID'), 400)
    }
    
    // Check if design exists
    const existingDesign = await env.DB.prepare('SELECT * FROM designs WHERE id = ?')
      .bind(designId)
      .first()
    
    if (!existingDesign) {
      return c.json(ResponseUtils.error('Design not found'), 404)
    }
    
    // Build update query dynamically
    const updateFields: string[] = []
    const updateValues: any[] = []
    
    const allowedFields = [
      'title', 'description', 'short_description', 'long_description',
      'category', 'style', 'colour', 'fabric', 'occasion',
      'size_available', 'price_range', 'tags', 'featured', 'status',
      'designer_name', 'collection_name', 'season'
    ]
    
    Object.entries(updateData).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`)
        updateValues.push(key === 'featured' ? (value ? 1 : 0) : value)
      }
    })
    
    if (updateFields.length === 0) {
      return c.json(ResponseUtils.error('No valid fields to update'), 400)
    }
    
    // Add updated_at
    updateFields.push('updated_at = ?')
    updateValues.push(new Date().toISOString())
    updateValues.push(designId)
    
    const updateQuery = `UPDATE designs SET ${updateFields.join(', ')} WHERE id = ?`
    const result = await env.DB.prepare(updateQuery).bind(...updateValues).run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to update design'), 500)
    }
    
    // Get updated design
    const updatedDesign = await env.DB.prepare('SELECT * FROM designs WHERE id = ?')
      .bind(designId)
      .first()
    
    const response = formatDesignResponse(updatedDesign, env)
    
    return c.json(ResponseUtils.success(response, 'Design updated successfully'))
    
  } catch (error) {
    console.error('Update design error:', error)
    return c.json(ResponseUtils.error('Failed to update design'), 500)
  }
})

/**
 * Delete a design (admin only)
 * DELETE /designs/:id
 */
app.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const designId = parseInt(c.req.param('id'))
    
    if (!designId) {
      return c.json(ResponseUtils.error('Invalid design ID'), 400)
    }
    
    // Check if design exists
    const existingDesign = await env.DB.prepare('SELECT * FROM designs WHERE id = ?')
      .bind(designId)
      .first()
    
    if (!existingDesign) {
      return c.json(ResponseUtils.error('Design not found'), 404)
    }
    
    // Delete the design
    const result = await env.DB.prepare('DELETE FROM designs WHERE id = ?')
      .bind(designId)
      .run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to delete design'), 500)
    }
    
    return c.json(ResponseUtils.success(null, 'Design deleted successfully'))
    
  } catch (error) {
    console.error('Delete design error:', error)
    return c.json(ResponseUtils.error('Failed to delete design'), 500)
  }
})

/**
 * Add design to user favorites
 * POST /designs/:id/favorite
 */
app.post('/:id/favorite', authMiddleware, async (c) => {
  try {
    const env = c.env
    const user = c.get('user')
    const designId = parseInt(c.req.param('id'))
    
    if (!designId) {
      return c.json(ResponseUtils.error('Invalid design ID'), 400)
    }
    
    // Check if design exists
    const design = await env.DB.prepare('SELECT id FROM designs WHERE id = ? AND status = ?')
      .bind(designId, 'active')
      .first()
    
    if (!design) {
      return c.json(ResponseUtils.error('Design not found'), 404)
    }
    
    // Check if already favorited
    const existingFavorite = await env.DB.prepare(
      'SELECT id FROM user_favorites WHERE user_id = ? AND design_id = ?'
    ).bind(user.user_id, designId).first()
    
    if (existingFavorite) {
      return c.json(ResponseUtils.error('Design already in favorites'), 400)
    }
    
    // Add to favorites
    const result = await env.DB.prepare(
      'INSERT INTO user_favorites (user_id, design_id, created_at) VALUES (?, ?, ?)'
    ).bind(user.user_id, designId, new Date().toISOString()).run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to add to favorites'), 500)
    }
    
    // Increment like count
    await env.DB.prepare('UPDATE designs SET like_count = like_count + 1 WHERE id = ?')
      .bind(designId)
      .run()
    
    return c.json(ResponseUtils.success(null, 'Design added to favorites'))
    
  } catch (error) {
    console.error('Add favorite error:', error)
    return c.json(ResponseUtils.error('Failed to add to favorites'), 500)
  }
})

/**
 * Remove design from user favorites
 * DELETE /designs/:id/favorite
 */
app.delete('/:id/favorite', authMiddleware, async (c) => {
  try {
    const env = c.env
    const user = c.get('user')
    const designId = parseInt(c.req.param('id'))
    
    if (!designId) {
      return c.json(ResponseUtils.error('Invalid design ID'), 400)
    }
    
    // Check if favorited
    const existingFavorite = await env.DB.prepare(
      'SELECT id FROM user_favorites WHERE user_id = ? AND design_id = ?'
    ).bind(user.user_id, designId).first()
    
    if (!existingFavorite) {
      return c.json(ResponseUtils.error('Design not in favorites'), 400)
    }
    
    // Remove from favorites
    const result = await env.DB.prepare(
      'DELETE FROM user_favorites WHERE user_id = ? AND design_id = ?'
    ).bind(user.user_id, designId).run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to remove from favorites'), 500)
    }
    
    // Decrement like count
    await env.DB.prepare('UPDATE designs SET like_count = like_count - 1 WHERE id = ?')
      .bind(designId)
      .run()
    
    return c.json(ResponseUtils.success(null, 'Design removed from favorites'))
    
  } catch (error) {
    console.error('Remove favorite error:', error)
    return c.json(ResponseUtils.error('Failed to remove from favorites'), 500)
  }
})

/**
 * Get user's favorite designs
 * GET /designs/user/favorites
 */
app.get('/user/favorites', authMiddleware, async (c) => {
  try {
    const env = c.env
    const user = c.get('user')
    const page = parseInt(c.req.query('page') || '1')
    const per_page = parseInt(c.req.query('per_page') || '20')
    
    const { page: validPage, limit: validLimit } = ValidationUtils.validatePagination(page, per_page, 100)
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM user_favorites uf 
      JOIN designs d ON uf.design_id = d.id 
      WHERE uf.user_id = ? AND d.status = 'active'
    `
    const countResult = await env.DB.prepare(countQuery).bind(user.user_id).first()
    const total = countResult?.count || 0
    
    // Get favorites
    const offset = (validPage - 1) * validLimit
    const favoritesQuery = `
      SELECT d.*, uf.created_at as favorited_at 
      FROM user_favorites uf 
      JOIN designs d ON uf.design_id = d.id 
      WHERE uf.user_id = ? AND d.status = 'active'
      ORDER BY uf.created_at DESC 
      LIMIT ? OFFSET ?
    `
    
    const result = await env.DB.prepare(favoritesQuery)
      .bind(user.user_id, validLimit, offset)
      .all()
    
    const designs = result.results?.map((design: any) => 
      formatDesignResponse(design, env)
    ) || []
    
    const response: DesignListResponse = {
      designs,
      total: total as number,
      page: validPage,
      per_page: validLimit,
      total_pages: Math.ceil((total as number) / validLimit)
    }
    
    return c.json(ResponseUtils.success(response, 'User favorites retrieved successfully'))
    
  } catch (error) {
    console.error('Get user favorites error:', error)
    return c.json(ResponseUtils.error('Failed to retrieve user favorites'), 500)
  }
})

// ============================================================================
// DESIGN IMAGES ENDPOINTS
// ============================================================================

/**
 * Get all images for a design
 * GET /designs/:id/images
 */
app.get('/:id/images', authMiddleware, async (c) => {
  try {
    const env = c.env
    const designId = parseInt(c.req.param('id'))
    
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
    
    // Get all images for the design
    const images = await env.DB.prepare(`
      SELECT * FROM design_images 
      WHERE design_id = ? 
      ORDER BY is_primary DESC, image_order ASC, created_at ASC
    `).bind(designId).all()
    
    const imageResponses: DesignImageResponse[] = images.results?.map((image: any) => ({
      id: image.id,
      design_id: image.design_id,
      image_url: getR2PublicUrl(image.r2_object_key, env),
      r2_object_key: image.r2_object_key,
      image_order: image.image_order,
      is_primary: Boolean(image.is_primary),
      alt_text: image.alt_text,
      caption: image.caption,
      image_type: image.image_type,
      file_size: image.file_size,
      width: image.width,
      height: image.height,
      content_type: image.content_type,
      uploaded_by: image.uploaded_by,
      created_at: image.created_at,
      updated_at: image.updated_at
    })) || []
    
    return c.json(ResponseUtils.success({
      design_id: designId,
      images: imageResponses,
      total_images: imageResponses.length
    }, 'Design images retrieved successfully'))
    
  } catch (error) {
    console.error('Get design images error:', error)
    return c.json(ResponseUtils.error('Failed to retrieve design images'), 500)
  }
})

/**
 * Add image to design (admin only)
 * POST /designs/:id/images
 */
app.post('/:id/images', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const user = c.get('user')
    const designId = parseInt(c.req.param('id'))
    
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
    
    const imageData = await c.req.json()
    
    // Validate required fields
    if (!imageData.r2_object_key) {
      return c.json(ResponseUtils.error('r2_object_key is required'), 400)
    }
    
    // Verify R2 object exists
    const exists = await r2FileExists(env.R2_BUCKET, imageData.r2_object_key)
    if (!exists) {
      return c.json(ResponseUtils.error('R2 object key not found'), 400)
    }
    
    // Check max images per design
    const imageCount = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM design_images WHERE design_id = ?
    `).bind(designId).first()
    
    const maxImages = 10 // Default max images per design
    if ((imageCount as any)?.count >= maxImages) {
      return c.json(ResponseUtils.error(`Maximum ${maxImages} images per design allowed`), 400)
    }
    
    // If this is set as primary, un-primary other images
    if (imageData.is_primary) {
      await env.DB.prepare(`
        UPDATE design_images SET is_primary = 0 WHERE design_id = ?
      `).bind(designId).run()
    }
    
    // Insert new image
    const now = new Date().toISOString()
    const result = await env.DB.prepare(`
      INSERT INTO design_images (
        design_id, r2_object_key, image_order, is_primary, alt_text,
        caption, image_type, file_size, width, height, content_type, 
        uploaded_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      designId,
      imageData.r2_object_key,
      imageData.image_order || 0,
      imageData.is_primary ? 1 : 0,
      imageData.alt_text || null,
      imageData.caption || null,
      imageData.image_type || 'standard',
      imageData.file_size || null,
      imageData.width || null,
      imageData.height || null,
      imageData.content_type || null,
      user.username,
      now,
      now
    ).run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to add design image'), 500)
    }
    
    // Get the created image
    const createdImage = await env.DB.prepare('SELECT * FROM design_images WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first()
    
    const imageResponse: DesignImageResponse = {
      id: (createdImage as any).id,
      design_id: (createdImage as any).design_id,
      image_url: getR2PublicUrl((createdImage as any).r2_object_key, env),
      r2_object_key: (createdImage as any).r2_object_key,
      image_order: (createdImage as any).image_order,
      is_primary: Boolean((createdImage as any).is_primary),
      alt_text: (createdImage as any).alt_text,
      caption: (createdImage as any).caption,
      image_type: (createdImage as any).image_type,
      file_size: (createdImage as any).file_size,
      width: (createdImage as any).width,
      height: (createdImage as any).height,
      content_type: (createdImage as any).content_type,
      uploaded_by: (createdImage as any).uploaded_by,
      created_at: (createdImage as any).created_at,
      updated_at: (createdImage as any).updated_at
    }
    
    return c.json(ResponseUtils.success(imageResponse, 'Design image added successfully'), 201)
    
  } catch (error) {
    console.error('Add design image error:', error)
    return c.json(ResponseUtils.error('Failed to add design image'), 500)
  }
})

/**
 * Update design image (admin only)
 * PUT /designs/:designId/images/:imageId
 */
app.put('/:designId/images/:imageId', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const designId = parseInt(c.req.param('designId'))
    const imageId = parseInt(c.req.param('imageId'))
    
    if (!designId || !imageId) {
      return c.json(ResponseUtils.error('Invalid design ID or image ID'), 400)
    }
    
    // Check if image exists and belongs to design
    const existingImage = await env.DB.prepare(`
      SELECT * FROM design_images WHERE id = ? AND design_id = ?
    `).bind(imageId, designId).first()
    
    if (!existingImage) {
      return c.json(ResponseUtils.error('Design image not found'), 404)
    }
    
    const updates = await c.req.json()
    
    // If setting as primary, un-primary other images in the same design
    if (updates.is_primary) {
      await env.DB.prepare(`
        UPDATE design_images SET is_primary = 0 WHERE design_id = ? AND id != ?
      `).bind(designId, imageId).run()
    }
    
    // Build dynamic update query
    const setFields: string[] = []
    const values: any[] = []
    
    if (updates.image_order !== undefined) {
      setFields.push('image_order = ?')
      values.push(updates.image_order)
    }
    
    if (updates.is_primary !== undefined) {
      setFields.push('is_primary = ?')
      values.push(updates.is_primary ? 1 : 0)
    }
    
    if (updates.alt_text !== undefined) {
      setFields.push('alt_text = ?')
      values.push(updates.alt_text)
    }
    
    if (updates.caption !== undefined) {
      setFields.push('caption = ?')
      values.push(updates.caption)
    }
    
    if (updates.image_type !== undefined) {
      setFields.push('image_type = ?')
      values.push(updates.image_type)
    }
    
    if (setFields.length === 0) {
      return c.json(ResponseUtils.error('No updates provided'), 400)
    }
    
    setFields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(imageId) // For WHERE clause
    
    const result = await env.DB.prepare(`
      UPDATE design_images 
      SET ${setFields.join(', ')}
      WHERE id = ?
    `).bind(...values).run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to update design image'), 500)
    }
    
    // Get the updated image
    const updatedImage = await env.DB.prepare('SELECT * FROM design_images WHERE id = ?')
      .bind(imageId)
      .first()
    
    const imageResponse: DesignImageResponse = {
      id: (updatedImage as any).id,
      design_id: (updatedImage as any).design_id,
      image_url: getR2PublicUrl((updatedImage as any).r2_object_key, env),
      r2_object_key: (updatedImage as any).r2_object_key,
      image_order: (updatedImage as any).image_order,
      is_primary: Boolean((updatedImage as any).is_primary),
      alt_text: (updatedImage as any).alt_text,
      caption: (updatedImage as any).caption,
      image_type: (updatedImage as any).image_type,
      file_size: (updatedImage as any).file_size,
      width: (updatedImage as any).width,
      height: (updatedImage as any).height,
      content_type: (updatedImage as any).content_type,
      uploaded_by: (updatedImage as any).uploaded_by,
      created_at: (updatedImage as any).created_at,
      updated_at: (updatedImage as any).updated_at
    }
    
    return c.json(ResponseUtils.success(imageResponse, 'Design image updated successfully'))
    
  } catch (error) {
    console.error('Update design image error:', error)
    return c.json(ResponseUtils.error('Failed to update design image'), 500)
  }
})

/**
 * Delete design image (admin only)
 * DELETE /designs/:designId/images/:imageId
 */
app.delete('/:designId/images/:imageId', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const designId = parseInt(c.req.param('designId'))
    const imageId = parseInt(c.req.param('imageId'))
    
    if (!designId || !imageId) {
      return c.json(ResponseUtils.error('Invalid design ID or image ID'), 400)
    }
    
    // Check if image exists and belongs to design
    const existingImage = await env.DB.prepare(`
      SELECT * FROM design_images WHERE id = ? AND design_id = ?
    `).bind(imageId, designId).first()
    
    if (!existingImage) {
      return c.json(ResponseUtils.error('Design image not found'), 404)
    }
    
    // Delete the image
    const result = await env.DB.prepare('DELETE FROM design_images WHERE id = ?')
      .bind(imageId)
      .run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to delete design image'), 500)
    }
    
    return c.json(ResponseUtils.success({
      deleted_image_id: imageId,
      design_id: designId
    }, 'Design image deleted successfully'))
    
  } catch (error) {
    console.error('Delete design image error:', error)
    return c.json(ResponseUtils.error('Failed to delete design image'), 500)
  }
})

/**
 * Set primary image for design (admin only)
 * POST /designs/:designId/images/:imageId/set-primary
 */
app.post('/:designId/images/:imageId/set-primary', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const designId = parseInt(c.req.param('designId'))
    const imageId = parseInt(c.req.param('imageId'))
    
    if (!designId || !imageId) {
      return c.json(ResponseUtils.error('Invalid design ID or image ID'), 400)
    }
    
    // Check if image exists and belongs to design
    const existingImage = await env.DB.prepare(`
      SELECT id FROM design_images WHERE id = ? AND design_id = ?
    `).bind(imageId, designId).first()
    
    if (!existingImage) {
      return c.json(ResponseUtils.error('Design image not found'), 404)
    }
    
    // Un-primary all images for this design
    await env.DB.prepare(`
      UPDATE design_images SET is_primary = 0 WHERE design_id = ?
    `).bind(designId).run()
    
    // Set the specified image as primary
    const result = await env.DB.prepare(`
      UPDATE design_images SET is_primary = 1, updated_at = ? WHERE id = ?
    `).bind(new Date().toISOString(), imageId).run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to set primary image'), 500)
    }
    
    return c.json(ResponseUtils.success({
      design_id: designId,
      primary_image_id: imageId
    }, 'Primary image set successfully'))
    
  } catch (error) {
    console.error('Set primary image error:', error)
    return c.json(ResponseUtils.error('Failed to set primary image'), 500)
  }
})

/**
 * Reorder design images (admin only)
 * PUT /designs/:id/images/reorder
 */
app.put('/:id/images/reorder', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const designId = parseInt(c.req.param('id'))
    
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
    
    const { image_orders } = await c.req.json()
    
    if (!Array.isArray(image_orders)) {
      return c.json(ResponseUtils.error('image_orders must be an array'), 400)
    }
    
    // Update each image order
    for (const { image_id, order } of image_orders) {
      await env.DB.prepare(`
        UPDATE design_images 
        SET image_order = ?, updated_at = ?
        WHERE id = ? AND design_id = ?
      `).bind(order, new Date().toISOString(), image_id, designId).run()
    }
    
    return c.json(ResponseUtils.success({
      design_id: designId,
      updated_images: image_orders.length
    }, 'Image order updated successfully'))
    
  } catch (error) {
    console.error('Reorder images error:', error)
    return c.json(ResponseUtils.error('Failed to reorder images'), 500)
  }
})

export default app 