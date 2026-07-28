import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAppStore, Timeframe } from '../../src/store';
import { apiClient } from '../../src/api/client';

export default function TabOneScreen() {
  const router = useRouter();
  const { selectedTimeframe, setTimeframe } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [topStocks, setTopStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTopStocks = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/stocks/top?score_type=overall&timeframe=${selectedTimeframe}`);
      setTopStocks(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopStocks();
  }, [selectedTimeframe]);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 1) {
      try {
        const res = await apiClient.get(`/stocks/search?q=${text}&timeframe=${selectedTimeframe}`);
        setSearchResults(res.data);
      } catch (e) {
        console.error(e);
      }
    } else {
      setSearchResults([]);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
      />

      {searchQuery.length > 1 ? (
        <View style={styles.listContainer}>
          <Text style={styles.subtitle}>Search Results</Text>
          {searchResults.map((stock) => (
            <TouchableOpacity 
              key={stock.symbol} 
              style={styles.card}
              onPress={() => router.push(`/stock/${stock.symbol}`)}
            >
              <Text style={styles.stockSymbol}>{stock.symbol}</Text>
              <Text style={styles.stockScore}>{Math.round(stock.overall_score)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.listContainer}>
          <Text style={styles.subtitle}>Top 10 Stocks (Overall)</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#4F46E5" />
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
});
