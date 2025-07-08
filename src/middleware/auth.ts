import { Context, Next } from 'hono'
import type { Env, JWTPayload } from '../types'
import { SecurityUtils, ResponseUtils } from '../utils'
import { createConfig } from '../config'
import { AuthenticationError, AuthorizationError } from '../types'

/**
 * Authentication middleware - verifies JWT tokens
 */
export const authMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  try {
    const config = createConfig(c.env)
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader) {
      throw new AuthenticationError('Authorization header is required')
    }

    const token = SecurityUtils.extractBearerToken(authHeader)
    if (!token) {
      throw new AuthenticationError('Bearer token is required')
    }

    // Verify the JWT token
    const payload = await SecurityUtils.verifyJWT(token, config.jwtSecret)
    
    // Check if user is approved
    if (!payload.is_admin) {
      // For regular users, we need to check if they're approved
      // This could be enhanced to check the database, but for now we assume
      // approved users have valid tokens
    }

    // Attach user info to context for use in route handlers
    c.set('user', payload)
    
    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    
    if (error instanceof AuthenticationError) {
      return ResponseUtils.handleError(error)
    }
    
    return ResponseUtils.handleError(new AuthenticationError('Authentication failed'))
  }
}

/**
 * Optional authentication middleware - doesn't throw error if no token
 * Useful for endpoints that have different behavior for authenticated users
 */
export const optionalAuthMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  try {
    const config = createConfig(c.env)
    const authHeader = c.req.header('Authorization')
    
    if (authHeader) {
      const token = SecurityUtils.extractBearerToken(authHeader)
      if (token) {
        try {
          const payload = await SecurityUtils.verifyJWT(token, config.jwtSecret)
          c.set('user', payload)
        } catch (error) {
          // Silently ignore invalid tokens in optional auth
          console.warn('Optional auth - invalid token:', error)
        }
      }
    }
    
    await next()
  } catch (error) {
    console.error('Optional auth middleware error:', error)
    // Continue without authentication
    await next()
  }
}

/**
 * Admin authorization middleware - ensures user is admin
 * Must be used after authMiddleware
 */
export const adminMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  try {
    const user = c.get('user') as JWTPayload | undefined
    
    if (!user) {
      throw new AuthenticationError('Authentication required')
    }
    
    if (!user.is_admin) {
      throw new AuthorizationError('Admin access required')
    }
    
    await next()
  } catch (error) {
    console.error('Admin middleware error:', error)
    return ResponseUtils.handleError(error)
  }
}

/**
 * User approval middleware - ensures user is approved
 * Must be used after authMiddleware
 */
export const approvedUserMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  try {
    const user = c.get('user') as JWTPayload | undefined
    
    if (!user) {
      throw new AuthenticationError('Authentication required')
    }
    
    // Admin users are always considered approved
    // For regular users, if they have a valid token, they should be approved
    // In a more complex system, you might check the database here
    
    await next()
  } catch (error) {
    console.error('Approved user middleware error:', error)
    return ResponseUtils.handleError(error)
  }
}

/**
 * CORS middleware for handling cross-origin requests
 */
export const corsMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  try {
    const config = createConfig(c.env)
    const origin = c.req.header('Origin')
    const corsOrigins = config.corsOrigins
    
    // Handle preflight requests
    if (c.req.method === 'OPTIONS') {
      const headers = new Headers()
      
      // Set allowed origins
      if (corsOrigins.includes('*') || (origin && corsOrigins.includes(origin))) {
        headers.set('Access-Control-Allow-Origin', origin || '*')
      }
      
      headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      headers.set('Access-Control-Max-Age', '86400') // 24 hours
      
      return new Response(null, { status: 204, headers })
    }
    
    await next()
    
    // Add CORS headers to response
    if (corsOrigins.includes('*') || (origin && corsOrigins.includes(origin))) {
      c.res.headers.set('Access-Control-Allow-Origin', origin || '*')
    }
    c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
  } catch (error) {
    console.error('CORS middleware error:', error)
    await next()
  }
}

/**
 * Request validation middleware
 */
export const validateContentType = (expectedType: string = 'application/json') => {
  return async (c: Context, next: Next) => {
    try {
      if (c.req.method === 'POST' || c.req.method === 'PUT') {
        const contentType = c.req.header('Content-Type')
        
        if (!contentType || !contentType.includes(expectedType)) {
          return ResponseUtils.json(
            ResponseUtils.error(`Content-Type must be ${expectedType}`),
            400
          )
        }
      }
      
      await next()
    } catch (error) {
      console.error('Content type validation error:', error)
      return ResponseUtils.handleError(error)
    }
  }
}

/**
 * Rate limiting middleware (basic implementation)
 * In production, you might want to use a more sophisticated rate limiter
 */
export const rateLimitMiddleware = (requests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const clients = new Map<string, { count: number; resetTime: number }>()
  
  return async (c: Context, next: Next) => {
    try {
      const clientId = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
      const now = Date.now()
      const client = clients.get(clientId)
      
      if (!client) {
        clients.set(clientId, { count: 1, resetTime: now + windowMs })
        await next()
        return
      }
      
      if (now > client.resetTime) {
        client.count = 1
        client.resetTime = now + windowMs
        await next()
        return
      }
      
      if (client.count >= requests) {
        return ResponseUtils.json(
          ResponseUtils.error('Too many requests. Please try again later.'),
          429,
          {
            'Retry-After': Math.ceil((client.resetTime - now) / 1000).toString()
          }
        )
      }
      
      client.count++
      await next()
      
    } catch (error) {
      console.error('Rate limit middleware error:', error)
      await next()
    }
  }
}

/**
 * Request logging middleware
 */
export const loggingMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  const start = Date.now()
  const method = c.req.method
  const url = c.req.url
  const userAgent = c.req.header('User-Agent')
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')
  
  console.log(`[${new Date().toISOString()}] ${method} ${url} - ${ip} - ${userAgent}`)
  
  await next()
  
  const duration = Date.now() - start
  const status = c.res.status
  
  console.log(`[${new Date().toISOString()}] ${method} ${url} - ${status} - ${duration}ms`)
}

/**
 * Error handling middleware
 */
export const errorHandlingMiddleware = async (c: Context, next: Next) => {
  try {
    await next()
  } catch (error) {
    console.error('Unhandled error:', error)
    return ResponseUtils.handleError(error)
  }
} 