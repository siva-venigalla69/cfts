import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginRequest, RegisterRequest } from '../types';
import { apiService } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,

      login: async (credentials: LoginRequest) => {
        try {
          set({ isLoading: true });
          
          const response = await apiService.login(credentials);
          const { access_token, user } = response.data.data!;
          
          // Set auth token in API service
          apiService.setAuthToken(access_token);
          
          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData: RegisterRequest) => {
        try {
          set({ isLoading: true });
          
          const response = await apiService.register(userData);
          // After registration, user needs approval before they can login
          
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        // Clear auth token from API service
        apiService.clearAuthToken();
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      refreshProfile: async () => {
        try {
          const { token } = get();
          if (!token) return;
          
          apiService.setAuthToken(token);
          const response = await apiService.getProfile();
          
          set({
            user: response.data.data!,
            isAuthenticated: true,
          });
        } catch (error) {
          // If profile refresh fails, logout user
          get().logout();
          throw error;
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('Auth store rehydration started');
        // After rehydration, set auth token and refresh profile if needed
        if (state?.token && state?.isAuthenticated) {
          console.log('Found stored token, attempting profile refresh');
          apiService.setAuthToken(state.token);
          // Optionally refresh profile on app start with timeout
          Promise.race([
            state.refreshProfile(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Profile refresh timeout')), 5000)
            )
          ]).catch((error) => {
            console.log('Profile refresh failed:', error);
            // If refresh fails or times out, logout
            state.logout();
          });
        } else {
          console.log('No stored token found');
        }
        // Always set loading to false after rehydration
        console.log('Setting loading to false');
        state?.setLoading(false);
      },
    }
  )
);

// Convenience hooks for specific auth state pieces
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading); 