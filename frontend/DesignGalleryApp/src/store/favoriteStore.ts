import { create } from 'zustand';
import { getFavoriteDesigns, addFavorite, removeFavorite } from '../api/favorites';
import { Design } from './designStore';

interface FavoriteState {
  favorites: Design[];
  favoriteIds: Set<number>;
  loading: boolean;
  error: string | null;
  actions: {
    fetchFavorites: () => Promise<void>;
    toggleFavorite: (design: Design) => Promise<void>;
  };
}

const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: [],
  favoriteIds: new Set(),
  loading: false,
  error: null,
  actions: {
    fetchFavorites: async () => {
      try {
        set({ loading: true, error: null });
        const response = await getFavoriteDesigns();
        const favorites = response.data.data;
        set({
          favorites,
          favoriteIds: new Set(favorites.map((d: Design) => d.id)),
          loading: false,
        });
      } catch (error: any) {
        set({ error: 'Failed to fetch favorites', loading: false });
      }
    },
    toggleFavorite: async (design: Design) => {
      const { favoriteIds, favorites } = get();
      const isFavorited = favoriteIds.has(design.id);

      try {
        if (isFavorited) {
          await removeFavorite(design.id);
          set({
            favorites: favorites.filter(f => f.id !== design.id),
            favoriteIds: new Set([...favoriteIds].filter(id => id !== design.id)),
          });
        } else {
          await addFavorite(design.id);
          set({
            favorites: [...favorites, design],
            favoriteIds: new Set([...favoriteIds, design.id]),
          });
        }
      } catch (error) {
        console.error('Failed to toggle favorite', error);
        // Optionally, revert state on error
      }
    },
  },
}));

export const useFavorites = () => useFavoriteStore((state) => state.favorites);
export const useFavoriteIds = () => useFavoriteStore((state) => state.favoriteIds);
export const useFavoriteActions = () => useFavoriteStore((state) => state.actions);

export default useFavoriteStore; 