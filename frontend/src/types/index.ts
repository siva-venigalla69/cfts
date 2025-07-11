// User types
export interface User {
  id: number;
  username: string;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// Design types
export interface Design {
  id: number;
  title: string;
  description?: string;
  short_description?: string;
  long_description?: string;
  image_url: string;
  r2_object_key: string;
  design_number: string;
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

export interface DesignImage {
  id: number;
  design_id: number;
  image_url: string;
  r2_object_key: string;
  image_order: number;
  is_primary: boolean;
  alt_text?: string;
  caption?: string;
  image_type?: string;
  file_size?: number;
  width?: number;
  height?: number;
  content_type?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DesignFilters {
  q?: string;
  design_number?: string;
  category?: string;
  style?: string;
  colour?: string;
  fabric?: string;
  occasion?: string;
  featured?: boolean;
  designer_name?: string;
  collection_name?: string;
  season?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Cart types
export interface CartItem {
  id: number;
  cart_id: number;
  design_id: number;
  quantity: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  design: Design;
}

export interface Cart {
  id: number;
  user_id: number;
  items: CartItem[];
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

// Favorites types
export interface FavoriteToggleRequest {
  design_id: number;
}

export interface FavoriteStatus {
  design_id: number;
  is_favorite: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

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

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Favorites: undefined;
  Cart: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  DesignList: undefined;
  DesignDetail: { designId: number };
  CategoryView: { category: string };
};

export type SearchStackParamList = {
  SearchScreen: undefined;
  SearchResults: { filters: DesignFilters };
};

// WhatsApp sharing
export interface WhatsAppShareRequest {
  items: number[]; // cart item IDs
  message?: string;
}

export interface WhatsAppShareResponse {
  whatsapp_url: string;
  formatted_message: string;
  total_items: number;
}

// Admin types (for future admin panel)
export interface AdminStats {
  total_users: number;
  approved_users: number;
  pending_users: number;
  admin_users: number;
  total_designs: number;
  active_designs: number;
  inactive_designs: number;
  draft_designs: number;
  featured_designs: number;
  total_views: number;
  total_likes: number;
  total_favorites: number;
} 