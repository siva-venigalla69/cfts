import { Context, Next } from 'hono'
import type { Env } from '../types'

/**
 * Request logger middleware
 * Logs incoming requests with timing and response information
 */
export async function requestLogger(c: Context<{ Bindings: Env }>, next: Next) {
  const start = Date.now()
  const method = c.req.method
  const url = c.req.url
  const userAgent = c.req.header('User-Agent') || 'unknown'
  const ip = c.req.header('cf-connecting-ip') || 'unknown'
  
  // Log request start
  console.log(`[${new Date().toISOString()}] ${method} ${url} - IP: ${ip}`)
  
  await next()
  
  // Log request completion
  const duration = Date.now() - start
  const status = c.res.status
  
  console.log(
    `[${new Date().toISOString()}] ${method} ${url} - ${status} - ${duration}ms - IP: ${ip} - UA: ${userAgent}`
  )
  
  // Log errors separately
  if (status >= 400) {
    console.error(`Error response: ${method} ${url} - Status: ${status}`)
  }
}

/**
 * Enhanced logger for admin actions
 */
export function adminActionLogger(action: string) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Skip user logging for now due to type issues
    const ip = c.req.header('cf-connecting-ip') || 'unknown'
    
    console.log(
      `[ADMIN] ${new Date().toISOString()} - ${action} - IP: ${ip}`
    )
    
    await next()
  }
}

/**
 * Error logger middleware
 */
export function errorLogger(error: Error, c: Context) {
  console.error(`[ERROR] ${new Date().toISOString()}`, {
    error: error.message,
    stack: error.stack,
    method: c.req.method,
    url: c.req.url,
    ip: c.req.header('cf-connecting-ip') || 'unknown'
  })
} 