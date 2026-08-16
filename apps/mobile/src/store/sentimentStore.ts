import { create } from 'zustand';
import apiClient from '../api/client';

export interface Article {
  id: number;
  stock_symbol: string;
  article_date: string;
  polarity: number;
  source_url: string;
}

interface SentimentState {
  articles: Article[];
  isLoading: boolean;
  error: string | null;
  fetchPortfolioSentiment: () => Promise<void>;
  searchSentiment: (query: string) => Promise<void>;
}

export const useSentimentStore = create<SentimentState>((set) => ({
  articles: [],
  isLoading: false,
  error: null,

  fetchPortfolioSentiment: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get('/sentiment-feed/portfolio');
      set({ articles: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch portfolio sentiment', isLoading: false });
    }
  },

  searchSentiment: async (query: string) => {
    if (!query.trim()) return;
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get(`/sentiment-feed/search?q=${encodeURIComponent(query)}`);
      set({ articles: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to search sentiment', isLoading: false });
    }
  },
}));
