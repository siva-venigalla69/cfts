import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import { ResponseUtils, ValidationUtils, SecurityUtils } from '../utils'
import type { Env, UserResponse, AppSetting } from '../types'

const app = new Hono<{ Bindings: Env }>()

// Apply CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

/**
 * Helper function to format user response
 */
function formatUserResponse(user: any): UserResponse {
  return {
    id: user.id,
    username: user.username,
    is_admin: Boolean(user.is_admin),
    is_approved: Boolean(user.is_approved),
    created_at: user.created_at,
    updated_at: user.updated_at
  }
}

/**
 * Get all users with pagination
 * GET /admin/users
 */
app.get('/users', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const page = parseInt(c.req.query('page') || '1')
    const per_page = parseInt(c.req.query('per_page') || '20')
    const status = c.req.query('status') // 'approved', 'pending', 'all'
    
    const { page: validPage, limit: validLimit } = ValidationUtils.validatePagination(page, per_page, 100)
    
    // Build query conditions
    const conditions: string[] = []
    const params: any[] = []
    
    if (status === 'approved') {
      conditions.push('is_approved = ?')
      params.push(1)
    } else if (status === 'pending') {
      conditions.push('is_approved = ?')
      params.push(0)
    }
    // 'all' or no status means no filter
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM users ${whereClause}`
    const countResult = await env.DB.prepare(countQuery).bind(...params).first()
    const total = countResult?.count || 0
    
    // Get users
    const offset = (validPage - 1) * validLimit
    const usersQuery = `
      SELECT * FROM users 
      ${whereClause} 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `
    
    const result = await env.DB.prepare(usersQuery)
      .bind(...params, validLimit, offset)
      .all()
    
    const users = result.results?.map((user: any) => formatUserResponse(user)) || []
    
    const response = {
      users,
      total,
      page: validPage,
      per_page: validLimit,
      total_pages: Math.ceil(total / validLimit)
    }
    
    return c.json(ResponseUtils.success(response, 'Users retrieved successfully'))
    
  } catch (error) {
    console.error('Get users error:', error)
    return c.json(ResponseUtils.error('Failed to retrieve users'), 500)
  }
})

/**
 * Get pending users for approval
 * GET /admin/users/pending
 */
app.get('/users/pending', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    
    const query = `
      SELECT * FROM users 
      WHERE is_approved = 0 
      ORDER BY created_at ASC
    `
    
    const result = await env.DB.prepare(query).all()
    const users = result.results?.map((user: any) => formatUserResponse(user)) || []
    
    return c.json(ResponseUtils.success(users, 'Pending users retrieved successfully'))
    
  } catch (error) {
    console.error('Get pending users error:', error)
    return c.json(ResponseUtils.error('Failed to retrieve pending users'), 500)
  }
})

/**
 * Approve a user
 * POST /admin/users/:id/approve
 */
app.post('/users/:id/approve', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const userId = parseInt(c.req.param('id'))
    
    if (!userId) {
      return c.json(ResponseUtils.error('Invalid user ID'), 400)
    }
    
    // Check if user exists
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
    
    if (!user) {
      return c.json(ResponseUtils.error('User not found'), 404)
    }
    
    if (user.is_approved) {
      return c.json(ResponseUtils.error('User is already approved'), 400)
    }
    
    // Approve user
    const result = await env.DB.prepare(
      'UPDATE users SET is_approved = ?, updated_at = ? WHERE id = ?'
    ).bind(1, new Date().toISOString(), userId).run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to approve user'), 500)
    }
    
    // Get updated user
    const updatedUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
    const response = formatUserResponse(updatedUser)
    
    return c.json(ResponseUtils.success(response, 'User approved successfully'))
    
  } catch (error) {
    console.error('Approve user error:', error)
    return c.json(ResponseUtils.error('Failed to approve user'), 500)
  }
})

/**
 * Reject/disapprove a user
 * POST /admin/users/:id/reject
 */
app.post('/users/:id/reject', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const userId = parseInt(c.req.param('id'))
    
    if (!userId) {
      return c.json(ResponseUtils.error('Invalid user ID'), 400)
    }
    
    // Check if user exists
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
    
    if (!user) {
      return c.json(ResponseUtils.error('User not found'), 404)
    }
    
    // Reject user (set is_approved to false)
    const result = await env.DB.prepare(
      'UPDATE users SET is_approved = ?, updated_at = ? WHERE id = ?'
    ).bind(0, new Date().toISOString(), userId).run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to reject user'), 500)
    }
    
    // Get updated user
    const updatedUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
    const response = formatUserResponse(updatedUser)
    
    return c.json(ResponseUtils.success(response, 'User rejected successfully'))
    
  } catch (error) {
    console.error('Reject user error:', error)
    return c.json(ResponseUtils.error('Failed to reject user'), 500)
  }
})

/**
 * Toggle admin status for a user
 * POST /admin/users/:id/toggle-admin
 */
app.post('/users/:id/toggle-admin', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const currentUser = c.get('user')
    const userId = parseInt(c.req.param('id'))
    
    if (!userId) {
      return c.json(ResponseUtils.error('Invalid user ID'), 400)
    }
    
    // Prevent self-admin removal
    if (userId === currentUser.user_id) {
      return c.json(ResponseUtils.error('Cannot modify your own admin status'), 400)
    }
    
    // Check if user exists
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
    
    if (!user) {
      return c.json(ResponseUtils.error('User not found'), 404)
    }
    
    // Toggle admin status
    const newAdminStatus = user.is_admin ? 0 : 1
    const result = await env.DB.prepare(
      'UPDATE users SET is_admin = ?, updated_at = ? WHERE id = ?'
    ).bind(newAdminStatus, new Date().toISOString(), userId).run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to update admin status'), 500)
    }
    
    // Get updated user
    const updatedUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
    const response = formatUserResponse(updatedUser)
    
    const action = newAdminStatus ? 'granted' : 'revoked'
    return c.json(ResponseUtils.success(response, `Admin privileges ${action} successfully`))
    
  } catch (error) {
    console.error('Toggle admin error:', error)
    return c.json(ResponseUtils.error('Failed to update admin status'), 500)
  }
})

/**
 * Delete a user
 * DELETE /admin/users/:id
 */
app.delete('/users/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const currentUser = c.get('user')
    const userId = parseInt(c.req.param('id'))
    
    if (!userId) {
      return c.json(ResponseUtils.error('Invalid user ID'), 400)
    }
    
    // Prevent self-deletion
    if (userId === currentUser.user_id) {
      return c.json(ResponseUtils.error('Cannot delete your own account'), 400)
    }
    
    // Check if user exists
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
    
    if (!user) {
      return c.json(ResponseUtils.error('User not found'), 404)
    }
    
    // Delete user (this will cascade delete favorites due to FK constraint)
    const result = await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to delete user'), 500)
    }
    
    return c.json(ResponseUtils.success(null, 'User deleted successfully'))
    
  } catch (error) {
    console.error('Delete user error:', error)
    return c.json(ResponseUtils.error('Failed to delete user'), 500)
  }
})

/**
 * Get system statistics
 * GET /admin/stats
 */
app.get('/stats', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    
    // Get user statistics
    const userStatsQuery = `
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN is_approved = 1 THEN 1 ELSE 0 END) as approved_users,
        SUM(CASE WHEN is_approved = 0 THEN 1 ELSE 0 END) as pending_users,
        SUM(CASE WHEN is_admin = 1 THEN 1 ELSE 0 END) as admin_users
      FROM users
    `
    const userStats = await env.DB.prepare(userStatsQuery).first()
    
    // Get design statistics
    const designStatsQuery = `
      SELECT 
        COUNT(*) as total_designs,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_designs,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_designs,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_designs,
        SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) as featured_designs,
        SUM(view_count) as total_views,
        SUM(like_count) as total_likes
      FROM designs
    `
    const designStats = await env.DB.prepare(designStatsQuery).first()
    
    // Get favorites count
    const favoritesQuery = `SELECT COUNT(*) as total_favorites FROM user_favorites`
    const favoritesStats = await env.DB.prepare(favoritesQuery).first()
    
    // Get top designs by views
    const topViewedQuery = `
      SELECT title, view_count 
      FROM designs 
      WHERE status = 'active' 
      ORDER BY view_count DESC 
      LIMIT 5
    `
    const topViewed = await env.DB.prepare(topViewedQuery).all()
    
    // Get top designs by likes
    const topLikedQuery = `
      SELECT title, like_count 
      FROM designs 
      WHERE status = 'active' 
      ORDER BY like_count DESC 
      LIMIT 5
    `
    const topLiked = await env.DB.prepare(topLikedQuery).all()
    
    // Get recent activity (last 7 days)
    const recentActivityQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as designs_created
      FROM designs 
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `
    const recentActivity = await env.DB.prepare(recentActivityQuery).all()
    
    const stats = {
      users: {
        total: userStats?.total_users || 0,
        approved: userStats?.approved_users || 0,
        pending: userStats?.pending_users || 0,
        admins: userStats?.admin_users || 0
      },
      designs: {
        total: designStats?.total_designs || 0,
        active: designStats?.active_designs || 0,
        inactive: designStats?.inactive_designs || 0,
        draft: designStats?.draft_designs || 0,
        featured: designStats?.featured_designs || 0
      },
      engagement: {
        total_views: designStats?.total_views || 0,
        total_likes: designStats?.total_likes || 0,
        total_favorites: favoritesStats?.total_favorites || 0
      },
      top_designs: {
        by_views: topViewed.results || [],
        by_likes: topLiked.results || []
      },
      recent_activity: recentActivity.results || []
    }
    
    return c.json(ResponseUtils.success(stats, 'System statistics retrieved successfully'))
    
  } catch (error) {
    console.error('Get stats error:', error)
    return c.json(ResponseUtils.error('Failed to retrieve statistics'), 500)
  }
})

/**
 * Get app settings
 * GET /admin/settings
 */
app.get('/settings', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    
    const query = `SELECT * FROM app_settings ORDER BY key`
    const result = await env.DB.prepare(query).all()
    
    const settings = result.results || []
    
    return c.json(ResponseUtils.success(settings, 'App settings retrieved successfully'))
    
  } catch (error) {
    console.error('Get settings error:', error)
    return c.json(ResponseUtils.error('Failed to retrieve settings'), 500)
  }
})

/**
 * Update app setting
 * PUT /admin/settings/:key
 */
app.put('/settings/:key', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const settingKey = c.req.param('key')
    const { value, description } = await c.req.json()
    
    if (!settingKey || value === undefined) {
      return c.json(ResponseUtils.error('Key and value are required'), 400)
    }
    
    // Check if setting exists
    const existingSetting = await env.DB.prepare('SELECT * FROM app_settings WHERE key = ?')
      .bind(settingKey)
      .first()
    
    if (!existingSetting) {
      return c.json(ResponseUtils.error('Setting not found'), 404)
    }
    
    // Update setting
    const updateQuery = `
      UPDATE app_settings 
      SET value = ?, description = COALESCE(?, description), updated_at = ?
      WHERE key = ?
    `
    
    const result = await env.DB.prepare(updateQuery)
      .bind(value, description, new Date().toISOString(), settingKey)
      .run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to update setting'), 500)
    }
    
    // Get updated setting
    const updatedSetting = await env.DB.prepare('SELECT * FROM app_settings WHERE key = ?')
      .bind(settingKey)
      .first()
    
    return c.json(ResponseUtils.success(updatedSetting, 'Setting updated successfully'))
    
  } catch (error) {
    console.error('Update setting error:', error)
    return c.json(ResponseUtils.error('Failed to update setting'), 500)
  }
})

/**
 * Create new app setting
 * POST /admin/settings
 */
app.post('/settings', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const { key, value, description } = await c.req.json()
    
    if (!key || value === undefined) {
      return c.json(ResponseUtils.error('Key and value are required'), 400)
    }
    
    // Check if setting already exists
    const existingSetting = await env.DB.prepare('SELECT * FROM app_settings WHERE key = ?')
      .bind(key)
      .first()
    
    if (existingSetting) {
      return c.json(ResponseUtils.error('Setting already exists'), 400)
    }
    
    // Create setting
    const now = new Date().toISOString()
    const insertQuery = `
      INSERT INTO app_settings (key, value, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `
    
    const result = await env.DB.prepare(insertQuery)
      .bind(key, value, description || null, now, now)
      .run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to create setting'), 500)
    }
    
    // Get created setting
    const createdSetting = await env.DB.prepare('SELECT * FROM app_settings WHERE key = ?')
      .bind(key)
      .first()
    
    return c.json(ResponseUtils.success(createdSetting, 'Setting created successfully'), 201)
    
  } catch (error) {
    console.error('Create setting error:', error)
    return c.json(ResponseUtils.error('Failed to create setting'), 500)
  }
})

/**
 * Delete app setting
 * DELETE /admin/settings/:key
 */
app.delete('/settings/:key', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const settingKey = c.req.param('key')
    
    if (!settingKey) {
      return c.json(ResponseUtils.error('Setting key is required'), 400)
    }
    
    // Check if setting exists
    const existingSetting = await env.DB.prepare('SELECT * FROM app_settings WHERE key = ?')
      .bind(settingKey)
      .first()
    
    if (!existingSetting) {
      return c.json(ResponseUtils.error('Setting not found'), 404)
    }
    
    // Delete setting
    const result = await env.DB.prepare('DELETE FROM app_settings WHERE key = ?')
      .bind(settingKey)
      .run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to delete setting'), 500)
    }
    
    return c.json(ResponseUtils.success(null, 'Setting deleted successfully'))
    
  } catch (error) {
    console.error('Delete setting error:', error)
    return c.json(ResponseUtils.error('Failed to delete setting'), 500)
  }
})

/**
 * Bulk approve users
 * POST /admin/users/bulk-approve
 */
app.post('/users/bulk-approve', authMiddleware, adminMiddleware, async (c) => {
  try {
    const env = c.env
    const { user_ids } = await c.req.json()
    
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return c.json(ResponseUtils.error('User IDs array is required'), 400)
    }
    
    // Validate all user IDs exist and are pending
    const placeholders = user_ids.map(() => '?').join(',')
    const checkQuery = `
      SELECT id FROM users 
      WHERE id IN (${placeholders}) AND is_approved = 0
    `
    
    const existingUsers = await env.DB.prepare(checkQuery).bind(...user_ids).all()
    const existingIds = existingUsers.results?.map((u: any) => u.id) || []
    
    if (existingIds.length !== user_ids.length) {
      return c.json(ResponseUtils.error('Some users not found or already approved'), 400)
    }
    
    // Bulk approve users
    const updateQuery = `
      UPDATE users 
      SET is_approved = 1, updated_at = ?
      WHERE id IN (${placeholders})
    `
    
    const result = await env.DB.prepare(updateQuery)
      .bind(new Date().toISOString(), ...user_ids)
      .run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to approve users'), 500)
    }
    
    return c.json(ResponseUtils.success(
      { approved_count: user_ids.length },
      `${user_ids.length} users approved successfully`
    ))
    
  } catch (error) {
    console.error('Bulk approve error:', error)
    return c.json(ResponseUtils.error('Failed to approve users'), 500)
  }
})

export default app 