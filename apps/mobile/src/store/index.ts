import { create } from 'zustand';

export type Timeframe = 'short' | 'medium' | 'long';

interface AppState {
  selectedTimeframe: Timeframe;
  setTimeframe: (timeframe: Timeframe) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedTimeframe: 'medium',
  setTimeframe: (timeframe) => set({ selectedTimeframe: timeframe }),
}));
