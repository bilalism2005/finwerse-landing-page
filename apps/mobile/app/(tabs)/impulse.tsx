import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAnalyzerStore, CustomTradeInput, ImpulseTrade } from '../../src/store/analyzerStore';
import { IconSymbol } from '../../components/ui/IconSymbol';

// Design System — Mobile Redesign tokens (spec/ui.md → "Design System — Mobile Redesign")
const COLOR_CANVAS = '#090B0A';
const COLOR_SURFACE_ELEVATED = '#131613';
const COLOR_SURFACE_SECONDARY = '#191D19';
const COLOR_DIVIDER = '#1A1E1A';
const COLOR_DIVIDER_STRONG = '#2A2E2A';
const COLOR_TEXT_PRIMARY = '#F5F7F2';
const COLOR_TEXT_SECONDARY = '#A4AAA3';
const COLOR_TEXT_TERTIARY = '#6F766F';
const COLOR_ACCENT_LIME = '#C7FF3D';
const COLOR_POSITIVE = '#B8F35A';
const COLOR_NEGATIVE = '#FF6B67';

interface EditableTrade {
  id: string;
  stock_symbol: string;
  buy_price: string;
  buy_date: string;
  sell_price: string;
  sell_date: string;
  quantity: string;
}

// Known Gap (spec/capabilities/impulse-analyzer.md, "Known Gap found during the mobile Impulse
// Analyzer redesign pass"): `evaluate_single_trade` (apps/api/routers/analyzer.py) can return a
// trade for the buy-right+sell-right-but-still-losing case without `actual`/`counterfactual` keys.
// Guard rendering so a real response hitting that case doesn't crash the results list.
function hasTimingComparison(trade: ImpulseTrade): boolean {
  return !!trade?.actual && !!trade?.counterfactual;
}

function formatRupees(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function ImpulseScreen() {
  const { impulseTrades, totalCost, isLoading, error, fetchAnalyzerData, analyzeCustomTrades } = useAnalyzerStore();
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
    },
  ]);

  useEffect(() => {
    fetchAnalyzerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTradeRow = () => {
    setTradeRows((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        stock_symbol: '',
        buy_price: '',
        buy_date: priorDateStr,
        sell_price: '',
        sell_date: todayStr,
        quantity: '50',
      },
    ]);
  };

  const removeTradeRow = (id: string) => {
    if (tradeRows.length === 1) {
      Alert.alert('Notice', 'You need at least one trade row to analyze.');
      return;
    }
    setTradeRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateTradeField = (id: string, field: keyof EditableTrade, val: string) => {
    setTradeRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, [field]: field === 'stock_symbol' ? val.toUpperCase() : val };
        }
        return r;
      })
    );
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

  const handleRetry = () => {
    if (activeTab === 'portfolio') {
      fetchAnalyzerData();
    } else {
      handleScanImpulse();
    }
  };

  const errorCopy =
    activeTab === 'portfolio'
      ? "Couldn't load your sold trades. Please try again."
      : "Couldn't analyze these trades. Please try again.";

  const showFullAreaLoading = isLoading && activeTab === 'portfolio';
  const showError = !showFullAreaLoading && !!error;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Impulse Analyzer</Text>
        <Text style={styles.headerSubtitle}>Identify avoidable losses from trading against market data</Text>
      </View>

      {/* Mode Switcher */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.segment, activeTab === 'custom' && styles.segmentSelected]}
          onPress={() => setActiveTab('custom')}
        >
          <Text style={[styles.segmentText, activeTab === 'custom' && styles.segmentTextSelected]}>
            Add Custom Trades
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.segment, activeTab === 'portfolio' && styles.segmentSelected]}
          onPress={() => {
            setActiveTab('portfolio');
            fetchAnalyzerData();
          }}
        >
          <Text style={[styles.segmentText, activeTab === 'portfolio' && styles.segmentTextSelected]}>
            Portfolio Sold Trades
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Custom Trade Input Section */}
        {activeTab === 'custom' && (
          <View style={styles.formSection}>
            <View style={styles.formHeader}>
              <Text style={styles.formSectionTitle}>Trade Inputs</Text>
              <TouchableOpacity activeOpacity={0.7} style={styles.addBtn} onPress={addTradeRow}>
                <IconSymbol name="plus.circle.fill" size={18} color={COLOR_ACCENT_LIME} />
                <Text style={styles.addBtnText}>Add Trade</Text>
              </TouchableOpacity>
            </View>

            {tradeRows.map((row, idx) => (
              <View key={row.id} style={styles.tradeInputCard}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowNumber}>Trade #{idx + 1}</Text>
                  {tradeRows.length > 1 && (
                    <TouchableOpacity activeOpacity={0.7} onPress={() => removeTradeRow(row.id)}>
                      <IconSymbol name="trash" size={16} color={COLOR_NEGATIVE} />
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
                      placeholderTextColor={COLOR_TEXT_TERTIARY}
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
                      placeholderTextColor={COLOR_TEXT_TERTIARY}
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
                      placeholderTextColor={COLOR_TEXT_TERTIARY}
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
                      placeholderTextColor={COLOR_TEXT_TERTIARY}
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
                      placeholderTextColor={COLOR_TEXT_TERTIARY}
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
                      placeholderTextColor={COLOR_TEXT_TERTIARY}
                      value={row.sell_date}
                      onChangeText={(val) => updateTradeField(row.id, 'sell_date', val)}
                    />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity activeOpacity={0.85} style={styles.scanBtn} onPress={handleScanImpulse} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color={COLOR_CANVAS} />
              ) : (
                <>
                  <IconSymbol name="bolt.fill" size={18} color={COLOR_CANVAS} />
                  <Text style={styles.scanBtnText}>Scan & Analyze Impulse</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Results Section */}
        {showFullAreaLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLOR_ACCENT_LIME} />
            <Text style={styles.loadingText}>Analyzing Trades Against Historical Data...</Text>
          </View>
        ) : showError ? (
          <TouchableOpacity activeOpacity={0.85} style={styles.errorBox} onPress={handleRetry}>
            <Text style={styles.errorText}>{errorCopy}</Text>
            <Text style={styles.retryText}>Tap to Retry</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.resultsSection}>
            <View style={[styles.summaryCard, totalCost > 0 ? styles.summaryCardNegative : styles.summaryCardNeutral]}>
              <Text style={[styles.summaryLabel, totalCost > 0 ? styles.summaryLabelNegative : styles.summaryLabelNeutral]}>
                Total Avoidable Impulse Cost
              </Text>
              <Text style={[styles.summaryValue, totalCost > 0 ? styles.summaryValueNegative : styles.summaryValueNeutral]}>
                {totalCost > 0 ? '-' : ''}₹{formatRupees(totalCost)}
              </Text>
              <Text style={styles.summaryCount}>
                {impulseTrades.length} trade{impulseTrades.length === 1 ? '' : '(s)'} analyzed
              </Text>
              <Text style={styles.summaryDesc}>
                Difference between actual execution and data-backed technical score timing.
              </Text>
            </View>

            {impulseTrades.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol name="checkmark.shield.fill" size={44} color={COLOR_POSITIVE} />
                <Text style={styles.emptyTitle}>No Impulse Losses Flagged</Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'custom'
                    ? 'Enter trade details above and tap "Scan & Analyze Impulse" to evaluate.'
                    : 'Your recorded sold trades aligned well with technical scoring.'}
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                <Text style={styles.listTitle}>Analyzed Trade Breakdown</Text>
                {impulseTrades.map((trade, i) => {
                  const comparisonAvailable = hasTimingComparison(trade);
                  return (
                    <View key={trade.id || String(i)} style={styles.tradeCard}>
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={styles.symbol}>{trade.stock_symbol}</Text>
                          <Text style={styles.qtyText}>{trade.quantity} Shares</Text>
                        </View>
                        <View style={styles.costBadge}>
                          <Text style={styles.costBadgeLabel}>Avoidable Cost</Text>
                          <Text style={styles.rupeeCost}>
                            {trade.rupee_cost > 0 ? '-' : ''}₹{formatRupees(trade.rupee_cost)}
                          </Text>
                        </View>
                      </View>

                      {comparisonAvailable ? (
                        <View style={styles.comparisonRow}>
                          <View style={styles.side}>
                            <Text style={styles.sideLabel}>Your Execution</Text>
                            <Text style={styles.sideDate}>
                              {trade.actual.buy_date} → {trade.actual.sell_date}
                            </Text>
                            <Text style={styles.sidePrice}>
                              ₹{trade.actual.buy_price} → ₹{trade.actual.sell_price}
                            </Text>
                            <Text style={trade.actual.profit >= 0 ? styles.outcomeProfit : styles.outcomeLoss}>
                              {trade.actual.profit >= 0 ? '+₹' : '-₹'}
                              {formatRupees(Math.abs(trade.actual.profit))}
                            </Text>
                          </View>
                          <View style={styles.divider} />
                          <View style={styles.side}>
                            <Text style={[styles.sideLabel, { color: COLOR_ACCENT_LIME }]}>Data-Backed Timing</Text>
                            <Text style={styles.sideDate}>
                              {trade.counterfactual.buy_date} → {trade.counterfactual.sell_date}
                            </Text>
                            <Text style={styles.sidePrice}>
                              ₹{trade.counterfactual.buy_price} → ₹{trade.counterfactual.sell_price}
                            </Text>
                            <Text
                              style={trade.counterfactual.profit >= 0 ? styles.outcomeProfit : styles.outcomeLoss}
                            >
                              {trade.counterfactual.profit >= 0 ? '+₹' : '-₹'}
                              {formatRupees(Math.abs(trade.counterfactual.profit))}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.noComparisonBox}>
                          <Text style={styles.noComparisonText}>
                            Timing comparison unavailable for this trade.
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_CANVAS },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  headerTitle: { fontSize: 30, fontWeight: '700', color: COLOR_TEXT_PRIMARY },
  headerSubtitle: { fontSize: 13, color: COLOR_TEXT_SECONDARY, marginTop: 4 },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  segmentSelected: {
    backgroundColor: COLOR_ACCENT_LIME,
  },
  segmentText: {
    color: COLOR_TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextSelected: {
    color: COLOR_CANVAS,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  formSection: { marginBottom: 20 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  formSectionTitle: { fontSize: 18, fontWeight: '700', color: COLOR_TEXT_PRIMARY },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLOR_SURFACE_SECONDARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addBtnText: { color: COLOR_ACCENT_LIME, fontSize: 13, fontWeight: '600' },
  tradeInputCard: {
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLOR_DIVIDER,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rowNumber: { fontSize: 12, fontWeight: '600', color: COLOR_ACCENT_LIME, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 11, fontWeight: '600', color: COLOR_TEXT_TERTIARY, marginBottom: 4, textTransform: 'uppercase' },
  textInput: {
    backgroundColor: COLOR_SURFACE_SECONDARY,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: COLOR_TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: COLOR_DIVIDER,
  },
  scanBtn: {
    backgroundColor: COLOR_ACCENT_LIME,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  scanBtnText: { color: COLOR_CANVAS, fontSize: 15, fontWeight: '700' },
  resultsSection: { marginTop: 8 },
  summaryCard: {
    borderWidth: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryCardNegative: {
    backgroundColor: '#1A0F0F',
    borderColor: '#3A1A1A',
  },
  summaryCardNeutral: {
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderColor: COLOR_DIVIDER,
  },
  summaryLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  summaryLabelNegative: { color: COLOR_NEGATIVE },
  summaryLabelNeutral: { color: COLOR_TEXT_SECONDARY },
  summaryValue: { fontSize: 36, fontWeight: '700', marginVertical: 6, fontVariant: ['tabular-nums'] },
  summaryValueNegative: { color: COLOR_NEGATIVE },
  summaryValueNeutral: { color: COLOR_TEXT_PRIMARY },
  summaryCount: { color: COLOR_TEXT_SECONDARY, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  summaryDesc: { color: COLOR_TEXT_TERTIARY, fontSize: 12, textAlign: 'center', lineHeight: 17 },
  emptyState: {
    alignItems: 'center',
    marginTop: 24,
    padding: 24,
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLOR_DIVIDER,
  },
  emptyTitle: { color: COLOR_TEXT_PRIMARY, fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptyText: { marginTop: 6, fontSize: 13, color: COLOR_TEXT_SECONDARY, textAlign: 'center', lineHeight: 18 },
  listContainer: { paddingBottom: 24 },
  listTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: COLOR_TEXT_PRIMARY },
  tradeCard: {
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLOR_DIVIDER,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  symbol: { fontSize: 17, fontWeight: '700', color: COLOR_TEXT_PRIMARY },
  qtyText: { fontSize: 12, color: COLOR_TEXT_TERTIARY, marginTop: 2 },
  costBadge: { alignItems: 'flex-end' },
  costBadgeLabel: { fontSize: 10, color: COLOR_TEXT_TERTIARY, textTransform: 'uppercase' },
  rupeeCost: { fontSize: 15, fontWeight: '700', color: COLOR_NEGATIVE, marginTop: 2 },
  comparisonRow: {
    flexDirection: 'row',
    backgroundColor: COLOR_SURFACE_SECONDARY,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLOR_DIVIDER,
  },
  side: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: COLOR_DIVIDER_STRONG, marginHorizontal: 8 },
  sideLabel: { fontSize: 11, color: COLOR_TEXT_TERTIARY, marginBottom: 4, textTransform: 'uppercase', fontWeight: '700' },
  sideDate: { fontSize: 11, color: COLOR_TEXT_TERTIARY, marginBottom: 2 },
  sidePrice: { fontSize: 12, color: COLOR_TEXT_SECONDARY, marginBottom: 4 },
  outcomeLoss: { fontSize: 14, fontWeight: '700', color: COLOR_NEGATIVE },
  outcomeProfit: { fontSize: 14, fontWeight: '700', color: COLOR_POSITIVE },
  noComparisonBox: {
    backgroundColor: COLOR_SURFACE_SECONDARY,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLOR_DIVIDER,
  },
  noComparisonText: { fontSize: 12.5, color: COLOR_TEXT_TERTIARY, textAlign: 'center' },
  loadingBox: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: COLOR_TEXT_SECONDARY, marginTop: 12, fontSize: 13, textAlign: 'center' },
  errorBox: {
    padding: 20,
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderRadius: 14,
    alignItems: 'center',
    marginVertical: 12,
  },
  errorText: {
    color: COLOR_NEGATIVE,
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  retryText: {
    color: COLOR_ACCENT_LIME,
    fontSize: 14,
    fontWeight: '600',
  },
});
