import { create } from 'zustand';
import { apiClient } from '../api/client';
import { HoldingPeriod } from './portfolioStore';

export interface StockHealthInfo {
  stock_symbol: string;
  quantity: number;
  avg_price: number;
  invested_value: number;
  weight: number;
  overall_score: number | null;
  technical_score: number | null;
  safety_score: number | null;
  sentiment_score: string | null;
  sector: string | null;
}

export interface SectorInfo {
  sector: string;
  invested_value: number;
  weight: number;
}

export interface PortfolioHealthData {
  overall_score: number;
  technical_score: number;
  safety_score: number;
  sentiment_score: number | null;
  green_score: number;
  red_score: number;
  diversification_score: number;
  sector_summary_sentence: string;
  sectors: SectorInfo[];
  holdings: StockHealthInfo[];
}

interface HealthState {
  healthData: PortfolioHealthData | null;
  loading: boolean;
  error: string | null;
  bottleneckReport: string | null;
  bottleneckLoading: boolean;
  bottleneckError: string | null;
  
  fetchHealth: (timeframe: HoldingPeriod) => Promise<void>;
  generateBottleneckReport: (timeframe: HoldingPeriod) => Promise<void>;
  clearBottleneckReport: () => void;
}

export const useHealthStore = create<HealthState>((set) => ({
  healthData: null,
  loading: false,
  error: null,
  bottleneckReport: null,
  bottleneckLoading: false,
  bottleneckError: null,

  fetchHealth: async (timeframe: HoldingPeriod) => {
    set({ loading: true, error: null });
    try {
      const { data } = await apiClient.get<PortfolioHealthData>(`/portfolio/health?timeframe=${timeframe}`);
      set({ healthData: data, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to load health data", loading: false });
    }
  },

  generateBottleneckReport: async (timeframe: HoldingPeriod) => {
    set({ bottleneckLoading: true, bottleneckError: null });
    try {
      const { data } = await apiClient.post<{ report: string }>('/portfolio/bottleneck-report', { timeframe });
      set({ bottleneckReport: data.report, bottleneckLoading: false });
    } catch (err: any) {
      set({ bottleneckError: err.message || "Failed to generate report", bottleneckLoading: false });
    }
  },
  
  clearBottleneckReport: () => set({ bottleneckReport: null, bottleneckError: null })
}));
