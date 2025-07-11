import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { secureHeaders } from 'hono/secure-headers'

// Import route modules
import authRoutes from './routes/auth'
import uploadRoutes from './routes/upload'
import designRoutes from './routes/designs'
import adminRoutes from './routes/admin'
import cartRoutes from './routes/cart'

// Import middleware
import { rateLimiter } from './middleware/rateLimit'
import { requestLogger } from './middleware/logger'
import { ResponseUtils } from './utils'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

// Apply global middleware
app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', secureHeaders())

// Apply CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Apply rate limiting (if enabled in environment)
app.use('*', async (c, next) => {
  const limiter = await rateLimiter()
  return limiter(c, next)
})

// Apply request logging
app.use('*', requestLogger)

// Simple test endpoint (no database dependency)
app.get('/test', async (c) => {
  return c.json({
    success: true,
    message: 'Worker is working!',
    timestamp: new Date().toISOString()
  })
})

// Health check endpoint
app.get('/', async (c) => {
  const env = c.env
  return c.json(ResponseUtils.success({
    message: 'Design Gallery API',
    version: '1.0.0',
    environment: env.ENVIRONMENT || 'development',
    status: 'running',
    features: {
      authentication: true,
      design_management: true,
      r2_storage: true,
      admin_panel: true,
      user_favorites: true,
      search_and_filters: true,
      shopping_cart: true,
      whatsapp_sharing: true
    }
  }, 'API is running successfully'))
})

// Health check for services (with better error handling)
app.get('/health', async (c) => {
  try {
    const env = c.env
    
    // Test database connection
    let dbStatus = 'unhealthy'
    let dbError: string | null = null
    try {
      await env.DB.prepare('SELECT 1').first()
      dbStatus = 'healthy'
    } catch (error) {
      dbError = error instanceof Error ? error.message : 'Unknown database error'
      console.error('Database health check failed:', error)
    }
    
    // Test R2 storage connection
    let r2Status = 'unhealthy'
    let r2Error: string | null = null
    try {
      await env.R2_BUCKET.list({ limit: 1 })
      r2Status = 'healthy'
    } catch (error) {
      r2Error = error instanceof Error ? error.message : 'Unknown R2 error'
      console.error('R2 health check failed:', error)
    }
    
    const overallStatus = dbStatus === 'healthy' && r2Status === 'healthy' ? 'healthy' : 'degraded'
    
    const healthData: any = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        r2_storage: r2Status
      },
      environment: env.ENVIRONMENT || 'development'
    }
    
    // Add error details if any
    if (dbError || r2Error) {
      healthData.errors = {}
      if (dbError) healthData.errors.database = dbError
      if (r2Error) healthData.errors.r2_storage = r2Error
    }
    
    return c.json(ResponseUtils.success(healthData, 'Health check completed'))
    
  } catch (error) {
    console.error('Health check failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return c.json(ResponseUtils.error('Health check failed: ' + errorMessage), 500)
  }
})

// API information endpoint
app.get('/info', async (c) => {
  const env = c.env
  return c.json(ResponseUtils.success({
    app_name: 'Design Gallery API',
    version: '1.0.0',
    description: 'Backend API for Design Gallery React Native App featuring Indian traditional wear designs',
    environment: env.ENVIRONMENT || 'development',
    features: {
      authentication: 'JWT-based authentication with admin approval system',
      design_management: 'Complete CRUD operations for design catalog',
      r2_storage: 'Cloudflare R2 for efficient image storage and delivery',
      admin_panel: 'Comprehensive admin controls for user and content management',
      user_favorites: 'Personal favorites system for users',
      search_and_filters: 'Advanced search and filtering capabilities',
      shopping_cart: 'Shopping cart functionality for approved users',
      whatsapp_sharing: 'WhatsApp sharing for selected designs',
      analytics: 'View counts, like counts, and engagement metrics'
    },
    endpoints: {
      auth: '/api/auth/*',
      designs: '/api/designs/*',
      upload: '/api/upload/*',
      admin: '/api/admin/*',
      cart: '/api/cart/*'
    },
    documentation: {
      readme: 'See README.md for setup instructions',
      api_docs: 'See docs/API_DOCUMENTATION.md for detailed API reference',
      code_flow: 'See docs/CODE_FLOW_GUIDE.md for architecture overview',
      testing: 'See docs/TESTING_GUIDE.md for testing procedures'
    }
  }, 'API information retrieved'))
})

// Mount route modules
app.route('/api/auth', authRoutes)
app.route('/api/upload', uploadRoutes)
app.route('/api/designs', designRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/cart', cartRoutes)

// Global error handler
app.onError((error, c) => {
  console.error('Global error:', error)
  
  // Check if it's a known error type
  if (error.name === 'ValidationError') {
    return c.json(ResponseUtils.error(error.message, 'VALIDATION_ERROR'), 400)
  }
  
  if (error.name === 'AuthenticationError') {
    return c.json(ResponseUtils.error(error.message, 'AUTHENTICATION_ERROR'), 401)
  }
  
  if (error.name === 'AuthorizationError') {
    return c.json(ResponseUtils.error(error.message, 'AUTHORIZATION_ERROR'), 403)
  }
  
  if (error.name === 'NotFoundError') {
    return c.json(ResponseUtils.error(error.message, 'NOT_FOUND'), 404)
  }
  
  if (error.name === 'ConflictError') {
    return c.json(ResponseUtils.error(error.message, 'CONFLICT'), 409)
  }
  
  // Generic server error
  return c.json(ResponseUtils.error('Internal server error', 'INTERNAL_ERROR'), 500)
})

// 404 handler for unmatched routes
app.notFound((c) => {
  return c.json(ResponseUtils.error('Route not found', 'NOT_FOUND'), 404)
})

export default app 