import { create } from 'zustand';
import apiClient from '../api/client';

export interface ImpulseTrade {
  id: string;
  stock_symbol: string;
  quantity: number;
  actual: {
    buy_date: string;
    buy_price: number;
    sell_date: string;
    sell_price: number;
    profit: number;
  };
  counterfactual: {
    buy_date: string;
    buy_price: number;
    sell_date: string;
    sell_price: number;
    profit: number;
  };
  rupee_cost: number;
}

export interface CustomTradeInput {
  stock_symbol: string;
  buy_price: number;
  buy_date: string;
  sell_price: number;
  sell_date: string;
  quantity: number;
  intended_holding_period?: string;
}

interface AnalyzerState {
  impulseTrades: ImpulseTrade[];
  totalCost: number;
  isLoading: boolean;
  error: string | null;
  fetchAnalyzerData: () => Promise<void>;
  analyzeCustomTrades: (trades: CustomTradeInput[]) => Promise<void>;
}

export const useAnalyzerStore = create<AnalyzerState>((set) => ({
  impulseTrades: [],
  totalCost: 0,
  isLoading: false,
  error: null,

  fetchAnalyzerData: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get('/analyzer/impulse');
      set({ 
        impulseTrades: response.data.trades, 
        totalCost: response.data.total_cost,
        isLoading: false 
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch analyzer data', isLoading: false });
    }
  },

  analyzeCustomTrades: async (trades: CustomTradeInput[]) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/analyzer/custom-impulse', { trades });
      set({
        impulseTrades: response.data.trades,
        totalCost: response.data.total_cost,
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to analyze custom trades', isLoading: false });
    }
  }
}));
