import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  username: string;
  is_admin: boolean;
  is_approved: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  actions: {
    setToken: (token: string) => void;
    setUser: (user: User) => void;
    logout: () => void;
    setLoading: (isLoading: boolean) => void;
  };
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: true,
      actions: {
        setToken: (token) => set({ token }),
        setUser: (user) => set({ user }),
        logout: () => set({ user: null, token: null }),
        setLoading: (isLoading) => set({ isLoading }),
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.actions.setLoading(false);
        }
      },
    }
  )
);

export const useAuthToken = () => useAuthStore((state) => state.token);
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useIsAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthActions = () => useAuthStore((state) => state.actions);

export default useAuthStore; 