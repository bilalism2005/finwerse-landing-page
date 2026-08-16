import { create } from 'zustand';
import { apiClient } from '../api/client';

export type HoldingPeriod = 'short' | 'medium' | 'long';
export type HoldingStatus = 'held' | 'sold';

export interface PortfolioHolding {
  id: string;
  user_id: string;
  stock_symbol: string;
  quantity: int;
  avg_price: number;
  purchase_date: string;
  intended_holding_period: HoldingPeriod;
  status: HoldingStatus;
  sold_quantity?: number;
  sold_date?: string;
  sold_price?: number;
}

export interface PortfolioHoldingCreate {
  stock_symbol: string;
  quantity: number;
  avg_price: number;
  purchase_date: string;
  intended_holding_period: HoldingPeriod;
}

export interface PortfolioHoldingSell {
  sold_quantity: number;
  sold_price: number;
  sold_date: string;
}

interface PortfolioState {
  holdings: PortfolioHolding[];
  loading: boolean;
  error: string | null;
  fetchHoldings: (status?: HoldingStatus) => Promise<void>;
  addHolding: (data: PortfolioHoldingCreate) => Promise<void>;
  deleteHolding: (id: string) => Promise<void>;
  sellHolding: (id: string, data: PortfolioHoldingSell) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  holdings: [],
  loading: false,
  error: null,

  fetchHoldings: async (status?: HoldingStatus) => {
    set({ loading: true, error: null });
    try {
      const url = status ? `/portfolio/holdings?status_filter=${status}` : '/portfolio/holdings';
      const { data } = await apiClient.get<PortfolioHolding[]>(url);
      set({ holdings: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addHolding: async (payload: PortfolioHoldingCreate) => {
    set({ loading: true, error: null });
    try {
      const { data } = await apiClient.post<PortfolioHolding>('/portfolio/holdings', payload);
      set((state) => ({
        holdings: [data, ...state.holdings],
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteHolding: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/portfolio/holdings/${id}`);
      set((state) => ({
        holdings: state.holdings.filter((h) => h.id !== id),
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  sellHolding: async (id: string, payload: PortfolioHoldingSell) => {
    set({ loading: true, error: null });
    try {
      const { data } = await apiClient.post<PortfolioHolding[]>(`/portfolio/holdings/${id}/sell`, payload);
      set((state) => {
        // Remove the original row (it might have been deleted if partial sell, or updated if full sell)
        const updatedHoldings = state.holdings.filter((h) => h.id !== id);
        // Add the new returned rows
        return {
          holdings: [...data, ...updatedHoldings],
          loading: false
        };
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  }
}));
