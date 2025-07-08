import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import type { 
  ApiResponse, 
  TokenData,
  Env,
  R2FileInfo,
  PaginatedResponse
} from '../types'

import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError
} from '../types'

/**
 * Security utilities for password hashing and JWT management
 */
export class SecurityUtils {
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12
    return bcrypt.hash(password, saltRounds)
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  /**
   * Create a JWT token
   */
  static async createJWT(payload: Omit<TokenData, 'exp'>, secret: string, expiresIn: number): Promise<string> {
    const encoder = new TextEncoder()
    const secretKey = encoder.encode(secret)

    return new SignJWT({
      user_id: payload.user_id,
      username: payload.username,
      is_admin: payload.is_admin
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
      .sign(secretKey)
  }

  /**
   * Verify and decode a JWT token
   */
  static async verifyJWT(token: string, secret: string): Promise<TokenData> {
    try {
      const encoder = new TextEncoder()
      const secretKey = encoder.encode(secret)

      const { payload } = await jwtVerify(token, secretKey)
      
      return payload as TokenData
    } catch (error) {
      throw new AuthenticationError('Invalid or expired token')
    }
  }

  /**
   * Extract bearer token from Authorization header
   */
  static extractBearerToken(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    return authHeader.substring(7)
  }
}

/**
 * Response utilities for consistent API responses
 */
export class ResponseUtils {
  /**
   * Create a success response
   */
  static success<T>(data: T, message: string = 'Success'): ApiResponse<T> {
    return {
      success: true,
      message,
      data
    }
  }

  /**
   * Create an error response
   */
  static error(message: string, error?: string): ApiResponse {
    return {
      success: false,
      message,
      error
    }
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message: string = 'Success'
  ): PaginatedResponse<T> {
    const pages = Math.ceil(total / limit)
    
    return {
      success: true,
      message,
      data,
      pagination: {
        page,
        limit,
        total,
        pages,
        has_next: page < pages,
        has_prev: page > 1
      },
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Create a JSON response with proper headers
   */
  static json(data: any, status: number = 200, headers: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    })
  }

  /**
   * Handle and format errors consistently
   */
  static handleError(error: unknown): Response {
    console.error('API Error:', error)

    if (error instanceof AppError) {
      return ResponseUtils.json(
        ResponseUtils.error(error.message, error.code),
        error.statusCode
      )
    }

    if (error instanceof Error) {
      return ResponseUtils.json(
        ResponseUtils.error('Internal server error', error.message),
        500
      )
    }

    return ResponseUtils.json(
      ResponseUtils.error('Unknown error occurred'),
      500
    )
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  /**
   * Validate pagination parameters
   */
  static validatePagination(page?: number, limit?: number, maxLimit: number = 100): { page: number; limit: number } {
    const validatedPage = Math.max(1, page || 1)
    const validatedLimit = Math.min(maxLimit, Math.max(1, limit || 20))
    
    return { page: validatedPage, limit: validatedLimit }
  }

  /**
   * Validate and sanitize search query
   */
  static sanitizeSearchQuery(query?: string): string | undefined {
    if (!query || typeof query !== 'string') {
      return undefined
    }
    
    // Remove special SQL characters and trim whitespace
    return query.replace(/[%_\\]/g, '\\$&').trim().substring(0, 200)
  }

  /**
   * Validate file type for image uploads
   */
  static validateImageType(contentType: string): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    return allowedTypes.includes(contentType.toLowerCase())
  }

  /**
   * Validate file size
   */
  static validateFileSize(size: number, maxSize: number): boolean {
    return size > 0 && size <= maxSize
  }

  /**
   * Generate a unique filename
   */
  static generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const extension = originalName.split('.').pop()
    return `${timestamp}_${random}.${extension}`
  }
}

/**
 * Database utilities
 */
export class DatabaseUtils {
  /**
   * Build SQL WHERE clause from filters
   */
  static buildWhereClause(filters: Record<string, any>): { clause: string; params: any[] } {
    const conditions: string[] = []
    const params: any[] = []

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'q') {
          // Search query across multiple fields
          conditions.push(`(
            designname LIKE ? OR 
            short_description LIKE ? OR 
            long_description LIKE ? OR 
            style LIKE ? OR 
            colour LIKE ? OR 
            categories LIKE ?
          )`)
          const searchTerm = `%${value}%`
          params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
        } else {
          conditions.push(`${key} = ?`)
          params.push(value)
        }
      }
    })

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    return { clause, params }
  }

  /**
   * Build SQL ORDER BY clause
   */
  static buildOrderByClause(sortBy?: string, sortOrder?: 'asc' | 'desc'): string {
    const allowedSortFields = ['created_at', 'view_count', 'like_count', 'designname']
    const field = allowedSortFields.includes(sortBy || '') ? sortBy : 'created_at'
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC'
    
    return `ORDER BY ${field} ${order}`
  }

  /**
   * Calculate offset for pagination
   */
  static calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit
  }

  /**
   * Convert database row to user response (removing sensitive data)
   */
  static toUserResponse(user: any): any {
    return {
      id: user.id,
      username: user.username,
      is_admin: Boolean(user.is_admin),
      is_approved: Boolean(user.is_approved),
      created_at: user.created_at
    }
  }

  /**
   * Convert database row to design response with image URLs
   */
  static toDesignResponse(design: any, imageUrls: any, isFavorited?: boolean): any {
    return {
      id: design.id,
      designname: design.designname,
      style: design.style,
      colour: design.colour,
      short_description: design.short_description,
      long_description: design.long_description,
      categories: design.categories,
      image_urls: imageUrls,
      featured: Boolean(design.featured),
      status: design.status,
      view_count: design.view_count || 0,
      like_count: design.like_count || 0,
      designer_name: design.designer_name,
      collection_name: design.collection_name,
      season: design.season,
      ...(isFavorited !== undefined && { is_favorited: isFavorited }),
      created_at: design.created_at,
      updated_at: design.updated_at
    }
  }
}

/**
 * String utilities
 */
export class StringUtils {
  /**
   * Generate a random string
   */
  static generateRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Slugify a string for URLs
   */
  static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  /**
   * Truncate text to specified length
   */
  static truncate(text: string, length: number = 100): string {
    if (text.length <= length) return text
    return text.substring(0, length).trim() + '...'
  }

  /**
   * Capitalize first letter of each word
   */
  static titleCase(text: string): string {
    return text.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    )
  }
}

/**
 * Date utilities
 */
export class DateUtils {
  /**
   * Get current ISO string
   */
  static now(): string {
    return new Date().toISOString()
  }

  /**
   * Format date for display
   */
  static formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  /**
   * Check if date is in the past
   */
  static isPast(date: string | Date): boolean {
    return new Date(date) < new Date()
  }

  /**
   * Add days to date
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }
}

/**
 * R2 Storage Utilities
 */

/**
 * Generate a unique object key for R2 storage
 */
export function generateR2ObjectKey(filename: string, category: string = 'general'): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
  const randomId = crypto.randomUUID().slice(0, 8);
  
  // Extract file extension
  const fileExtension = filename.split('.').pop() || 'jpg';
  
  // Create organized path: category/year/month/unique_file
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  return `${category}/${year}/${month}/${timestamp}_${randomId}.${fileExtension}`;
}

/**
 * Get public URL for R2 object
 */
export function getR2PublicUrl(objectKey: string, env: Env): string {
  const baseUrl = env.R2_PUBLIC_URL?.replace(/\/$/, '') || `https://pub-${env.CLOUDFLARE_ACCOUNT_ID}.r2.dev`;
  return `${baseUrl}/${objectKey}`;
}

/**
 * Upload file to R2 storage
 */
export async function uploadToR2(
  r2Bucket: R2Bucket,
  objectKey: string,
  file: ArrayBuffer,
  metadata: Record<string, string> = {}
): Promise<boolean> {
  try {
    await r2Bucket.put(objectKey, file, {
      customMetadata: metadata
    });
    return true;
  } catch (error) {
    console.error('R2 upload failed:', error);
    return false;
  }
}

/**
 * Delete file from R2 storage
 */
export async function deleteFromR2(r2Bucket: R2Bucket, objectKey: string): Promise<boolean> {
  try {
    await r2Bucket.delete(objectKey);
    return true;
  } catch (error) {
    console.error('R2 delete failed:', error);
    return false;
  }
}

/**
 * Check if file exists in R2 storage
 */
export async function r2FileExists(r2Bucket: R2Bucket, objectKey: string): Promise<boolean> {
  try {
    const object = await r2Bucket.head(objectKey);
    return object !== null;
  } catch (error) {
    console.error('R2 file check failed:', error);
    return false;
  }
}

/**
 * Get file info from R2 storage
 */
export async function getR2FileInfo(r2Bucket: R2Bucket, objectKey: string): Promise<R2FileInfo | null> {
  try {
    const object = await r2Bucket.head(objectKey);
    if (!object) return null;
    
    return {
      key: objectKey,
      size: object.size,
      lastModified: object.uploaded,
      public_url: '' // Will be set by caller with proper base URL
    };
  } catch (error) {
    console.error('R2 file info failed:', error);
    return null;
  }
}

/**
 * List files in R2 storage with optional prefix
 */
export async function listR2Files(
  r2Bucket: R2Bucket,
  prefix: string = '',
  limit: number = 100
): Promise<R2FileInfo[]> {
  try {
    const listing = await r2Bucket.list({
      prefix,
      limit
    });
    
    return listing.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      lastModified: obj.uploaded,
      public_url: '' // Will be set by caller with proper base URL
    }));
  } catch (error) {
    console.error('R2 list files failed:', error);
    return [];
  }
}

/**
 * Validate file type for upload
 */
export function isValidImageType(contentType: string): boolean {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ];
  return allowedTypes.includes(contentType.toLowerCase());
}

/**
 * Validate file size
 */
export function isValidFileSize(size: number, maxSizeBytes: number = 10 * 1024 * 1024): boolean {
  return size <= maxSizeBytes;
}

/**
 * Extract filename from Content-Disposition header or generate one
 */
export function extractFilename(headers: Headers, fallback: string = 'image.jpg'): string {
  const contentDisposition = headers.get('content-disposition');
  if (contentDisposition) {
    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
    if (matches && matches[1]) {
      return matches[1].replace(/['"]/g, '');
    }
  }
  return fallback;
}

// Export custom error classes for convenience
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError
} from '../types' 