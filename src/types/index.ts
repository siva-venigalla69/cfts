import { z } from 'zod'

// Declare module augmentation for Hono context variables
declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload
  }
}

// Environment bindings for Cloudflare Workers
export interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  // KV?: KVNamespace; // Removed - not required for basic functionality
  JWT_SECRET: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  R2_PUBLIC_URL: string;
  ENVIRONMENT: string;
  CORS_ORIGINS?: string;
  MAX_FILE_SIZE?: string;
  DEFAULT_PAGE_SIZE?: string;
  MAX_PAGE_SIZE?: string;
  // Optional environment variables referenced in config
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_IMAGES_TOKEN?: string;
}

// User types
export interface User {
  id: number;
  username: string;
  password_hash: string;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  username: string;
  password: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

// Validation schemas
export const UserCreateSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100)
})

export const UserLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

export interface UserResponse {
  id: number;
  username: string;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

// Design types
export interface Design {
  id: number;
  title: string;
  description?: string;
  short_description?: string;
  long_description?: string;
  r2_object_key: string;
  design_number?: string; // Customer-facing design number for orders
  category: string;
  style?: string;
  colour?: string;
  fabric?: string;
  occasion?: string;
  size_available?: string;
  price_range?: string;
  tags?: string;
  featured: boolean;
  status: 'active' | 'inactive' | 'draft';
  view_count: number;
  like_count: number;
  designer_name?: string;
  collection_name?: string;
  season?: string;
  created_at: string;
  updated_at: string;
}

export interface DesignCreate {
  title: string;
  description?: string;
  short_description?: string;
  long_description?: string;
  r2_object_key: string;
  design_number?: string; // Optional - will be auto-generated if not provided
  category: string;
  style?: string;
  colour?: string;
  fabric?: string;
  occasion?: string;
  size_available?: string;
  price_range?: string;
  tags?: string;
  featured?: boolean;
  designer_name?: string;
  collection_name?: string;
  season?: string;
}

export interface DesignUpdate {
  title?: string;
  description?: string;
  short_description?: string;
  long_description?: string;
  category?: string;
  style?: string;
  colour?: string;
  fabric?: string;
  occasion?: string;
  size_available?: string;
  price_range?: string;
  tags?: string;
  featured?: boolean;
  status?: 'active' | 'inactive' | 'draft';
  designer_name?: string;
  collection_name?: string;
  season?: string;
}

export interface DesignResponse {
  id: number;
  title: string;
  description?: string;
  short_description?: string;
  long_description?: string;
  image_url: string;
  r2_object_key: string;
  design_number?: string; // Customer-facing design number for orders
  category: string;
  style?: string;
  colour?: string;
  fabric?: string;
  occasion?: string;
  size_available?: string;
  price_range?: string;
  tags?: string;
  featured: boolean;
  status: string;
  view_count: number;
  like_count: number;
  designer_name?: string;
  collection_name?: string;
  season?: string;
  created_at: string;
  updated_at: string;
}

export interface DesignListResponse {
  designs: DesignResponse[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface DesignSearchFilters {
  q?: string;
  design_number?: string; // Search by design number
  category?: string;
  style?: string;
  colour?: string;
  fabric?: string;
  occasion?: string;
  featured?: boolean;
  designer_name?: string;
  collection_name?: string;
  season?: string;
  status?: string;
  // Pagination and sorting properties
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// User favorites types
export interface UserFavorite {
  id: number;
  user_id: number;
  design_id: number;
  created_at: string;
}

// Shopping cart types
export interface UserCart {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: number;
  cart_id: number;
  design_id: number;
  quantity: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CartItemWithDesign extends CartItem {
  design: DesignResponse;
}

export interface CartResponse {
  id: number;
  user_id: number;
  items: CartItemWithDesign[];
  total_items: number;
  created_at: string;
  updated_at: string;
}

export interface AddToCartRequest {
  design_id: number;
  quantity?: number;
  notes?: string;
}

export interface UpdateCartItemRequest {
  quantity?: number;
  notes?: string;
}

// WhatsApp sharing types
export interface WhatsAppShareRequest {
  design_ids: number[];
  message?: string;
}

export interface WhatsAppShareResponse {
  share_url: string;
  message: string;
  design_count: number;
}

// App settings types
export interface AppSetting {
  id: number;
  key: string;
  value: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Upload types
export interface ImageUploadResponse {
  object_key: string;
  public_url: string;
  message: string;
  success: boolean;
}

export interface PresignedUrlResponse {
  object_key: string;
  upload_url: string;
  public_url: string;
}

// Authentication types
export interface TokenData {
  user_id: number;
  username: string;
  is_admin: boolean;
  is_approved: boolean;
  exp: number;
}

export interface JWTPayload {
  user_id: number;
  username: string;
  is_admin: boolean;
  is_approved: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
  message: string;
  success: boolean;
}

// Pagination types
export interface PaginationParams {
  page: number;
  per_page: number;
}

// Common API response types
export interface ApiResponse<T = any> {
  data?: T;
  message: string;
  success: boolean;
  error?: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  success: false;
}

// R2 Storage types
export interface R2FileInfo {
  key: string;
  size: number;
  lastModified: Date;
  public_url: string;
}

export interface R2UploadMetadata {
  original_filename?: string;
  uploaded_by?: string;
  category?: string;
  content_type?: string;
}

// Custom error classes
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

// Paginated response interface
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
} 