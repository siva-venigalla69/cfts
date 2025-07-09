import type { Env } from '../types'

/**
 * Configuration management for the Design Gallery Backend
 * Handles environment variables and app settings
 */
export class Config {
  private env: Env

  constructor(env: Env) {
    this.env = env
  }

  // Environment settings
  get environment(): string {
    return this.env.ENVIRONMENT || 'development'
  }

  get isDevelopment(): boolean {
    return this.environment === 'development'
  }

  get isProduction(): boolean {
    return this.environment === 'production'
  }

  // JWT configuration
  get jwtSecret(): string {
    if (!this.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required')
    }
    return this.env.JWT_SECRET
  }

  get jwtExpiresIn(): number {
    return 24 * 60 * 60 // 24 hours in seconds
  }

  // CORS configuration
  get corsOrigins(): string[] {
    const origins = this.env.CORS_ORIGINS || '*'
    return origins === '*' ? ['*'] : origins.split(',').map(origin => origin.trim())
  }

  // File upload configuration
  get maxFileSize(): number {
    return parseInt(this.env.MAX_FILE_SIZE || '10485760') // 10MB default
  }

  // Pagination configuration
  get defaultPageSize(): number {
    return parseInt(this.env.DEFAULT_PAGE_SIZE || '20')
  }

  get maxPageSize(): number {
    return parseInt(this.env.MAX_PAGE_SIZE || '100')
  }

  // Cloudflare configuration
  get cloudflareAccountId(): string | undefined {
    return this.env.CLOUDFLARE_ACCOUNT_ID
  }

  get cloudflareApiToken(): string | undefined {
    return this.env.CLOUDFLARE_API_TOKEN
  }

  get cloudflareImagesToken(): string | undefined {
    return this.env.CLOUDFLARE_IMAGES_TOKEN
  }

  // Database binding
  get database(): D1Database {
    if (!this.env.DB) {
      throw new Error('D1 Database binding (DB) is not configured')
    }
    return this.env.DB
  }

  // R2 Storage binding
  get r2Storage(): R2Bucket {
    if (!this.env.R2_BUCKET) {
      throw new Error('R2 Bucket binding (R2_BUCKET) is not configured')
    }
    return this.env.R2_BUCKET
  }

  // Cloudflare Images configuration
  get cloudflareImageVariants(): Record<string, string> {
    return {
      thumbnail: 'w=200,h=200,fit=cover',
      medium: 'w=600,h=600,fit=cover',
      original: '' // No transformations for original
    }
  }

  /**
   * Generate Cloudflare Image URL with variant
   */
  getImageUrl(imageId: string, variant: 'thumbnail' | 'medium' | 'original' = 'original'): string {
    if (!this.cloudflareAccountId) {
      throw new Error('Cloudflare Account ID is required for image URLs')
    }
    
    const baseUrl = `https://imagedelivery.net/${this.cloudflareAccountId}/${imageId}`
    const variantConfig = this.cloudflareImageVariants[variant]
    
    if (variant === 'original' || !variantConfig) {
      return baseUrl
    }
    
    return `${baseUrl}/${variant}`
  }

  /**
   * Get all image URLs for a given image ID
   */
  getAllImageUrls(imageId: string): { thumbnail: string; medium: string; original: string } {
    return {
      thumbnail: this.getImageUrl(imageId, 'thumbnail'),
      medium: this.getImageUrl(imageId, 'medium'),
      original: this.getImageUrl(imageId, 'original')
    }
  }

  /**
   * Validate required environment variables
   */
  validate(): void {
    const required = ['JWT_SECRET']
    const missing = required.filter(key => !this.env[key as keyof Env])
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }

    if (!this.env.DB) {
      throw new Error('D1 Database binding is required')
    }
  }

  /**
   * Get configuration summary for debugging
   */
  getSummary(): Record<string, any> {
    return {
      environment: this.environment,
      isDevelopment: this.isDevelopment,
      isProduction: this.isProduction,
      corsOrigins: this.corsOrigins,
      maxFileSize: this.maxFileSize,
      defaultPageSize: this.defaultPageSize,
      maxPageSize: this.maxPageSize,
      hasR2Storage: !!this.env.R2_BUCKET,
      hasCloudflareConfig: !!(this.cloudflareAccountId && this.cloudflareApiToken)
    }
  }
}

/**
 * Create and validate configuration instance
 */
export const createConfig = (env: Env): Config => {
  const config = new Config(env)
  config.validate()
  return config
} 