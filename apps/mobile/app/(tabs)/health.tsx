import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useHealthStore, StockHealthInfo, SectorInfo } from '@/src/store/healthStore';
import { HoldingPeriod } from '@/src/store/portfolioStore';
import { useChatStore } from '@/src/store/chatStore';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';

export default function HealthScreen() {
  const router = useRouter();
  const { sendMessage } = useChatStore();
  const { healthData, fetchHealth, loading, error, clearBottleneckReport } = useHealthStore();
  const [timeframe, setTimeframe] = useState<HoldingPeriod>('medium');

  useEffect(() => {
    fetchHealth(timeframe);
    clearBottleneckReport();
  }, [timeframe]);

  const handleBottleneckNav = (prompt: string) => {
    router.push('/(tabs)/chat');
    // small delay to let the tab transition before streaming message
    setTimeout(() => {
      sendMessage(prompt);
    }, 300);
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return '#888';
    if (score < 40) return '#ff4444';
    if (score <= 65) return '#ffaa00';
    return '#00cc44';
  };

  const renderHolding = ({ item }: { item: StockHealthInfo }) => (
    <View style={styles.holdingCard}>
      <View style={styles.holdingHeader}>
        <Text style={styles.symbol}>{item.stock_symbol}</Text>
        <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(item.overall_score) }]}>
          <Text style={styles.scoreText}>{item.overall_score !== null ? item.overall_score : 'N/A'}</Text>
        </View>
      </View>
      <View style={styles.holdingBody}>
        <Text style={styles.smallText}>Weight: {(item.weight * 100).toFixed(1)}%</Text>
        <Text style={styles.smallText}>Tech: {item.technical_score ?? 'N/A'}</Text>
        <Text style={styles.smallText}>Safety: {item.safety_score ?? 'N/A'}</Text>
      </View>
    </View>
  );

  const renderHorizontalBar = (sectors: SectorInfo[]) => {
    const colors = ['#7c6af7', '#b8f567', '#f7a26a', '#4facfe', '#00f2fe', '#f093fb', '#f5576c', '#5ee7df'];
    return (
      <View style={styles.barContainer}>
        {sectors.map((sec, i) => (
          <View 
            key={sec.sector} 
            style={[styles.barSegment, { flex: sec.weight, backgroundColor: colors[i % colors.length] }]} 
          />
        ))}
      </View>
    );
  };

  if (loading && !healthData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#b8f567" />
        <Text style={{marginTop: 12}}>Analyzing Portfolio...</Text>
      </View>
    );
  }

  if (error || !healthData) {
    return (
      <View style={styles.center}>
        <Text style={{color: 'red'}}>{error || "No data available"}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Timeframe Toggle */}
        <View style={styles.tabToggle}>
          {(['short', 'medium', 'long'] as HoldingPeriod[]).map(t => (
            <TouchableOpacity 
              key={t}
              style={[styles.toggleBtn, timeframe === t && styles.activeToggle]}
              onPress={() => setTimeframe(t)}
            >
              <Text style={[styles.toggleText, timeframe === t && styles.activeToggleText]}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overall Score */}
        <View style={styles.overallSection}>
          <Text style={styles.sectionTitle}>Portfolio Overall</Text>
          <View style={styles.overallCard}>
            <Text style={[styles.bigScore, { color: getScoreColor(healthData.overall_score) }]}>
              {healthData.overall_score}
            </Text>
            
            <View style={styles.splitScores}>
              <View style={styles.splitBox}>
                <Text style={styles.splitLabel}>Green Score</Text>
                <Text style={[styles.splitVal, { color: '#00cc44' }]}>{healthData.green_score}</Text>
              </View>
              <View style={styles.splitBox}>
                <Text style={styles.splitLabel}>Red Score</Text>
                <Text style={[styles.splitVal, { color: '#ff4444' }]}>{healthData.red_score}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sub Scores */}
        <View style={styles.subScoresRow}>
          <View style={styles.subScoreCard}>
            <Text style={styles.subLabel}>Technical</Text>
            <Text style={[styles.subVal, { color: getScoreColor(healthData.technical_score) }]}>{healthData.technical_score}</Text>
          </View>
          <View style={styles.subScoreCard}>
            <Text style={styles.subLabel}>Safety</Text>
            <Text style={[styles.subVal, { color: getScoreColor(healthData.safety_score) }]}>{healthData.safety_score}</Text>
          </View>
          <View style={styles.subScoreCard}>
            <Text style={styles.subLabel}>Sentiment</Text>
            <Text style={[styles.subVal, { color: getScoreColor(healthData.sentiment_score) }]}>
              {healthData.sentiment_score !== null ? healthData.sentiment_score : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Diversification */}
        <View style={styles.section}>
          <View style={styles.divHeader}>
            <Text style={styles.sectionTitle}>Diversification</Text>
            <Text style={[styles.divScore, { color: getScoreColor(healthData.diversification_score) }]}>
              {healthData.diversification_score} / 100
            </Text>
          </View>
          
          <View style={styles.chartBox}>
            <Text style={styles.chartLabel}>Your Allocation (Actual)</Text>
            {renderHorizontalBar(healthData.sectors)}
            
            <Text style={[styles.chartLabel, { marginTop: 16 }]}>Ideal Reference (10 equal sectors)</Text>
            {renderHorizontalBar(Array(10).fill({ weight: 0.1, sector: 'Ideal' }))}
          </View>
          
          <Text style={styles.sentence}>{healthData.sector_summary_sentence}</Text>
        </View>

        {/* AI Bottleneck Report */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Bottleneck Report</Text>
          <TouchableOpacity 
            style={styles.bottleneckBtn} 
            onPress={() => {
              const prompt = `Analyze my portfolio health data and identify the top bottlenecks holding back my overall score for the ${timeframe} timeframe. What should I do to improve diversification, safety, and technical scores?`;
              // We could navigate using router.push('/chat') and then set the prompt.
              // We'll import useRouter and useChatStore above.
              handleBottleneckNav(prompt);
            }}
          >
            <SymbolView name={{ ios: 'sparkles', android: 'star', web: 'star' }} size={20} tintColor="#0a0a0f" />
            <Text style={styles.bottleneckBtnText}>See what's holding your portfolio back</Text>
          </TouchableOpacity>
        </View>

        {/* Holdings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Holdings Impact ({timeframe})</Text>
          {healthData.holdings.length === 0 ? (
            <Text style={styles.sentence}>No holdings found.</Text>
          ) : (
            <FlatList
              data={healthData.holdings}
              keyExtractor={(item) => item.stock_symbol}
              renderItem={renderHolding}
              scrollEnabled={false}
            />
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  scroll: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  tabToggle: {
    flexDirection: 'row',
    marginBottom: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  toggleBtn: { flex: 1, padding: 10, alignItems: 'center' },
  activeToggle: { backgroundColor: '#b8f567' },
  toggleText: { fontSize: 12, fontWeight: '600', color: '#888' },
  activeToggleText: { color: '#0a0a0f' },

  overallSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  overallCard: {
    padding: 24,
    backgroundColor: '#16161f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center'
  },
  bigScore: { fontSize: 64, fontWeight: '800', lineHeight: 70 },
  splitScores: { flexDirection: 'row', gap: 24, marginTop: 16, width: '100%', justifyContent: 'center' },
  splitBox: { alignItems: 'center' },
  splitLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  splitVal: { fontSize: 24, fontWeight: 'bold' },

  subScoresRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  subScoreCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#16161f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center'
  },
  subLabel: { fontSize: 12, color: '#888', marginBottom: 8 },
  subVal: { fontSize: 28, fontWeight: 'bold' },

  section: { marginBottom: 32 },
  divHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  divScore: { fontSize: 18, fontWeight: 'bold' },
  chartBox: { padding: 16, backgroundColor: '#16161f', borderRadius: 12, borderWidth: 1, borderColor: '#222', marginBottom: 12 },
  chartLabel: { fontSize: 12, color: '#888', marginBottom: 8 },
  barContainer: { height: 24, flexDirection: 'row', borderRadius: 12, overflow: 'hidden', backgroundColor: '#333' },
  barSegment: { height: '100%' },
  sentence: { fontSize: 14, color: '#aaa', lineHeight: 20 },

  bottleneckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#b8f567',
    padding: 16,
    borderRadius: 12,
  },
  bottleneckBtnText: { color: '#0a0a0f', fontWeight: 'bold', fontSize: 15 },
  reportBox: {
    padding: 16,
    backgroundColor: 'rgba(124,106,247,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124,106,247,0.3)',
    borderRadius: 12,
  },
  reportText: { color: '#e0e0e0', fontSize: 14, lineHeight: 22 },

  holdingCard: {
    padding: 12,
    backgroundColor: '#16161f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 8,
  },
  holdingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  symbol: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  scoreText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  holdingBody: { flexDirection: 'row', gap: 16 },
  smallText: { fontSize: 12, color: '#888' },
});
