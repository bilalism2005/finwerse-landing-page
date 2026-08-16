import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAnalyzerStore } from '../../src/store/analyzerStore';
import { IconSymbol } from '../../components/ui/IconSymbol';

export default function ImpulseScreen() {
  const { impulseTrades, totalCost, isLoading, fetchAnalyzerData } = useAnalyzerStore();

  useEffect(() => {
    fetchAnalyzerData();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Impulse Analyzer</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Von Restorff Effect: Dominant aggregate metric */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Impulse Cost (This Month)</Text>
          <Text style={styles.summaryValue}>-₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
          <Text style={styles.summaryDesc}>Avoidable losses from trading against the data.</Text>
        </View>

        {impulseTrades.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="checkmark.shield.fill" size={48} color="#34C759" />
            <Text style={styles.emptyText}>No impulse trades found! You're trading with discipline.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>Flagged Trades</Text>
            {impulseTrades.map(trade => (
              <View key={trade.id} style={styles.tradeCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.symbol}>{trade.stock_symbol}</Text>
                  <Text style={styles.rupeeCost}>-₹{trade.rupee_cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                </View>
                
                {/* Anchoring: Show actual vs counterfactual side-by-side */}
                <View style={styles.comparisonRow}>
                  <View style={styles.side}>
                    <Text style={styles.sideLabel}>Actual Trade</Text>
                    <Text style={styles.outcomeLoss}>Loss: -₹{Math.abs(trade.actual.profit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.side}>
                    <Text style={styles.sideLabel}>Data-Backed Timing</Text>
                    <Text style={trade.counterfactual.profit >= 0 ? styles.outcomeProfit : styles.outcomeLoss}>
                      {trade.counterfactual.profit >= 0 ? 'Profit: +₹' : 'Loss: -₹'}
                      {Math.abs(trade.counterfactual.profit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  scrollContent: { padding: 16 },
  summaryCard: { backgroundColor: '#FF3B30', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 24 },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  summaryValue: { color: '#FFF', fontSize: 42, fontWeight: '800', marginVertical: 8 },
  summaryDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 14, textAlign: 'center' },
  emptyState: { alignItems: 'center', marginTop: 40, padding: 24 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 22 },
  listContainer: { paddingBottom: 24 },
  listTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  tradeCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  symbol: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1E' },
  rupeeCost: { fontSize: 16, fontWeight: 'bold', color: '#FF3B30' },
  comparisonRow: { flexDirection: 'row', backgroundColor: '#F8F8F8', borderRadius: 8, padding: 12 },
  side: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: '#E5E5EA', marginHorizontal: 12 },
  sideLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 4, textTransform: 'uppercase', fontWeight: '600' },
  outcomeLoss: { fontSize: 15, fontWeight: 'bold', color: '#FF3B30' },
  outcomeProfit: { fontSize: 15, fontWeight: 'bold', color: '#34C759' },
});
