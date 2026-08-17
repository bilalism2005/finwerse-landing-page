import { create } from 'zustand';
import { getSupabase } from '@finwerse/shared';
import { apiClient } from '../api/client';

export type HoldingPeriod = 'short' | 'medium' | 'long';
export type HoldingStatus = 'held' | 'sold';

export interface PortfolioHolding {
  id: string;
  user_id: string;
  stock_symbol: string;
  quantity: number;
  avg_price: number;
  purchase_date: string;
  intended_holding_period: HoldingPeriod;
  status: HoldingStatus;
  sold_quantity?: number | null;
  sold_date?: string | null;
  sold_price?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface PortfolioHoldingCreate {
  stock_symbol: string;
  quantity: number;
  avg_price: number;
  purchase_date: string;
  intended_holding_period: HoldingPeriod;
}

export interface PortfolioHoldingUpdate {
  quantity?: number;
  avg_price?: number;
  purchase_date?: string;
  intended_holding_period?: HoldingPeriod;
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
  updateHolding: (id: string, data: PortfolioHoldingUpdate) => Promise<void>;
  deleteHolding: (id: string) => Promise<void>;
  sellHolding: (id: string, data: PortfolioHoldingSell) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  holdings: [],
  loading: false,
  error: null,

  fetchHoldings: async (status?: HoldingStatus) => {
    set({ loading: true, error: null });

    // 1. Try Direct Supabase Query (sub-50ms instant response)
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.id) {
        let q = supabase
          .from('portfolio_holdings')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (status) {
          q = q.eq('status', status);
        }

        const { data, error } = await q;
        if (!error && data) {
          set({ holdings: data as PortfolioHolding[], loading: false });
          return;
        }
      }
    } catch (supabaseErr) {
      console.warn('Direct Supabase fetch failed, falling back to API:', supabaseErr);
    }

    // 2. Fallback to API
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

    // 1. Try Direct Supabase Insert
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user?.id) {
        const row = {
          user_id: session.user.id,
          stock_symbol: payload.stock_symbol.toUpperCase(),
          quantity: payload.quantity,
          avg_price: payload.avg_price,
          purchase_date: payload.purchase_date,
          intended_holding_period: payload.intended_holding_period,
          status: 'held',
        };

        const { data, error } = await supabase
          .from('portfolio_holdings')
          .insert(row)
          .select()
          .single();

        if (!error && data) {
          set((state) => ({
            holdings: [data as PortfolioHolding, ...state.holdings],
            loading: false,
          }));
          return;
        }
      }
    } catch (supabaseErr) {
      console.warn('Direct Supabase add failed, falling back to API:', supabaseErr);
    }

    // 2. Fallback to API
    try {
      const { data } = await apiClient.post<PortfolioHolding>('/portfolio/holdings', {
        ...payload,
        stock_symbol: payload.stock_symbol.toUpperCase(),
      });
      set((state) => ({
        holdings: [data, ...state.holdings],
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateHolding: async (id: string, updateData: PortfolioHoldingUpdate) => {
    set({ loading: true, error: null });

    // 1. Try Direct Supabase Update
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('portfolio_holdings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        set((state) => ({
          holdings: state.holdings.map((h) => (h.id === id ? (data as PortfolioHolding) : h)),
          loading: false,
        }));
        return;
      }
    } catch (supabaseErr) {
      console.warn('Direct Supabase update failed, falling back to API:', supabaseErr);
    }

    // 2. Fallback to API
    try {
      const { data } = await apiClient.patch<PortfolioHolding>(`/portfolio/holdings/${id}`, updateData);
      set((state) => ({
        holdings: state.holdings.map((h) => (h.id === id ? data : h)),
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteHolding: async (id: string) => {
    set({ loading: true, error: null });

    // 1. Try Direct Supabase Delete
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('portfolio_holdings').delete().eq('id', id);
      if (!error) {
        set((state) => ({
          holdings: state.holdings.filter((h) => h.id !== id),
          loading: false,
        }));
        return;
      }
    } catch (supabaseErr) {
      console.warn('Direct Supabase delete failed, falling back to API:', supabaseErr);
    }

    // 2. Fallback to API
    try {
      await apiClient.delete(`/portfolio/holdings/${id}`);
      set((state) => ({
        holdings: state.holdings.filter((h) => h.id !== id),
        loading: false,
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
        return {
          holdings: [...data, ...updatedHoldings],
          loading: false,
        };
      });
    } catch (err: any) {
      // Fallback: If API fails, handle directly via Supabase
      try {
        const supabase = getSupabase();
        const target = get().holdings.find((h) => h.id === id);
        if (target) {
          if (payload.sold_quantity >= target.quantity) {
            // Full sell
            const { data, error } = await supabase
              .from('portfolio_holdings')
              .update({
                status: 'sold',
                sold_quantity: payload.sold_quantity,
                sold_price: payload.sold_price,
                sold_date: payload.sold_date,
              })
              .eq('id', id)
              .select()
              .single();

            if (!error && data) {
              set((state) => ({
                holdings: state.holdings.map((h) => (h.id === id ? (data as PortfolioHolding) : h)),
                loading: false,
              }));
              return;
            }
          }
        }
      } catch {}

      set({ error: err.message, loading: false });
      throw err;
    }
  },
}));
