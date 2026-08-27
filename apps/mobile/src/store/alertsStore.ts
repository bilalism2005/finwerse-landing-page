import { create } from 'zustand';
import apiClient from '../api/client';

export interface Alert {
  id: string;
  alert_type: 'universe_wide' | 'specific_stock' | 'portfolio_only';
  stock_symbol?: string;
  score_type: 'overall' | 'technical' | 'safety' | 'sentiment';
  timeframe: 'short' | 'medium' | 'long';
  threshold_value: number;
  direction: 'above' | 'below';
  status: 'active' | 'triggered';
  triggered_date?: string;
  triggered_symbol?: string;
  created_at: string;
}

interface AlertsState {
  alerts: Alert[];
  isLoading: boolean;
  error: string | null;
  fetchAlerts: () => Promise<void>;
  createAlert: (data: Partial<Alert>) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [],
  isLoading: false,
  error: null,

  fetchAlerts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get('/alerts');
      set({ alerts: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch alerts', isLoading: false });
    }
  },

  createAlert: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/alerts', data);
      set((state) => ({
        alerts: [response.data, ...state.alerts],
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to create alert', isLoading: false });
      throw err;
    }
  },

  deleteAlert: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/alerts/${id}`);
      set((state) => ({
        alerts: state.alerts.filter((a) => a.id !== id),
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete alert', isLoading: false });
    }
  },
}));
