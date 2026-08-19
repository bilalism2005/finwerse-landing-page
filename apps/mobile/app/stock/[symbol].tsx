import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAppStore, Timeframe } from '../../src/store';
import { getStockDetailScore, StockScoreDetail } from '../../src/api/stockService';
import { IconSymbol } from '../../components/ui/IconSymbol';

export default function StockDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  const { selectedTimeframe } = useAppStore();
  const [timeframe, setTimeframe] = useState<Timeframe>(selectedTimeframe || 'short');
  const [data, setData] = useState<StockScoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScore(timeframe);
  }, [symbol, timeframe]);

  const fetchScore = async (tf: Timeframe) => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const scoreData = await getStockDetailScore(symbol, tf);
      setData(scoreData);
    } catch (e: any) {
      console.error('Failed to load stock details:', e);
      setError('Failed to load stock data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null || score === undefined) return '#888';
    if (score >= 65) return '#B8F567'; // Neon Green / Bullish
    if (score >= 40) return '#FFB300'; // Amber / Neutral
    return '#FF4D4F'; // Red / Bearish
  };

  const renderSubScore = (label: string, score: any, iconName: string) => {
    const isNA = score === 'Not Available' || score === null || score === undefined;
    const numScore = isNA ? 0 : Number(score);
    
    return (
      <View style={styles.subCard}>
        <View style={styles.subCardHeader}>
          <Text style={styles.subCardLabel}>{label}</Text>
        </View>
        <Text style={[styles.subCardValue, !isNA && { color: getScoreColor(numScore) }]}>
          {isNA ? 'N/A' : Math.round(numScore)}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.symbol}>{symbol?.toUpperCase()}</Text>
        <Text style={styles.subtitle}>Finwerse Multi-Pillar Engine</Text>
      </View>

      {/* Interactive Timeframe Pill Switcher */}
      <View style={styles.timeframeContainer}>
        <TouchableOpacity
          style={[styles.timeframePill, timeframe === 'short' && styles.timeframePillActive]}
          onPress={() => setTimeframe('short')}
        >
          <Text style={[styles.timeframeText, timeframe === 'short' && styles.timeframeTextActive]}>
            ⚡ Short (Daily)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.timeframePill, timeframe === 'medium' && styles.timeframePillActive]}
          onPress={() => setTimeframe('medium')}
        >
          <Text style={[styles.timeframeText, timeframe === 'medium' && styles.timeframeTextActive]}>
            📊 Medium (Weekly)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.timeframePill, timeframe === 'long' && styles.timeframePillActive]}
          onPress={() => setTimeframe('long')}
        >
          <Text style={[styles.timeframeText, timeframe === 'long' && styles.timeframeTextActive]}>
            🏛️ Long (Monthly)
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B8F567" />
          <Text style={styles.loadingText}>Computing {timeframe.toUpperCase()} scores...</Text>
        </View>
      ) : error || !data ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Stock score unavailable'}</Text>
        </View>
      ) : (
        <>
          {/* Main Score Hero Card */}
          <View style={styles.mainCard}>
            <Text style={styles.mainLabel}>Overall Score ({timeframe.toUpperCase()})</Text>
            <Text style={[styles.mainScore, { color: getScoreColor(data.overall) }]}>
              {Math.round(data.overall)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: data.overall >= 50 ? 'rgba(184, 245, 103, 0.15)' : 'rgba(255, 77, 79, 0.15)' }]}>
              <Text style={[styles.statusText, { color: data.overall >= 50 ? '#B8F567' : '#FF4D4F' }]}>
                {data.overall >= 65 ? 'STRONG MOMENTUM' : data.overall >= 40 ? 'CONSOLIDATION' : 'WEAK / PRESSURE'}
              </Text>
            </View>
          </View>

          {/* Sub Score Breakdown Grid */}
          <Text style={styles.sectionTitle}>Pillar Breakdown</Text>
          <View style={styles.subGrid}>
            {renderSubScore('Technical', data.technical, 'chart.xyaxis.line')}
            {renderSubScore('Safety', data.safety, 'shield.fill')}
            {renderSubScore('Sentiment', data.sentiment, 'message.fill')}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
    paddingTop: 8,
  },
  symbol: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#262626',
    gap: 4,
  },
  timeframePill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeframePillActive: {
    backgroundColor: '#B8F567',
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
  },
  timeframeTextActive: {
    color: '#0D0D0D',
    fontWeight: '800',
  },
  center: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 13,
  },
  errorText: {
    color: '#FF4D4F',
    fontSize: 15,
    textAlign: 'center',
  },
  mainCard: {
    backgroundColor: '#161616',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#262626',
  },
  mainLabel: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  mainScore: {
    fontSize: 72,
    fontWeight: '900',
  },
  statusBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 12,
  },
  subGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  subCard: {
    backgroundColor: '#161616',
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  subCardHeader: {
    marginBottom: 8,
  },
  subCardLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subCardValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
  },
});
