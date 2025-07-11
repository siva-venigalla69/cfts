import { create } from 'zustand';
import { Design, DesignFilters, PaginatedResponse } from '../types';
import { apiService } from '../services/api';

interface DesignState {
  // Design data
  designs: Design[];
  featuredDesigns: Design[];
  favorites: Design[];
  currentDesign: Design | null;
  
  // Pagination and loading
  isLoading: boolean;
  isLoadingMore: boolean;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  
  // Search and filters
  searchQuery: string;
  currentFilters: DesignFilters;
  searchResults: Design[];
  
  // Actions
  fetchDesigns: (page?: number, filters?: DesignFilters) => Promise<void>;
  fetchFeaturedDesigns: () => Promise<void>;
  fetchDesign: (id: number) => Promise<void>;
  searchDesigns: (query: string, page?: number) => Promise<void>;
  fetchDesignsByCategory: (category: string, page?: number) => Promise<void>;
  loadMoreDesigns: () => Promise<void>;
  clearDesigns: () => void;
  setFilters: (filters: DesignFilters) => void;
  clearFilters: () => void;
  
  // Favorites
  fetchFavorites: (page?: number) => Promise<void>;
  toggleFavorite: (designId: number) => Promise<void>;
  checkFavoriteStatus: (designId: number) => Promise<boolean>;
}

export const useDesignStore = create<DesignState>((set, get) => ({
  // Initial state
  designs: [],
  featuredDesigns: [],
  favorites: [],
  currentDesign: null,
  isLoading: false,
  isLoadingMore: false,
  currentPage: 1,
  totalPages: 1,
  hasMore: false,
  searchQuery: '',
  currentFilters: {},
  searchResults: [],

  fetchDesigns: async (page = 1, filters = {}) => {
    try {
      const isFirstPage = page === 1;
      set({ 
        isLoading: isFirstPage, 
        isLoadingMore: !isFirstPage,
        currentFilters: filters 
      });

      const response = await apiService.getDesigns({
        page,
        per_page: 20,
        filters
      });

      // Fix: extract designs and pagination from response.data.data
      const { designs, ...pagination } = response.data.data as any;

      set((state) => ({
        designs: isFirstPage ? designs : [...state.designs, ...designs],
        currentPage: pagination.page,
        totalPages: pagination.total_pages,
        hasMore: pagination.page < pagination.total_pages,
        isLoading: false,
        isLoadingMore: false,
      }));
    } catch (error) {
      set({ isLoading: false, isLoadingMore: false });
      throw error;
    }
  },

  fetchFeaturedDesigns: async () => {
    try {
      set({ isLoading: true });
      
      const response = await apiService.getFeaturedDesigns();
      const designs = response.data.data!;

      set({
        featuredDesigns: designs,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchDesign: async (id: number) => {
    try {
      set({ isLoading: true });
      
      const response = await apiService.getDesign(id);
      const design = response.data.data!;

      set({
        currentDesign: design,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  searchDesigns: async (query: string, page = 1) => {
    try {
      const isFirstPage = page === 1;
      set({ 
        isLoading: isFirstPage, 
        isLoadingMore: !isFirstPage,
        searchQuery: query 
      });

      const response = await apiService.searchDesigns(query, page);
      const { designs, ...pagination } = response.data.data as any;

      set((state) => ({
        searchResults: isFirstPage ? designs : [...state.searchResults, ...designs],
        currentPage: pagination.page,
        totalPages: pagination.total_pages,
        hasMore: pagination.page < pagination.total_pages,
        isLoading: false,
        isLoadingMore: false,
      }));
    } catch (error) {
      set({ isLoading: false, isLoadingMore: false });
      throw error;
    }
  },

  fetchDesignsByCategory: async (category: string, page = 1) => {
    try {
      const isFirstPage = page === 1;
      set({ 
        isLoading: isFirstPage, 
        isLoadingMore: !isFirstPage,
        currentFilters: { category }
      });

      const response = await apiService.getDesignsByCategory(category, page);
      const { designs, ...pagination } = response.data.data as any;

      set((state) => ({
        designs: isFirstPage ? designs : [...state.designs, ...designs],
        currentPage: pagination.page,
        totalPages: pagination.total_pages,
        hasMore: pagination.page < pagination.total_pages,
        isLoading: false,
        isLoadingMore: false,
      }));
    } catch (error) {
      set({ isLoading: false, isLoadingMore: false });
      throw error;
    }
  },

  loadMoreDesigns: async () => {
    const { currentPage, hasMore, isLoadingMore, currentFilters, searchQuery } = get();
    
    if (!hasMore || isLoadingMore) return;

    const nextPage = currentPage + 1;
    
    if (searchQuery) {
      await get().searchDesigns(searchQuery, nextPage);
    } else {
      await get().fetchDesigns(nextPage, currentFilters);
    }
  },

  clearDesigns: () => {
    set({
      designs: [],
      searchResults: [],
      currentPage: 1,
      totalPages: 1,
      hasMore: false,
      searchQuery: '',
    });
  },

  setFilters: (filters: DesignFilters) => {
    set({ currentFilters: filters });
  },

  clearFilters: () => {
    set({ currentFilters: {} });
  },

  // Favorites methods
  fetchFavorites: async (page = 1) => {
    try {
      const isFirstPage = page === 1;
      set({ 
        isLoading: isFirstPage, 
        isLoadingMore: !isFirstPage 
      });

      const response = await apiService.getFavorites(page);
      const { data: favorites, pagination } = response.data;

      set((state) => ({
        favorites: isFirstPage ? favorites! : [...state.favorites, ...favorites!],
        currentPage: pagination!.page,
        totalPages: pagination!.pages,
        hasMore: pagination!.has_next,
        isLoading: false,
        isLoadingMore: false,
      }));
    } catch (error) {
      set({ isLoading: false, isLoadingMore: false });
      throw error;
    }
  },

  toggleFavorite: async (designId: number) => {
    try {
      await apiService.toggleFavorite({ design_id: designId });
      
      // Update local state
      set((state) => {
        // Remove from favorites if it exists there
        const updatedFavorites = state.favorites.filter(design => design.id !== designId);
        
        // Update in designs list
        const updatedDesigns = state.designs.map(design => {
          if (design.id === designId) {
            return { ...design, like_count: design.like_count + (updatedFavorites.length < state.favorites.length ? -1 : 1) };
          }
          return design;
        });

        // Update in search results
        const updatedSearchResults = state.searchResults.map(design => {
          if (design.id === designId) {
            return { ...design, like_count: design.like_count + (updatedFavorites.length < state.favorites.length ? -1 : 1) };
          }
          return design;
        });

        return {
          favorites: updatedFavorites,
          designs: updatedDesigns,
          searchResults: updatedSearchResults,
        };
      });
    } catch (error) {
      throw error;
    }
  },

  checkFavoriteStatus: async (designId: number) => {
    try {
      const response = await apiService.checkFavoriteStatus(designId);
      return response.data.data!.is_favorite;
    } catch (error) {
      return false;
    }
  },
}));

// Convenience hooks
export const useDesigns = () => useDesignStore((state) => state.designs);
export const useFeaturedDesigns = () => useDesignStore((state) => state.featuredDesigns);
export const useFavorites = () => useDesignStore((state) => state.favorites);
export const useCurrentDesign = () => useDesignStore((state) => state.currentDesign);
export const useDesignLoading = () => useDesignStore((state) => state.isLoading); 