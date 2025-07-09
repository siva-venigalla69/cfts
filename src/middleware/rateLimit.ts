import { Context, Next } from 'hono'
import type { Env } from '../types'

// Simple in-memory rate limiter for when KV is not available
const memoryStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Simple rate limiter using KV storage
 * This is a basic implementation - consider using more sophisticated solutions for production
 */
export async function rateLimiter(
  requests: number = 100,
  windowMs: number = 60000, // 1 minute
  keyGenerator?: (c: Context) => string
) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    try {
      // Generate rate limit key
      const key = keyGenerator ? 
        keyGenerator(c) : 
        `ratelimit:${c.req.header('cf-connecting-ip') || 'unknown'}`
      
      // Get current count from memory store (KV not configured)
      let currentCount = 0
      const now = Date.now()
      
      // Use memory store since KV is not configured
      const stored = memoryStore.get(key)
      if (stored && stored.resetTime > now) {
        currentCount = stored.count
      } else {
        currentCount = 0
      }
      
      // Check if limit exceeded
      if (currentCount >= requests) {
        return c.json({
          success: false,
          message: 'Rate limit exceeded. Please try again later.',
          error: 'RATE_LIMIT_EXCEEDED'
        }, 429)
      }
      
      // Increment counter in memory store
      memoryStore.set(key, {
        count: currentCount + 1,
        resetTime: now + windowMs
      })
      
      await next()
    } catch (error) {
      console.error('Rate limiter error:', error)
      // On error, continue without rate limiting
      await next()
    }
  }
}

/**
 * Rate limiter for authentication endpoints
 */
export const authRateLimit = rateLimiter(5, 300000) // 5 requests per 5 minutes

/**
 * Rate limiter for general API endpoints
 */
export const apiRateLimit = rateLimiter(100, 60000) // 100 requests per minute

/**
 * Rate limiter for upload endpoints
 */
export const uploadRateLimit = rateLimiter(10, 60000) // 10 uploads per minute 