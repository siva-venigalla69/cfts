import { create } from 'zustand';
import { getDesigns } from '../api/designs';

export interface Design {
  id: number;
  title: string;
  image_url: string;
  designer_name: string;
  description?: string;
  long_description?: string;
  tags?: string;
  // Add any other fields you expect from the API
}

interface Pagination {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
}

interface DesignState {
  designs: Design[];
  pagination: Pagination | null;
  loading: boolean;
  error: string | null;
  actions: {
    fetchDesigns: (page?: number, limit?: number) => Promise<void>;
    fetchMoreDesigns: () => Promise<void>;
  };
}

const useDesignStore = create<DesignState>((set, get) => ({
  designs: [],
  pagination: null,
  loading: false,
  error: null,
  actions: {
    fetchDesigns: async (page = 1, limit = 10) => {
      try {
        set({ loading: true, error: null });
        const response = await getDesigns(page, limit);
        const { data, meta } = response.data;
        set({
          designs: data,
          pagination: meta.pagination,
          loading: false,
        });
      } catch (error: any) {
        set({ error: 'Failed to fetch designs', loading: false });
      }
    },
    fetchMoreDesigns: async () => {
        const { pagination, designs, loading } = get();
        if (loading || !pagination || pagination.page >= pagination.total_pages) {
            return;
        }
        
        try {
            set({ loading: true });
            const nextPage = pagination.page + 1;
            const response = await getDesigns(nextPage);
            const { data, meta } = response.data;

            set((state) => ({
                designs: [...state.designs, ...data],
                pagination: meta.pagination,
                loading: false,
            }));
        } catch (error) {
            set({ error: 'Failed to fetch more designs', loading: false });
        }
    }
  },
}));

export const useDesigns = () => useDesignStore((state) => state.designs);
export const useDesignPagination = () => useDesignStore((state) => state.pagination);
export const useDesignLoading = () => useDesignStore((state) => state.loading);
export const useDesignActions = () => useDesignStore((state) => state.actions);

export default useDesignStore; 