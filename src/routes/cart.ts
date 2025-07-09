import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from '../middleware/auth'
import { ResponseUtils, ValidationUtils, getR2PublicUrl } from '../utils'
import type { 
  Env, 
  CartResponse,
  CartItemWithDesign,
  AddToCartRequest,
  UpdateCartItemRequest,
  WhatsAppShareRequest,
  WhatsAppShareResponse,
  JWTPayload
} from '../types'

const app = new Hono<{ Bindings: Env }>()

// Apply CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

/**
 * Helper function to format cart item with design
 */
function formatCartItemWithDesign(cartItem: any, design: any, env: Env): CartItemWithDesign {
  return {
    id: cartItem.id,
    cart_id: cartItem.cart_id,
    design_id: cartItem.design_id,
    quantity: cartItem.quantity,
    notes: cartItem.notes,
    created_at: cartItem.created_at,
    updated_at: cartItem.updated_at,
    design: {
      id: design.id,
      title: design.title,
      description: design.description,
      short_description: design.short_description,
      long_description: design.long_description,
      image_url: getR2PublicUrl(design.r2_object_key, env),
      r2_object_key: design.r2_object_key,
      design_number: design.design_number,
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
}

/**
 * Get user's shopping cart
 * GET /cart
 */
app.get('/', authMiddleware, async (c) => {
  try {
    const env = c.env
    const user = c.get('user') as JWTPayload
    
    // Get or create user cart
    let cart = await env.DB.prepare('SELECT * FROM user_carts WHERE user_id = ?')
      .bind(user.user_id)
      .first()
    
    if (!cart) {
      // Create new cart for user
      const result = await env.DB.prepare(
        'INSERT INTO user_carts (user_id, created_at, updated_at) VALUES (?, ?, ?)'
      ).bind(user.user_id, new Date().toISOString(), new Date().toISOString()).run()
      
      if (!result.success) {
        return c.json(ResponseUtils.error('Failed to create cart'), 500)
      }
      
      cart = await env.DB.prepare('SELECT * FROM user_carts WHERE user_id = ?')
        .bind(user.user_id)
        .first()
    }
    
    if (!cart) {
      return c.json(ResponseUtils.error('Failed to create or retrieve cart'), 500)
    }
    
    // Get cart items with design details
    const cartItemsQuery = `
      SELECT ci.*, d.* 
      FROM cart_items ci
      JOIN designs d ON ci.design_id = d.id
      WHERE ci.cart_id = ? AND d.status = 'active'
      ORDER BY ci.created_at DESC
    `
    
    const cartItemsResult = await env.DB.prepare(cartItemsQuery)
      .bind(cart.id)
      .all()
    
    const items: CartItemWithDesign[] = cartItemsResult.results?.map((row: any) => {
      const cartItem = {
        id: row.id,
        cart_id: row.cart_id,
        design_id: row.design_id,
        quantity: row.quantity,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
      
      const design = {
        id: row.design_id,
        title: row.title,
        description: row.description,
        short_description: row.short_description,
        long_description: row.long_description,
        r2_object_key: row.r2_object_key,
        design_number: row.design_number,
        category: row.category,
        style: row.style,
        colour: row.colour,
        fabric: row.fabric,
        occasion: row.occasion,
        size_available: row.size_available,
        price_range: row.price_range,
        tags: row.tags,
        featured: row.featured,
        status: row.status,
        view_count: row.view_count,
        like_count: row.like_count,
        designer_name: row.designer_name,
        collection_name: row.collection_name,
        season: row.season,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
      
      return formatCartItemWithDesign(cartItem, design, env)
    }) || []
    
    const response: CartResponse = {
      id: cart.id as number,
      user_id: cart.user_id as number,
      items,
      total_items: items.length,
      created_at: cart.created_at as string,
      updated_at: cart.updated_at as string
    }
    
    return c.json(ResponseUtils.success(response, 'Cart retrieved successfully'))
    
  } catch (error) {
    console.error('Get cart error:', error)
    return c.json(ResponseUtils.error('Failed to retrieve cart'), 500)
  }
})

/**
 * Add design to cart
 * POST /cart/items
 */
app.post('/items', authMiddleware, async (c) => {
  try {
    const env = c.env
    const user = c.get('user')
    const body: AddToCartRequest = await c.req.json()
    
    // Validate request
    if (!body.design_id) {
      return c.json(ResponseUtils.error('Design ID is required'), 400)
    }
    
    const quantity = body.quantity || 1
    if (quantity < 1 || quantity > 10) {
      return c.json(ResponseUtils.error('Quantity must be between 1 and 10'), 400)
    }
    
    // Check if design exists and is active
    const design = await env.DB.prepare('SELECT id FROM designs WHERE id = ? AND status = ?')
      .bind(body.design_id, 'active')
      .first()
    
    if (!design) {
      return c.json(ResponseUtils.error('Design not found or not available'), 404)
    }
    
    // Get or create user cart
    let cart = await env.DB.prepare('SELECT * FROM user_carts WHERE user_id = ?')
      .bind(user.user_id)
      .first()
    
    if (!cart) {
      const result = await env.DB.prepare(
        'INSERT INTO user_carts (user_id, created_at, updated_at) VALUES (?, ?, ?)'
      ).bind(user.user_id, new Date().toISOString(), new Date().toISOString()).run()
      
      if (!result.success) {
        return c.json(ResponseUtils.error('Failed to create cart'), 500)
      }
      
      cart = await env.DB.prepare('SELECT * FROM user_carts WHERE user_id = ?')
        .bind(user.user_id)
        .first()
    }
    
    // Check if design is already in cart
    const existingItem = await env.DB.prepare(
      'SELECT * FROM cart_items WHERE cart_id = ? AND design_id = ?'
    ).bind(cart.id, body.design_id).first()
    
    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity
      if (newQuantity > 10) {
        return c.json(ResponseUtils.error('Maximum quantity per design is 10'), 400)
      }
      
      const result = await env.DB.prepare(
        'UPDATE cart_items SET quantity = ?, notes = ?, updated_at = ? WHERE id = ?'
      ).bind(newQuantity, body.notes || existingItem.notes, new Date().toISOString(), existingItem.id).run()
      
      if (!result.success) {
        return c.json(ResponseUtils.error('Failed to update cart item'), 500)
      }
      
      return c.json(ResponseUtils.success(null, 'Cart item updated successfully'))
    } else {
      // Add new item
      const result = await env.DB.prepare(
        'INSERT INTO cart_items (cart_id, design_id, quantity, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(cart.id, body.design_id, quantity, body.notes || null, new Date().toISOString(), new Date().toISOString()).run()
      
      if (!result.success) {
        return c.json(ResponseUtils.error('Failed to add item to cart'), 500)
      }
      
      return c.json(ResponseUtils.success(null, 'Item added to cart successfully'))
    }
    
  } catch (error) {
    console.error('Add to cart error:', error)
    return c.json(ResponseUtils.error('Failed to add item to cart'), 500)
  }
})

/**
 * Update cart item
 * PUT /cart/items/:id
 */
app.put('/items/:id', authMiddleware, async (c) => {
  try {
    const env = c.env
    const user = c.get('user')
    const itemId = parseInt(c.req.param('id'))
    const body: UpdateCartItemRequest = await c.req.json()
    
    if (!itemId) {
      return c.json(ResponseUtils.error('Invalid item ID'), 400)
    }
    
    // Validate quantity if provided
    if (body.quantity !== undefined) {
      if (body.quantity < 1 || body.quantity > 10) {
        return c.json(ResponseUtils.error('Quantity must be between 1 and 10'), 400)
      }
    }
    
    // Check if item belongs to user's cart
    const item = await env.DB.prepare(`
      SELECT ci.* FROM cart_items ci
      JOIN user_carts uc ON ci.cart_id = uc.id
      WHERE ci.id = ? AND uc.user_id = ?
    `).bind(itemId, user.user_id).first()
    
    if (!item) {
      return c.json(ResponseUtils.error('Cart item not found'), 404)
    }
    
    // Update item
    const updateFields: string[] = []
    const params: any[] = []
    
    if (body.quantity !== undefined) {
      updateFields.push('quantity = ?')
      params.push(body.quantity)
    }
    
    if (body.notes !== undefined) {
      updateFields.push('notes = ?')
      params.push(body.notes)
    }
    
    if (updateFields.length === 0) {
      return c.json(ResponseUtils.error('No fields to update'), 400)
    }
    
    updateFields.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(itemId)
    
    const result = await env.DB.prepare(
      `UPDATE cart_items SET ${updateFields.join(', ')} WHERE id = ?`
    ).bind(...params).run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to update cart item'), 500)
    }
    
    return c.json(ResponseUtils.success(null, 'Cart item updated successfully'))
    
  } catch (error) {
    console.error('Update cart item error:', error)
    return c.json(ResponseUtils.error('Failed to update cart item'), 500)
  }
})

/**
 * Remove item from cart
 * DELETE /cart/items/:id
 */
app.delete('/items/:id', authMiddleware, async (c) => {
  try {
    const env = c.env
    const user = c.get('user')
    const itemId = parseInt(c.req.param('id'))
    
    if (!itemId) {
      return c.json(ResponseUtils.error('Invalid item ID'), 400)
    }
    
    // Check if item belongs to user's cart
    const item = await env.DB.prepare(`
      SELECT ci.* FROM cart_items ci
      JOIN user_carts uc ON ci.cart_id = uc.id
      WHERE ci.id = ? AND uc.user_id = ?
    `).bind(itemId, user.user_id).first()
    
    if (!item) {
      return c.json(ResponseUtils.error('Cart item not found'), 404)
    }
    
    // Remove item
    const result = await env.DB.prepare('DELETE FROM cart_items WHERE id = ?')
      .bind(itemId)
      .run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to remove cart item'), 500)
    }
    
    return c.json(ResponseUtils.success(null, 'Item removed from cart successfully'))
    
  } catch (error) {
    console.error('Remove cart item error:', error)
    return c.json(ResponseUtils.error('Failed to remove cart item'), 500)
  }
})

/**
 * Clear entire cart
 * DELETE /cart
 */
app.delete('/', authMiddleware, async (c) => {
  try {
    const env = c.env
    const user = c.get('user')
    
    // Get user's cart
    const cart = await env.DB.prepare('SELECT * FROM user_carts WHERE user_id = ?')
      .bind(user.user_id)
      .first()
    
    if (!cart) {
      return c.json(ResponseUtils.error('Cart not found'), 404)
    }
    
    // Remove all items from cart
    const result = await env.DB.prepare('DELETE FROM cart_items WHERE cart_id = ?')
      .bind(cart.id)
      .run()
    
    if (!result.success) {
      return c.json(ResponseUtils.error('Failed to clear cart'), 500)
    }
    
    return c.json(ResponseUtils.success(null, 'Cart cleared successfully'))
    
  } catch (error) {
    console.error('Clear cart error:', error)
    return c.json(ResponseUtils.error('Failed to clear cart'), 500)
  }
})

/**
 * Share cart items via WhatsApp
 * POST /cart/share
 */
app.post('/share', authMiddleware, async (c) => {
  try {
    const env = c.env
    const user = c.get('user')
    const body: WhatsAppShareRequest = await c.req.json()
    
    // Validate request
    if (!body.design_ids || body.design_ids.length === 0) {
      return c.json(ResponseUtils.error('Design IDs are required'), 400)
    }
    
    if (body.design_ids.length > 20) {
      return c.json(ResponseUtils.error('Maximum 20 designs can be shared at once'), 400)
    }
    
    // Get WhatsApp settings
    const whatsappNumbers = await env.DB.prepare(
      'SELECT value FROM app_settings WHERE key = ?'
    ).bind('whatsapp_contact_numbers').first()
    
    const messageTemplate = await env.DB.prepare(
      'SELECT value FROM app_settings WHERE key = ?'
    ).bind('whatsapp_message_template').first()
    
    const contactNumbers = whatsappNumbers?.value || '+919876543210'
    const template = messageTemplate?.value || 'Hi! I found these beautiful designs in the gallery. Please check them out: {design_list}'
    
    // Get design details
    const designsQuery = `
      SELECT id, title, design_number, category, style, colour
      FROM designs 
      WHERE id IN (${body.design_ids.map(() => '?').join(',')}) AND status = 'active'
    `
    
    const designsResult = await env.DB.prepare(designsQuery)
      .bind(...body.design_ids)
      .all()
    
    const designs = designsResult.results || []
    
    if (designs.length === 0) {
      return c.json(ResponseUtils.error('No valid designs found'), 404)
    }
    
    // Build design list for message
    const designList = designs.map((design: any) => {
      const details = [
        design.title,
        design.design_number ? `Design #${design.design_number}` : '',
        design.category,
        design.style,
        design.colour
      ].filter(Boolean).join(' - ')
      
      return `• ${details}`
    }).join('\n')
    
    // Build WhatsApp message
    const message = body.message || template.replace('{design_list}', designList)
    
    // Create WhatsApp share URL
    const shareUrl = `https://wa.me/${contactNumbers.split(',')[0].trim()}?text=${encodeURIComponent(message)}`
    
    const response: WhatsAppShareResponse = {
      share_url: shareUrl,
      message,
      design_count: designs.length
    }
    
    return c.json(ResponseUtils.success(response, 'WhatsApp share link generated successfully'))
    
  } catch (error) {
    console.error('WhatsApp share error:', error)
    return c.json(ResponseUtils.error('Failed to generate WhatsApp share link'), 500)
  }
})

export default app 