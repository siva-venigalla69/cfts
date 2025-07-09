import type { 
  Env, 
  User, 
  Design, 
  UserFavorite,
  UserResponse,
  DesignResponse,
  UserCreate,
  UserLogin,
  DesignCreate,
  DesignUpdate,
  DesignSearchFilters
} from '../types'
import { 
  SecurityUtils, 
  DatabaseUtils, 
  ValidationUtils,
  DateUtils
} from '../utils'
import { 
  NotFoundError, 
  ConflictError, 
  ValidationError 
} from '../types'
import { createConfig } from '../config'

/**
 * Type-safe helpers for database result conversion
 */
function validateUser(result: Record<string, unknown>): User {
  if (!result.id || !result.username || !result.password_hash) {
    throw new ValidationError('Invalid user data from database')
  }
  
  return {
    id: result.id as number,
    username: result.username as string,
    password_hash: result.password_hash as string,
    is_admin: Boolean(result.is_admin),
    is_approved: Boolean(result.is_approved),
    created_at: result.created_at as string,
    updated_at: result.updated_at as string
  }
}

function validateDesign(result: Record<string, unknown>): Design {
  if (!result.id || !result.title || !result.r2_object_key || !result.category) {
    throw new ValidationError('Invalid design data from database')
  }
  
  return {
    id: result.id as number,
    title: result.title as string,
    description: result.description as string || undefined,
    short_description: result.short_description as string || undefined,
    long_description: result.long_description as string || undefined,
    r2_object_key: result.r2_object_key as string,
    design_number: result.design_number as string || undefined,
    category: result.category as string,
    style: result.style as string || undefined,
    colour: result.colour as string || undefined,
    fabric: result.fabric as string || undefined,
    occasion: result.occasion as string || undefined,
    size_available: result.size_available as string || undefined,
    price_range: result.price_range as string || undefined,
    tags: result.tags as string || undefined,
    featured: Boolean(result.featured),
    status: result.status as 'active' | 'inactive' | 'draft',
    view_count: (result.view_count as number) || 0,
    like_count: (result.like_count as number) || 0,
    designer_name: result.designer_name as string || undefined,
    collection_name: result.collection_name as string || undefined,
    season: result.season as string || undefined,
    created_at: result.created_at as string,
    updated_at: result.updated_at as string
  }
}

/**
 * Database Service - handles all database operations for the Design Gallery
 */
export class DatabaseService {
  private db: D1Database
  private config: any

  constructor(env: Env) {
    this.config = createConfig(env)
    this.db = this.config.database
  }

  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

  /**
   * Create a new user
   */
  async createUser(userData: UserCreate): Promise<User> {
    try {
      // Check if username already exists
      const existingUser = await this.getUserByUsername(userData.username)
      if (existingUser) {
        throw new ConflictError('Username already exists')
      }

      // Hash the password
      const passwordHash = await SecurityUtils.hashPassword(userData.password)

      // Insert user into database
      const result = await this.db.prepare(`
        INSERT INTO users (username, password_hash, is_admin, is_approved)
        VALUES (?, ?, 0, 0)
        RETURNING id, username, password_hash, is_admin, is_approved, created_at, updated_at
      `).bind(userData.username, passwordHash).first()

      if (!result) {
        throw new Error('Failed to create user')
      }

      return validateUser(result)
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const result = await this.db.prepare(`
        SELECT id, username, password_hash, is_admin, is_approved, created_at, updated_at
        FROM users
        WHERE username = ?
      `).bind(username).first()

      return result ? validateUser(result) : null
    } catch (error) {
      console.error('Error getting user by username:', error)
      return null
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<User | null> {
    try {
      const result = await this.db.prepare(`
        SELECT id, username, password_hash, is_admin, is_approved, created_at, updated_at
        FROM users
        WHERE id = ?
      `).bind(id).first()

      return result ? validateUser(result) : null
    } catch (error) {
      console.error('Error getting user by ID:', error)
      return null
    }
  }

  /**
   * Update user
   */
  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    try {
      const user = await this.getUserById(id)
      if (!user) {
        throw new NotFoundError('User not found')
      }

      // Build dynamic update query
      const setFields: string[] = []
      const values: any[] = []

      if (updates.is_admin !== undefined) {
        setFields.push('is_admin = ?')
        values.push(updates.is_admin ? 1 : 0)
      }

      if (updates.is_approved !== undefined) {
        setFields.push('is_approved = ?')
        values.push(updates.is_approved ? 1 : 0)
      }

      if (setFields.length === 0) {
        return user // No updates to make
      }

      values.push(id) // For WHERE clause

      const result = await this.db.prepare(`
        UPDATE users 
        SET ${setFields.join(', ')}, updated_at = datetime('now')
        WHERE id = ?
        RETURNING id, username, password_hash, is_admin, is_approved, created_at, updated_at
      `).bind(...values).first()

      if (!result) {
        throw new Error('Failed to update user')
      }

      // @ts-ignore - Database result type validation
      return result as User
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id: number): Promise<void> {
    try {
      const user = await this.getUserById(id)
      if (!user) {
        throw new NotFoundError('User not found')
      }

      await this.db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(pagination: { page: number; limit: number }): Promise<{ users: UserResponse[]; total: number }> {
    try {
      const { page, limit } = ValidationUtils.validatePagination(pagination.page, pagination.limit)
      const offset = DatabaseUtils.calculateOffset(page, limit)

      // Get total count
      const countResult = await this.db.prepare('SELECT COUNT(*) as count FROM users').first()
      const total = (countResult as any)?.count || 0

      // Get users
      const users = await this.db.prepare(`
        SELECT id, username, is_admin, is_approved, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all()

      return {
        users: users.results.map(user => DatabaseUtils.toUserResponse(user)),
        total
      }
    } catch (error) {
      console.error('Error getting all users:', error)
      throw error
    }
  }

  /**
   * Get pending users (not approved)
   */
  async getPendingUsers(): Promise<UserResponse[]> {
    try {
      const users = await this.db.prepare(`
        SELECT id, username, is_admin, is_approved, created_at
        FROM users
        WHERE is_approved = 0
        ORDER BY created_at ASC
      `).all()

      return users.results.map(user => DatabaseUtils.toUserResponse(user))
    } catch (error) {
      console.error('Error getting pending users:', error)
      throw error
    }
  }

  /**
   * Authenticate user (login)
   */
  async authenticateUser(credentials: UserLogin): Promise<User | null> {
    try {
      const user = await this.getUserByUsername(credentials.username)
      if (!user) {
        return null
      }

      const isValid = await SecurityUtils.verifyPassword(credentials.password, user.password_hash)
      if (!isValid) {
        return null
      }

      return user
    } catch (error) {
      console.error('Error authenticating user:', error)
      return null
    }
  }

  // ============================================================================
  // DESIGN OPERATIONS
  // ============================================================================

  /**
   * Create a new design
   */
  async createDesign(designData: DesignCreate): Promise<Design> {
    try {
      const result = await this.db.prepare(`
        INSERT INTO designs (
          title, description, short_description, long_description, r2_object_key,
          design_number, category, style, colour, fabric, occasion, size_available,
          price_range, tags, featured, status, designer_name, collection_name, season,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `).bind(
        designData.title,
        designData.description || null,
        designData.short_description || null,
        designData.long_description || null,
        designData.r2_object_key,
        designData.design_number || null,
        designData.category,
        designData.style || null,
        designData.colour || null,
        designData.fabric || null,
        designData.occasion || null,
        designData.size_available || null,
        designData.price_range || null,
        designData.tags || null,
        designData.featured ? 1 : 0,
        'active', // status is always active for new designs
        designData.designer_name || null,
        designData.collection_name || null,
        designData.season || null,
        new Date().toISOString(),
        new Date().toISOString()
      ).first()

      if (!result) {
        throw new Error('Failed to create design')
      }

      return validateDesign(result)
    } catch (error) {
      console.error('Error creating design:', error)
      throw error
    }
  }

  /**
   * Get design by ID
   */
  async getDesignById(id: number, userId?: number): Promise<DesignResponse | null> {
    try {
      const design = await this.db.prepare(`
        SELECT * FROM designs WHERE id = ? AND status != 'draft'
      `).bind(id).first()

      if (!design) {
        return null
      }

      // Check if user has favorited this design
      let isFavorited = false
      if (userId) {
        const favorite = await this.db.prepare(`
          SELECT id FROM user_favorites WHERE user_id = ? AND design_id = ?
        `).bind(userId, id).first()
        isFavorited = !!favorite
      }

      // Generate image URLs
      const imageUrls = this.config.getAllImageUrls((design as any).cloudflare_image_id)

      return DatabaseUtils.toDesignResponse(design, imageUrls, userId ? isFavorited : undefined)
    } catch (error) {
      console.error('Error getting design by ID:', error)
      return null
    }
  }

  /**
   * Get designs with filters and pagination
   */
  async getDesigns(filters: DesignSearchFilters, userId?: number): Promise<{ designs: DesignResponse[]; total: number }> {
    try {
      const { page, limit } = ValidationUtils.validatePagination(filters.page, filters.limit)
      const offset = DatabaseUtils.calculateOffset(page, limit)

      // Build WHERE clause
      const searchFilters = { ...filters }
      delete searchFilters.page
      delete searchFilters.limit
      delete searchFilters.sort_by
      delete searchFilters.sort_order

      // Always filter out draft designs for non-admin users
      searchFilters.status = searchFilters.status || 'active'

      const { clause: whereClause, params: whereParams } = DatabaseUtils.buildWhereClause(searchFilters)
      const orderClause = DatabaseUtils.buildOrderByClause(filters.sort_by, filters.sort_order)

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM designs ${whereClause}`
      const countResult = await this.db.prepare(countQuery).bind(...whereParams).first()
      const total = (countResult as any)?.count || 0

      // Get designs
      const designQuery = `
        SELECT * FROM designs 
        ${whereClause}
        ${orderClause}
        LIMIT ? OFFSET ?
      `
      const designs = await this.db.prepare(designQuery).bind(...whereParams, limit, offset).all()

      // Process designs with image URLs and favorites
      const processedDesigns = await Promise.all(
        designs.results.map(async (design: any) => {
          let isFavorited = false
          if (userId) {
            const favorite = await this.db.prepare(`
              SELECT id FROM user_favorites WHERE user_id = ? AND design_id = ?
            `).bind(userId, design.id).first()
            isFavorited = !!favorite
          }

          const imageUrls = this.config.getAllImageUrls(design.cloudflare_image_id)
          return DatabaseUtils.toDesignResponse(design, imageUrls, userId ? isFavorited : undefined)
        })
      )

      return {
        designs: processedDesigns,
        total
      }
    } catch (error) {
      console.error('Error getting designs:', error)
      throw error
    }
  }

  /**
   * Update design
   */
  async updateDesign(id: number, updates: DesignUpdate): Promise<Design> {
    try {
      const design = await this.db.prepare('SELECT * FROM designs WHERE id = ?').bind(id).first()
      if (!design) {
        throw new NotFoundError('Design not found')
      }

      // Build dynamic update query
      const setFields: string[] = []
      const values: any[] = []

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'featured') {
            setFields.push('featured = ?')
            values.push(value ? 1 : 0)
          } else {
            setFields.push(`${key} = ?`)
            values.push(value)
          }
        }
      })

      if (setFields.length === 0) {
        return validateDesign(design)
      }

      values.push(id) // For WHERE clause

      const result = await this.db.prepare(`
        UPDATE designs 
        SET ${setFields.join(', ')}, updated_at = datetime('now')
        WHERE id = ?
        RETURNING *
      `).bind(...values).first()

      if (!result) {
        throw new Error('Failed to update design')
      }

      return validateDesign(result)
    } catch (error) {
      console.error('Error updating design:', error)
      throw error
    }
  }

  /**
   * Delete design
   */
  async deleteDesign(id: number): Promise<void> {
    try {
      const design = await this.db.prepare('SELECT * FROM designs WHERE id = ?').bind(id).first()
      if (!design) {
        throw new NotFoundError('Design not found')
      }

      await this.db.prepare('DELETE FROM designs WHERE id = ?').bind(id).run()
    } catch (error) {
      console.error('Error deleting design:', error)
      throw error
    }
  }

  /**
   * Increment view count for a design
   */
  async incrementViewCount(designId: number): Promise<void> {
    try {
      await this.db.prepare(`
        UPDATE designs 
        SET view_count = view_count + 1, updated_at = datetime('now')
        WHERE id = ?
      `).bind(designId).run()
    } catch (error) {
      console.error('Error incrementing view count:', error)
      // Don't throw error for analytics failures
    }
  }

  // ============================================================================
  // FAVORITES OPERATIONS
  // ============================================================================

  /**
   * Toggle user favorite
   */
  async toggleFavorite(userId: number, designId: number): Promise<{ is_favorited: boolean }> {
    try {
      // Check if design exists
      const design = await this.db.prepare('SELECT id FROM designs WHERE id = ?').bind(designId).first()
      if (!design) {
        throw new NotFoundError('Design not found')
      }

      // Check if already favorited
      const existing = await this.db.prepare(`
        SELECT id FROM user_favorites WHERE user_id = ? AND design_id = ?
      `).bind(userId, designId).first()

      if (existing) {
        // Remove favorite
        await this.db.prepare(`
          DELETE FROM user_favorites WHERE user_id = ? AND design_id = ?
        `).bind(userId, designId).run()
        return { is_favorited: false }
      } else {
        // Add favorite
        await this.db.prepare(`
          INSERT INTO user_favorites (user_id, design_id) VALUES (?, ?)
        `).bind(userId, designId).run()
        return { is_favorited: true }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      throw error
    }
  }

  /**
   * Get user favorites
   */
  async getUserFavorites(userId: number, pagination: { page: number; limit: number }): Promise<{ designs: DesignResponse[]; total: number }> {
    try {
      const { page, limit } = ValidationUtils.validatePagination(pagination.page, pagination.limit)
      const offset = DatabaseUtils.calculateOffset(page, limit)

      // Get total count
      const countResult = await this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM user_favorites uf 
        JOIN designs d ON uf.design_id = d.id 
        WHERE uf.user_id = ? AND d.status != 'draft'
      `).bind(userId).first()
      const total = (countResult as any)?.count || 0

      // Get favorite designs
      const favorites = await this.db.prepare(`
        SELECT d.*, uf.created_at as favorited_at
        FROM user_favorites uf
        JOIN designs d ON uf.design_id = d.id
        WHERE uf.user_id = ? AND d.status != 'draft'
        ORDER BY uf.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(userId, limit, offset).all()

      const processedDesigns = favorites.results.map((design: any) => {
        const imageUrls = this.config.getAllImageUrls(design.cloudflare_image_id)
        return DatabaseUtils.toDesignResponse(design, imageUrls, true)
      })

      return {
        designs: processedDesigns,
        total
      }
    } catch (error) {
      console.error('Error getting user favorites:', error)
      throw error
    }
  }

  // ============================================================================
  // ANALYTICS OPERATIONS
  // ============================================================================

  /**
   * Get analytics data for admin dashboard
   */
  async getAnalytics(): Promise<any> {
    try {
      // Get user counts
      const userStats = await this.db.prepare(`
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN is_approved = 1 THEN 1 ELSE 0 END) as approved_users,
          SUM(CASE WHEN is_approved = 0 THEN 1 ELSE 0 END) as pending_users,
          SUM(CASE WHEN is_admin = 1 THEN 1 ELSE 0 END) as admin_users
        FROM users
      `).first()

      // Get design counts
      const designStats = await this.db.prepare(`
        SELECT 
          COUNT(*) as total_designs,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_designs,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_designs,
          SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) as featured_designs,
          SUM(view_count) as total_views,
          AVG(view_count) as avg_views_per_design
        FROM designs
      `).first()

      // Get favorite counts
      const favoriteStats = await this.db.prepare(`
        SELECT COUNT(*) as total_favorites
        FROM user_favorites
      `).first()

      // Get recent activity (last 7 days)
      const recentUsers = await this.db.prepare(`
        SELECT COUNT(*) as new_users
        FROM users
        WHERE created_at >= datetime('now', '-7 days')
      `).first()

      const recentDesigns = await this.db.prepare(`
        SELECT COUNT(*) as new_designs
        FROM designs
        WHERE created_at >= datetime('now', '-7 days')
      `).first()

      return {
        users: userStats,
        designs: designStats,
        favorites: favoriteStats,
        recent_activity: {
          new_users_last_7_days: (recentUsers as any)?.new_users || 0,
          new_designs_last_7_days: (recentDesigns as any)?.new_designs || 0
        },
        timestamp: DateUtils.now()
      }
    } catch (error) {
      console.error('Error getting analytics:', error)
      throw error
    }
  }
} 