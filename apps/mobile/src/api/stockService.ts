import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '@finwerse/shared';
import { apiClient } from './client';
import { Timeframe } from '../store';

const CACHE_KEY_TOP_STOCKS = '@finwerse/top_stocks_cache_';

export interface StockItem {
  symbol: string;
  score: number;
  sector?: string | null;
}

export interface StockScoreDetail {
  symbol: string;
  timeframe: string;
  overall: number;
  technical: number | null;
  safety: number | null;
  sentiment: string | number | null;
  last_updated?: string;
}

/**
 * Fetch top stocks with direct Supabase query (sub-50ms) + local caching + API fallback
 */
export async function getTopStocks(
  scoreType: string = 'overall',
  timeframe: Timeframe = 'short',
  limit: number = 10
): Promise<{ stocks: StockItem[]; fromCache?: boolean }> {
  const cacheKey = `${CACHE_KEY_TOP_STOCKS}${scoreType}_${timeframe}`;

  // 1. Try Direct Supabase Query (instant sub-50ms, zero cold starts)
  try {
    const supabase = getSupabase();
    const colName = `${scoreType}_score_${timeframe}`;
    
    let query = supabase
      .from('stock_scores')
      .select(`stock_symbol, ${colName}, sector`)
      .not(colName, 'is', null)
      .order(colName, { ascending: false, nullsFirst: false })
      .limit(limit);

    if (scoreType === 'sentiment') {
      query = query.neq(colName, 'Not Available');
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      const formatted: StockItem[] = data.map((item: any) => ({
        symbol: item.stock_symbol,
        score: Number(item[colName]) || 0,
        sector: item.sector,
      }));

      // Cache the result asynchronously for instant offline renders
      AsyncStorage.setItem(cacheKey, JSON.stringify(formatted)).catch(() => {});
      return { stocks: formatted };
    }
  } catch (err) {
    console.warn('Direct Supabase stock fetch failed, falling back to API:', err);
  }

  // 2. Fallback to Render FastAPI backend
  try {
    const res = await apiClient.get(`/stocks/top?score_type=${scoreType}&timeframe=${timeframe}&limit=${limit}`);
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      const formatted: StockItem[] = res.data.map((item: any) => ({
        symbol: item.symbol,
        score: Number(item.score) || 0,
        sector: item.sector,
      }));
      AsyncStorage.setItem(cacheKey, JSON.stringify(formatted)).catch(() => {});
      return { stocks: formatted };
    }
  } catch (apiErr) {
    console.warn('API stock fetch failed, falling back to local cache:', apiErr);
  }

  // 3. Fallback to cached data if both network requests fail
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return { stocks: JSON.parse(cached), fromCache: true };
    }
  } catch {}

  return { stocks: [] };
}

/**
 * Get cached top stocks immediately (0ms synchronous-like read)
 */
export async function getCachedTopStocks(
  scoreType: string = 'overall',
  timeframe: Timeframe = 'short'
): Promise<StockItem[] | null> {
  try {
    const cacheKey = `${CACHE_KEY_TOP_STOCKS}${scoreType}_${timeframe}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

/**
 * Search stocks by symbol prefix with Supabase + API fallback
 */
export async function searchStocks(
  q: string,
  timeframe: Timeframe = 'short'
): Promise<Array<{ symbol: string; overall_score: number }>> {
  if (!q || q.trim().length < 2) return [];

  const cleanQuery = q.trim().toUpperCase();
  const colName = `overall_score_${timeframe}`;

  // 1. Direct Supabase Search
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('stock_scores')
      .select(`stock_symbol, ${colName}`)
      .ilike('stock_symbol', `%${cleanQuery}%`)
      .order(colName, { ascending: false, nullsFirst: false })
      .limit(10);

    if (!error && data) {
      return data.map((item: any) => ({
        symbol: item.stock_symbol,
        overall_score: Number(item[colName]) || 0,
      }));
    }
  } catch (err) {
    console.warn('Supabase stock search failed, falling back to API:', err);
  }

  // 2. API Fallback
  try {
    const res = await apiClient.get(`/stocks/search?q=${encodeURIComponent(cleanQuery)}&timeframe=${timeframe}`);
    return res.data || [];
  } catch (e) {
    console.error('API search failed:', e);
    return [];
  }
}

/**
 * Get detailed score breakdown for a specific stock
 */
export async function getStockDetailScore(
  symbol: string,
  timeframe: Timeframe = 'short'
): Promise<StockScoreDetail> {
  const upperSymbol = symbol.toUpperCase();

  // 1. Direct Supabase Query
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('stock_scores')
      .select('*')
      .eq('stock_symbol', upperSymbol)
      .single();

    if (!error && data) {
      return {
        symbol: data.stock_symbol,
        timeframe,
        overall: Number(data[`overall_score_${timeframe}`]) || 0,
        technical: data[`technical_score_${timeframe}`] != null ? Number(data[`technical_score_${timeframe}`]) : null,
        safety: data[`safety_score_${timeframe}`] != null ? Number(data[`safety_score_${timeframe}`]) : null,
        sentiment: data[`sentiment_score_${timeframe}`] ?? 'Not Available',
        last_updated: data.computed_at,
      };
    }
  } catch (err) {
    console.warn('Supabase stock detail failed, falling back to API:', err);
  }

  // 2. API Fallback
  const res = await apiClient.get(`/stocks/${upperSymbol}/score?timeframe=${timeframe}`);
  return res.data;
}
