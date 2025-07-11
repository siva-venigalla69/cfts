import { create } from 'zustand';
import { Cart, CartItem, AddToCartRequest, UpdateCartItemRequest, WhatsAppShareResponse } from '../types';
import { apiService } from '../services/api';

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  
  // Actions
  fetchCart: () => Promise<void>;
  addToCart: (data: AddToCartRequest) => Promise<void>;
  updateCartItem: (itemId: number, data: UpdateCartItemRequest) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  shareOnWhatsApp: (items: number[], message?: string) => Promise<WhatsAppShareResponse>;
  
  // Getters
  getTotalItems: () => number;
  getCartItem: (designId: number) => CartItem | undefined;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,

  fetchCart: async () => {
    try {
      set({ isLoading: true });
      
      const response = await apiService.getCart();
      const cart = response.data.data!;

      set({
        cart,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  addToCart: async (data: AddToCartRequest) => {
    try {
      set({ isLoading: true });
      
      await apiService.addToCart(data);
      
      // Refresh cart after adding
      await get().fetchCart();
      
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateCartItem: async (itemId: number, data: UpdateCartItemRequest) => {
    try {
      set({ isLoading: true });
      
      await apiService.updateCartItem(itemId, data);
      
      // Update local state optimistically
      set((state) => {
        if (!state.cart) return state;
        
        const updatedItems = state.cart.items.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              quantity: data.quantity ?? item.quantity,
              notes: data.notes ?? item.notes,
              updated_at: new Date().toISOString(),
            };
          }
          return item;
        });

        return {
          cart: {
            ...state.cart,
            items: updatedItems,
            total_items: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
            updated_at: new Date().toISOString(),
          },
          isLoading: false,
        };
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  removeFromCart: async (itemId: number) => {
    try {
      set({ isLoading: true });
      
      await apiService.removeFromCart(itemId);
      
      // Update local state optimistically
      set((state) => {
        if (!state.cart) return { isLoading: false };
        
        const updatedItems = state.cart.items.filter(item => item.id !== itemId);

        return {
          cart: {
            ...state.cart,
            items: updatedItems,
            total_items: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
            updated_at: new Date().toISOString(),
          },
          isLoading: false,
        };
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  clearCart: async () => {
    try {
      set({ isLoading: true });
      
      await apiService.clearCart();
      
      set({
        cart: null,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  shareOnWhatsApp: async (items: number[], message?: string) => {
    try {
      const response = await apiService.shareCartOnWhatsApp({ items, message });
      return response.data.data!;
    } catch (error) {
      throw error;
    }
  },

  // Getter methods
  getTotalItems: () => {
    const { cart } = get();
    return cart?.total_items || 0;
  },

  getCartItem: (designId: number) => {
    const { cart } = get();
    return cart?.items.find(item => item.design.id === designId);
  },
}));

// Convenience hooks
export const useCart = () => useCartStore((state) => state.cart);
export const useCartLoading = () => useCartStore((state) => state.isLoading);
export const useCartTotalItems = () => useCartStore((state) => state.getTotalItems());
export const useCartItem = (designId: number) => useCartStore((state) => state.getCartItem(designId)); 