import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  ApiResponse, 
  PaginatedResponse, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  User, 
  Design, 
  DesignFilters, 
  Cart, 
  AddToCartRequest, 
  UpdateCartItemRequest,
  FavoriteToggleRequest,
  FavoriteStatus,
  WhatsAppShareRequest,
  WhatsAppShareResponse,
  AdminStats
} from '../types';

// Configure base URL - Replace with your actual Cloudflare Worker URL
const BASE_URL = 'https://design-gallery-backend.shiva-venigalla.workers.dev/api'; // TODO: Replace with your deployed Cloudflare Worker URL

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - clear stored token
          this.clearStoredToken();
        }
        return Promise.reject(error);
      }
    );
  }

  // Token management (these will be implemented with AsyncStorage)
  private getStoredToken(): string | null {
    // This will be implemented with AsyncStorage in the store
    return null;
  }

  private clearStoredToken(): void {
    // This will be implemented with AsyncStorage in the store
  }

  // Set token for authenticated requests
  setAuthToken(token: string): void {
    this.api.defaults.headers.Authorization = `Bearer ${token}`;
  }

  // Clear auth token
  clearAuthToken(): void {
    delete this.api.defaults.headers.Authorization;
  }

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================

  async login(credentials: LoginRequest): Promise<AxiosResponse<ApiResponse<AuthResponse>>> {
    return this.api.post('/auth/login', credentials);
  }

  async register(userData: RegisterRequest): Promise<AxiosResponse<ApiResponse<User>>> {
    return this.api.post('/auth/register', userData);
  }

  async getProfile(): Promise<AxiosResponse<ApiResponse<User>>> {
    return this.api.get('/auth/me');
  }

  async refreshToken(): Promise<AxiosResponse<ApiResponse<AuthResponse>>> {
    return this.api.post('/auth/refresh');
  }

  // ============================================================================
  // DESIGN ENDPOINTS
  // ============================================================================

  async getDesigns(params: {
    page?: number;
    per_page?: number;
    filters?: DesignFilters;
  } = {}): Promise<AxiosResponse<PaginatedResponse<Design>>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());
    
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }

    return this.api.get(`/designs?${queryParams.toString()}`);
  }

  async getDesign(id: number): Promise<AxiosResponse<ApiResponse<Design>>> {
    return this.api.get(`/designs/${id}`);
  }

  async getFeaturedDesigns(): Promise<AxiosResponse<PaginatedResponse<Design>>> {
    return this.api.get('/designs?featured=true&per_page=10');
  }

  async searchDesigns(query: string, page: number = 1): Promise<AxiosResponse<PaginatedResponse<Design>>> {
    return this.api.get(`/designs?q=${encodeURIComponent(query)}&page=${page}`);
  }

  async getDesignsByCategory(category: string, page: number = 1): Promise<AxiosResponse<PaginatedResponse<Design>>> {
    return this.api.get(`/designs?category=${encodeURIComponent(category)}&page=${page}`);
  }

  // ============================================================================
  // FAVORITES ENDPOINTS
  // ============================================================================

  async getFavorites(page: number = 1): Promise<AxiosResponse<PaginatedResponse<Design>>> {
    return this.api.get(`/designs/favorites?page=${page}`);
  }

  async toggleFavorite(data: FavoriteToggleRequest): Promise<AxiosResponse<ApiResponse<FavoriteStatus>>> {
    return this.api.post('/designs/favorites/toggle', data);
  }

  async checkFavoriteStatus(designId: number): Promise<AxiosResponse<ApiResponse<FavoriteStatus>>> {
    return this.api.get(`/designs/favorites/status/${designId}`);
  }

  // ============================================================================
  // CART ENDPOINTS
  // ============================================================================

  async getCart(): Promise<AxiosResponse<ApiResponse<Cart>>> {
    return this.api.get('/cart');
  }

  async addToCart(data: AddToCartRequest): Promise<AxiosResponse<ApiResponse<null>>> {
    return this.api.post('/cart/items', data);
  }

  async updateCartItem(itemId: number, data: UpdateCartItemRequest): Promise<AxiosResponse<ApiResponse<null>>> {
    return this.api.put(`/cart/items/${itemId}`, data);
  }

  async removeFromCart(itemId: number): Promise<AxiosResponse<ApiResponse<null>>> {
    return this.api.delete(`/cart/items/${itemId}`);
  }

  async clearCart(): Promise<AxiosResponse<ApiResponse<null>>> {
    return this.api.delete('/cart');
  }

  async shareCartOnWhatsApp(data: WhatsAppShareRequest): Promise<AxiosResponse<ApiResponse<WhatsAppShareResponse>>> {
    return this.api.post('/cart/share/whatsapp', data);
  }

  // ============================================================================
  // ADMIN ENDPOINTS (for future admin panel)
  // ============================================================================

  async getAdminStats(): Promise<AxiosResponse<ApiResponse<AdminStats>>> {
    return this.api.get('/admin/stats');
  }

  async getAllUsers(page: number = 1, status?: 'approved' | 'pending' | 'all'): Promise<AxiosResponse<PaginatedResponse<User>>> {
    const params = new URLSearchParams({ page: page.toString() });
    if (status) params.append('status', status);
    return this.api.get(`/admin/users?${params.toString()}`);
  }

  async approveUser(userId: number): Promise<AxiosResponse<ApiResponse<null>>> {
    return this.api.put(`/admin/users/${userId}/approve`);
  }

  async deleteUser(userId: number): Promise<AxiosResponse<ApiResponse<null>>> {
    return this.api.delete(`/admin/users/${userId}`);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async testConnection(): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.api.get('/test');
  }

  async getHealthCheck(): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.api.get('/health');
  }

  async getApiInfo(): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.api.get('/info');
  }

  // Generic GET method for custom endpoints
  public get<T = any>(url: string) {
    return this.api.get<T>(url);
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService; 