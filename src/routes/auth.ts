import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { Env, JWTPayload } from '../types'
import {
  UserCreateSchema,
  UserLoginSchema,
  AuthenticationError,
  ValidationError
} from '../types'
import { DatabaseService } from '../services/database'
import { SecurityUtils, ResponseUtils, DatabaseUtils } from '../utils'
import { createConfig } from '../config'
import { authMiddleware } from '../middleware/auth'

const auth = new Hono<{ Bindings: Env }>()

/**
 * POST /auth/register
 * Register a new user
 */
auth.post('/register', zValidator('json', UserCreateSchema), async (c) => {
  try {
    const userData = c.req.valid('json')
    const db = new DatabaseService(c.env)

    // Create user
    const user = await db.createUser(userData)

    // Convert to safe response format
    const userResponse = DatabaseUtils.toUserResponse(user)

    return ResponseUtils.json(
      ResponseUtils.success(
        userResponse,
        'Registration successful! Please wait for admin approval.'
      ),
      201
    )
  } catch (error) {
    console.error('Registration error:', error)
    return ResponseUtils.handleError(error)
  }
})

/**
 * POST /auth/login
 * Authenticate user and return JWT token
 */
auth.post('/login', zValidator('json', UserLoginSchema), async (c) => {
  try {
    const credentials = c.req.valid('json')
    const config = createConfig(c.env)
    const db = new DatabaseService(c.env)

    // Authenticate user
    const user = await db.authenticateUser(credentials)
    if (!user) {
      throw new AuthenticationError('Invalid username or password')
    }

    // Check if user is approved (unless they're an admin)
    if (!user.is_admin && !user.is_approved) {
      throw new AuthenticationError('Account pending approval. Please contact an administrator.')
    }

    // Create JWT token
    const tokenPayload = {
      user_id: user.id,
      username: user.username,
      is_admin: Boolean(user.is_admin),
      is_approved: Boolean(user.is_approved)
    }

    const accessToken = await SecurityUtils.createJWT(
      tokenPayload,
      config.jwtSecret,
      config.jwtExpiresIn
    )

    // Prepare response
    const userResponse = DatabaseUtils.toUserResponse(user)
    const tokenResponse = {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: config.jwtExpiresIn,
      user: userResponse
    }

    return ResponseUtils.json(
      ResponseUtils.success(tokenResponse, 'Login successful')
    )
  } catch (error) {
    console.error('Login error:', error)
    return ResponseUtils.handleError(error)
  }
})

/**
 * GET /auth/me
 * Get current user profile (requires authentication)
 */
auth.get('/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload
    const db = new DatabaseService(c.env)

    // Get fresh user data from database
    const userData = await db.getUserById(user.user_id)
    if (!userData) {
      throw new AuthenticationError('User not found')
    }

    const userResponse = DatabaseUtils.toUserResponse(userData)

    return ResponseUtils.json(
      ResponseUtils.success(userResponse, 'User profile retrieved successfully')
    )
  } catch (error) {
    console.error('Profile error:', error)
    return ResponseUtils.handleError(error)
  }
})

/**
 * POST /auth/logout
 * Logout user (client-side token removal)
 */
auth.post('/logout', authMiddleware, async (c) => {
  try {
    // In a JWT-based system, logout is primarily handled client-side
    // by removing the token. We can log the logout for analytics.
    const user = c.get('user') as JWTPayload
    
    console.log(`User ${user.username} (ID: ${user.user_id}) logged out at ${new Date().toISOString()}`)

    return ResponseUtils.json(
      ResponseUtils.success(
        null,
        'Logout successful. Please remove the token from client storage.'
      )
    )
  } catch (error) {
    console.error('Logout error:', error)
    return ResponseUtils.handleError(error)
  }
})

/**
 * GET /auth/check
 * Validate current token (useful for frontend token validation)
 */
auth.get('/check', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload

    return ResponseUtils.json(
      ResponseUtils.success(
        {
          valid: true,
          user: {
            user_id: user.user_id,
            username: user.username,
            is_admin: user.is_admin
          }
        },
        'Token is valid'
      )
    )
  } catch (error) {
    console.error('Token check error:', error)
    return ResponseUtils.handleError(error)
  }
})

/**
 * POST /auth/refresh
 * Refresh JWT token (optional endpoint)
 */
auth.post('/refresh', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload
    const config = createConfig(c.env)
    const db = new DatabaseService(c.env)

    // Get fresh user data to ensure user still exists and is approved
    const userData = await db.getUserById(user.user_id)
    if (!userData) {
      throw new AuthenticationError('User not found')
    }

    if (!userData.is_admin && !userData.is_approved) {
      throw new AuthenticationError('Account no longer approved')
    }

    // Create new JWT token
    const tokenPayload = {
      user_id: userData.id,
      username: userData.username,
      is_admin: Boolean(userData.is_admin),
      is_approved: Boolean(userData.is_approved)
    }

    const accessToken = await SecurityUtils.createJWT(
      tokenPayload,
      config.jwtSecret,
      config.jwtExpiresIn
    )

    const tokenResponse = {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: config.jwtExpiresIn,
      user: DatabaseUtils.toUserResponse(userData)
    }

    return ResponseUtils.json(
      ResponseUtils.success(tokenResponse, 'Token refreshed successfully')
    )
  } catch (error) {
    console.error('Token refresh error:', error)
    return ResponseUtils.handleError(error)
  }
})

export { auth }
export default auth 