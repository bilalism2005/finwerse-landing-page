import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TextInput, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAnalyzerStore, CustomTradeInput } from '../../src/store/analyzerStore';
import { IconSymbol } from '../../components/ui/IconSymbol';

interface EditableTrade {
  id: string;
  stock_symbol: string;
  buy_price: string;
  buy_date: string;
  sell_price: string;
  sell_date: string;
  quantity: string;
}

export default function ImpulseScreen() {
  const { impulseTrades, totalCost, isLoading, fetchAnalyzerData, analyzeCustomTrades } = useAnalyzerStore();
  const [activeTab, setActiveTab] = useState<'custom' | 'portfolio'>('custom');

  const todayStr = new Date().toISOString().split('T')[0];
  const priorDateStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [tradeRows, setTradeRows] = useState<EditableTrade[]>([
    {
      id: '1',
      stock_symbol: 'ZOMATO',
      buy_price: '240',
      buy_date: priorDateStr,
      sell_price: '210',
      sell_date: todayStr,
      quantity: '100',
    }
  ]);

  useEffect(() => {
    fetchAnalyzerData();
  }, []);

  const addTradeRow = () => {
    setTradeRows(prev => [
      ...prev,
      {
        id: String(Date.now()),
        stock_symbol: '',
        buy_price: '',
        buy_date: priorDateStr,
        sell_price: '',
        sell_date: todayStr,
        quantity: '50',
      }
    ]);
  };

  const removeTradeRow = (id: string) => {
    if (tradeRows.length === 1) {
      Alert.alert('Notice', 'You need at least one trade row to analyze.');
      return;
    }
    setTradeRows(prev => prev.filter(r => r.id !== id));
  };

  const updateTradeField = (id: string, field: keyof EditableTrade, val: string) => {
    setTradeRows(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, [field]: field === 'stock_symbol' ? val.toUpperCase() : val };
      }
      return r;
    }));
  };

  const handleScanImpulse = async () => {
    const formattedTrades: CustomTradeInput[] = [];

    for (let i = 0; i < tradeRows.length; i++) {
      const row = tradeRows[i];
      if (!row.stock_symbol.trim()) {
        Alert.alert('Validation Error', `Please enter a stock symbol for trade #${i + 1}`);
        return;
      }
      const buyPrice = parseFloat(row.buy_price);
      const sellPrice = parseFloat(row.sell_price);
      const qty = parseInt(row.quantity, 10);

      if (isNaN(buyPrice) || buyPrice <= 0) {
        Alert.alert('Validation Error', `Please enter a valid buy price for ${row.stock_symbol}`);
        return;
      }
      if (isNaN(sellPrice) || sellPrice <= 0) {
        Alert.alert('Validation Error', `Please enter a valid sell price for ${row.stock_symbol}`);
        return;
      }
      if (isNaN(qty) || qty <= 0) {
        Alert.alert('Validation Error', `Please enter a valid quantity for ${row.stock_symbol}`);
        return;
      }

      formattedTrades.push({
        stock_symbol: row.stock_symbol.trim().toUpperCase(),
        buy_price: buyPrice,
        buy_date: row.buy_date.trim() || priorDateStr,
        sell_price: sellPrice,
        sell_date: row.sell_date.trim() || todayStr,
        quantity: qty,
        intended_holding_period: 'short',
      });
    }

    await analyzeCustomTrades(formattedTrades);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Impulse Analyzer</Text>
        <Text style={styles.headerSubtitle}>Identify avoidable losses from trading against market data</Text>
      </View>

      {/* Mode Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'custom' && styles.tabButtonActive]}
          onPress={() => setActiveTab('custom')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'custom' && styles.tabButtonTextActive]}>
            Add Custom Trades
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'portfolio' && styles.tabButtonActive]}
          onPress={() => { setActiveTab('portfolio'); fetchAnalyzerData(); }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'portfolio' && styles.tabButtonTextActive]}>
            Portfolio Sold Trades
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Custom Trade Input Section */}
        {activeTab === 'custom' && (
          <View style={styles.formSection}>
            <View style={styles.formHeader}>
              <Text style={styles.formSectionTitle}>Trade Inputs</Text>
              <TouchableOpacity style={styles.addBtn} onPress={addTradeRow}>
                <IconSymbol name="plus.circle.fill" size={18} color="#B8F567" />
                <Text style={styles.addBtnText}>Add Trade</Text>
              </TouchableOpacity>
            </View>

            {tradeRows.map((row, idx) => (
              <View key={row.id} style={styles.tradeInputCard}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowNumber}>Trade #{idx + 1}</Text>
                  {tradeRows.length > 1 && (
                    <TouchableOpacity onPress={() => removeTradeRow(row.id)}>
                      <IconSymbol name="trash" size={16} color="#FF453A" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Stock Symbol & Quantity */}
                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1.5 }]}>
                    <Text style={styles.inputLabel}>Symbol (e.g. INFY)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="ZOMATO"
                      placeholderTextColor="#555"
                      value={row.stock_symbol}
                      onChangeText={(val) => updateTradeField(row.id, 'stock_symbol', val)}
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Qty</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="100"
                      placeholderTextColor="#555"
                      value={row.quantity}
                      onChangeText={(val) => updateTradeField(row.id, 'quantity', val)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Buy Price & Buy Date */}
                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Buy Price (₹)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="240"
                      placeholderTextColor="#555"
                      value={row.buy_price}
                      onChangeText={(val) => updateTradeField(row.id, 'buy_price', val)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Buy Date (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="2026-08-01"
                      placeholderTextColor="#555"
                      value={row.buy_date}
                      onChangeText={(val) => updateTradeField(row.id, 'buy_date', val)}
                    />
                  </View>
                </View>

                {/* Sell Price & Sell Date */}
                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Sell Price (₹)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="210"
                      placeholderTextColor="#555"
                      value={row.sell_price}
                      onChangeText={(val) => updateTradeField(row.id, 'sell_price', val)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Sell Date (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="2026-08-10"
                      placeholderTextColor="#555"
                      value={row.sell_date}
                      onChangeText={(val) => updateTradeField(row.id, 'sell_date', val)}
                    />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity 
              style={styles.scanBtn} 
              onPress={handleScanImpulse}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#0D0D0D" />
              ) : (
                <>
                  <IconSymbol name="bolt.fill" size={18} color="#0D0D0D" />
                  <Text style={styles.scanBtnText}>Scan & Analyze Impulse</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Results Section */}
        {isLoading && activeTab === 'portfolio' ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#B8F567" />
            <Text style={styles.loadingText}>Analyzing Trades Against Historical Data...</Text>
          </View>
        ) : (
          <View style={styles.resultsSection}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Avoidable Impulse Cost</Text>
              <Text style={styles.summaryValue}>-₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
              <Text style={styles.summaryDesc}>
                Difference between actual execution and data-backed technical score timing.
              </Text>
            </View>

            {impulseTrades.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol name="checkmark.shield.fill" size={44} color="#34C759" />
                <Text style={styles.emptyTitle}>No Impulse Losses Flagged!</Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'custom' 
                    ? 'Enter trade details above and tap "Scan & Analyze Impulse" to evaluate.'
                    : 'Your recorded sold trades aligned well with technical scoring.'}
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                <Text style={styles.listTitle}>Analyzed Trade Breakdown</Text>
                {impulseTrades.map((trade, i) => (
                  <View key={trade.id || String(i)} style={styles.tradeCard}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.symbol}>{trade.stock_symbol}</Text>
                        <Text style={styles.qtyText}>{trade.quantity} Shares</Text>
                      </View>
                      <View style={styles.costBadge}>
                        <Text style={styles.costBadgeLabel}>Avoidable Cost</Text>
                        <Text style={styles.rupeeCost}>
                          -₹{trade.rupee_cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Side-by-side comparison */}
                    <View style={styles.comparisonRow}>
                      <View style={styles.side}>
                        <Text style={styles.sideLabel}>Your Execution</Text>
                        <Text style={styles.sideDate}>{trade.actual.buy_date} → {trade.actual.sell_date}</Text>
                        <Text style={styles.sidePrice}>₹{trade.actual.buy_price} → ₹{trade.actual.sell_price}</Text>
                        <Text style={trade.actual.profit >= 0 ? styles.outcomeProfit : styles.outcomeLoss}>
                          {trade.actual.profit >= 0 ? '+₹' : '-₹'}
                          {Math.abs(trade.actual.profit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Text>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.side}>
                        <Text style={[styles.sideLabel, { color: '#B8F567' }]}>Data-Backed Timing</Text>
                        <Text style={styles.sideDate}>{trade.counterfactual.buy_date} → {trade.counterfactual.sell_date}</Text>
                        <Text style={styles.sidePrice}>₹{trade.counterfactual.buy_price} → ₹{trade.counterfactual.sell_price}</Text>
                        <Text style={trade.counterfactual.profit >= 0 ? styles.outcomeProfit : styles.outcomeLoss}>
                          {trade.counterfactual.profit >= 0 ? '+₹' : '-₹'}
                          {Math.abs(trade.counterfactual.profit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  headerSubtitle: { fontSize: 13, color: '#888', marginTop: 3 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1A1A1A', alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  tabButtonActive: { backgroundColor: '#B8F567', borderColor: '#B8F567' },
  tabButtonText: { fontSize: 13, fontWeight: '700', color: '#AAA' },
  tabButtonTextActive: { color: '#0D0D0D' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  formSection: { marginBottom: 20 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  formSectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1F1F1F', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  addBtnText: { color: '#B8F567', fontSize: 13, fontWeight: '700' },
  tradeInputCard: { backgroundColor: '#161616', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#262626' },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rowNumber: { fontSize: 13, fontWeight: '700', color: '#B8F567', textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 11, fontWeight: '600', color: '#888', marginBottom: 4, textTransform: 'uppercase' },
  textInput: { backgroundColor: '#202020', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: '#FFF', borderWidth: 1, borderColor: '#303030' },
  scanBtn: { backgroundColor: '#B8F567', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8, marginTop: 4 },
  scanBtnText: { color: '#0D0D0D', fontSize: 15, fontWeight: '800' },
  resultsSection: { marginTop: 8 },
  summaryCard: { backgroundColor: '#220D0D', borderWidth: 1, borderColor: '#4A1515', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  summaryLabel: { color: '#FFA39E', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  summaryValue: { color: '#FF4D4F', fontSize: 36, fontWeight: '900', marginVertical: 6 },
  summaryDesc: { color: '#AAA', fontSize: 12, textAlign: 'center', lineHeight: 17 },
  emptyState: { alignItems: 'center', marginTop: 24, padding: 24, backgroundColor: '#161616', borderRadius: 16, borderWidth: 1, borderColor: '#222' },
  emptyTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptyText: { marginTop: 6, fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 18 },
  listContainer: { paddingBottom: 24 },
  listTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#FFF' },
  tradeCard: { backgroundColor: '#161616', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#262626' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  symbol: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  qtyText: { fontSize: 12, color: '#888', marginTop: 2 },
  costBadge: { alignItems: 'flex-end' },
  costBadgeLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase' },
  rupeeCost: { fontSize: 15, fontWeight: '800', color: '#FF4D4F', marginTop: 2 },
  comparisonRow: { flexDirection: 'row', backgroundColor: '#101010', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#202020' },
  side: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: '#2A2A2A', marginHorizontal: 8 },
  sideLabel: { fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', fontWeight: '700' },
  sideDate: { fontSize: 11, color: '#666', marginBottom: 2 },
  sidePrice: { fontSize: 12, color: '#DDD', marginBottom: 4 },
  outcomeLoss: { fontSize: 14, fontWeight: '800', color: '#FF4D4F' },
  outcomeProfit: { fontSize: 14, fontWeight: '800', color: '#34C759' },
  loadingBox: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#888', marginTop: 12, fontSize: 13 }
});
