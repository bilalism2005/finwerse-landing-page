import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAppStore } from '../../src/store';
import { getStockDetailScore } from '../../src/api/stockService';

export default function StockDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { selectedTimeframe } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScore = async () => {
      if (!symbol) return;
      setLoading(true);
      setError(null);
      try {
        const scoreData = await getStockDetailScore(symbol, selectedTimeframe);
        setData(scoreData);
      } catch (e: any) {
        console.error('Failed to load stock details:', e);
        setError('Failed to load stock data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchScore();
  }, [symbol, selectedTimeframe]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10B981'; // Green
    if (score >= 40) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  const renderSubScore = (label: string, score: any) => {
    const isNA = score === 'Not Available' || score === null;
    const numScore = isNA ? 0 : Number(score);
    
    return (
      <View style={styles.subCard}>
        <Text style={styles.subCardLabel}>{label}</Text>
        <Text style={[styles.subCardValue, !isNA && { color: getScoreColor(numScore) }]}>
          {isNA ? 'N/A' : Math.round(numScore)}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.symbol}>{data.symbol}</Text>
      <Text style={styles.timeframeText}>Timeframe: {data.timeframe.toUpperCase()}</Text>

      <View style={styles.mainCard}>
        <Text style={styles.mainLabel}>Overall Finwerse Score</Text>
        <Text style={[styles.mainScore, { color: getScoreColor(data.overall) }]}>
          {Math.round(data.overall)}
        </Text>
      </View>

      <View style={styles.subGrid}>
        {renderSubScore('Technical Score', data.technical)}
        {renderSubScore('Safety Score', data.safety)}
        {renderSubScore('Sentiment Score', data.sentiment)}
      </View>
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
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  symbol: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  timeframeText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 30,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mainCard: {
    backgroundColor: '#111',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#333',
  },
  mainLabel: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mainScore: {
    fontSize: 80,
    fontWeight: '900',
  },
  subGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  subCard: {
    backgroundColor: '#111',
    flex: 1,
    minWidth: '45%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  subCardLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  subCardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
});
