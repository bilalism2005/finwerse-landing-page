import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAppStore, Timeframe } from '../../src/store';
import { getTopStocks, getCachedTopStocks, searchStocks, StockItem } from '../../src/api/stockService';
import { warmUpBackend } from '../../src/api/client';

export default function TabOneScreen() {
  const router = useRouter();
  const { selectedTimeframe, setTimeframe } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [topStocks, setTopStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-warm backend on startup for background ML/AI readiness
  useEffect(() => {
    warmUpBackend();
  }, []);

  const loadStocks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (topStocks.length === 0) setLoading(true);
    setError(null);

    try {
      // Step 1: Immediately render from local cache if present (0ms!)
      if (!isRefresh && topStocks.length === 0) {
        const cached = await getCachedTopStocks('overall', selectedTimeframe);
        if (cached && cached.length > 0) {
          setTopStocks(cached);
          setLoading(false);
        }
      }

      // Step 2: Fetch fresh data (direct Supabase sub-50ms query)
      const res = await getTopStocks('overall', selectedTimeframe, 10);
      if (res.stocks && res.stocks.length > 0) {
        setTopStocks(res.stocks);
      } else if (topStocks.length === 0) {
        setError('No stock data available. Tap to retry.');
      }
    } catch (e: any) {
      console.error('Failed to load top stocks:', e);
      if (topStocks.length === 0) {
        setError('Failed to load stocks. Please pull down to retry.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedTimeframe, topStocks.length]);

  useEffect(() => {
    loadStocks();
  }, [selectedTimeframe]);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 1) {
      setSearchLoading(true);
      try {
        const results = await searchStocks(text, selectedTimeframe);
        setSearchResults(results);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchLoading(false);
      }
    } else {
      setSearchResults([]);
      setSearchLoading(false);
    }
  };

  const renderTimeframeButton = (title: string, value: Timeframe) => (
    <TouchableOpacity
      style={[styles.timeframeButton, selectedTimeframe === value && styles.timeframeButtonActive]}
      onPress={() => setTimeframe(value)}
    >
      <Text style={[styles.timeframeText, selectedTimeframe === value && styles.timeframeTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={() => loadStocks(true)} 
          tintColor="#4F46E5"
        />
      }
    >
      <Text style={styles.title}>Finwerse</Text>
      
      <View style={styles.timeframeContainer}>
        {renderTimeframeButton('Short Term', 'short')}
        {renderTimeframeButton('Medium Term', 'medium')}
        {renderTimeframeButton('Long Term', 'long')}
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search for a stock (e.g., RELIANCE)..."
        placeholderTextColor="#888"
        value={searchQuery}
        onChangeText={handleSearch}
        autoCapitalize="characters"
      />

      {searchQuery.length > 1 ? (
        <View style={styles.listContainer}>
          <Text style={styles.subtitle}>Search Results</Text>
          {searchLoading ? (
            <ActivityIndicator size="small" color="#4F46E5" style={{ marginVertical: 16 }} />
          ) : searchResults.length === 0 ? (
            <Text style={styles.emptyText}>No matching stocks found.</Text>
          ) : (
            searchResults.map((stock) => (
              <TouchableOpacity 
                key={stock.symbol} 
                style={styles.card}
                onPress={() => router.push(`/stock/${stock.symbol}`)}
              >
                <Text style={styles.stockSymbol}>{stock.symbol}</Text>
                <Text style={styles.stockScore}>{Math.round(stock.overall_score)}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : (
        <View style={styles.listContainer}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.subtitle}>Top 10 Stocks (Overall)</Text>
            {refreshing && <ActivityIndicator size="small" color="#888" />}
          </View>

          {loading && topStocks.length === 0 ? (
            <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 32 }} />
          ) : error && topStocks.length === 0 ? (
            <TouchableOpacity style={styles.errorBox} onPress={() => loadStocks()}>
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.retryText}>Tap to Retry</Text>
            </TouchableOpacity>
          ) : (
            topStocks.map((stock, index) => (
              <TouchableOpacity 
                key={stock.symbol} 
                style={styles.card}
                onPress={() => router.push(`/stock/${stock.symbol}`)}
              >
                <View style={styles.cardLeft}>
                  <Text style={styles.rank}>#{index + 1}</Text>
                  <Text style={styles.stockSymbol}>{stock.symbol}</Text>
                </View>
                <Text style={styles.stockScore}>{Math.round(stock.score)}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  timeframeButtonActive: {
    backgroundColor: '#333',
  },
  timeframeText: {
    color: '#888',
    fontWeight: '600',
  },
  timeframeTextActive: {
    color: '#fff',
  },
  searchInput: {
    backgroundColor: '#111',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  listContainer: {
    gap: 12,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rank: {
    color: '#888',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stockSymbol: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  stockScore: {
    color: '#4F46E5',
    fontSize: 20,
    fontWeight: 'bold',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    marginVertical: 20,
  },
  errorBox: {
    padding: 20,
    backgroundColor: '#1c1111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4a1e1e',
    alignItems: 'center',
    marginVertical: 12,
  },
  errorText: {
    color: '#ff8080',
    fontSize: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  retryText: {
    color: '#B7FF00',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
