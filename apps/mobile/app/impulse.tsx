import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAnalyzerStore, CustomTradeInput, ImpulseTrade } from '../src/store/analyzerStore';
import { IconSymbol } from '../components/ui/IconSymbol';
import { useThemeTokens } from '../src/store/themeStore';
import type { ThemeTokens } from '../src/theme/tokens';
import { withAlphaHex as withAlpha } from '../src/theme/color';

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

const SKELETON_TRADE_ROWS = [0, 1, 2];

export default function ImpulseScreen() {
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { impulseTrades, totalCost, isLoading, error, fetchAnalyzerData, analyzeCustomTrades } = useAnalyzerStore();
  const [activeTab, setActiveTab] = useState<'custom' | 'portfolio'>('custom');
  const [formError, setFormError] = useState<string | null>(null);

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
      setFormError('You need at least one trade row to analyze.');
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
    setFormError(null);
    const formattedTrades: CustomTradeInput[] = [];

    for (let i = 0; i < tradeRows.length; i++) {
      const row = tradeRows[i];
      if (!row.stock_symbol.trim()) {
        setFormError(`Please enter a stock symbol for trade #${i + 1}`);
        return;
      }
      const buyPrice = parseFloat(row.buy_price);
      const sellPrice = parseFloat(row.sell_price);
      const qty = parseInt(row.quantity, 10);

      if (isNaN(buyPrice) || buyPrice <= 0) {
        setFormError(`Please enter a valid buy price for ${row.stock_symbol}`);
        return;
      }
      if (isNaN(sellPrice) || sellPrice <= 0) {
        setFormError(`Please enter a valid sell price for ${row.stock_symbol}`);
        return;
      }
      if (isNaN(qty) || qty <= 0) {
        setFormError(`Please enter a valid quantity for ${row.stock_symbol}`);
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
                <IconSymbol name="plus.circle.fill" size={18} color={tokens.accent} />
                <Text style={styles.addBtnText}>Add Trade</Text>
              </TouchableOpacity>
            </View>

            {formError && <Text style={styles.formError}>{formError}</Text>}

            {tradeRows.map((row, idx) => (
              <View key={row.id} style={styles.tradeInputCard}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowNumber}>Trade #{idx + 1}</Text>
                  {tradeRows.length > 1 && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => removeTradeRow(row.id)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessibilityRole="button"
                      accessibilityLabel="Remove trade row"
                    >
                      <IconSymbol name="trash" size={18} color={tokens.negative} />
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
                      placeholderTextColor={tokens.textTertiary}
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
                      placeholderTextColor={tokens.textTertiary}
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
                      placeholderTextColor={tokens.textTertiary}
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
                      placeholderTextColor={tokens.textTertiary}
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
                      placeholderTextColor={tokens.textTertiary}
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
                      placeholderTextColor={tokens.textTertiary}
                      value={row.sell_date}
                      onChangeText={(val) => updateTradeField(row.id, 'sell_date', val)}
                    />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity activeOpacity={0.85} style={styles.scanBtn} onPress={handleScanImpulse} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color={tokens.onAccent} />
              ) : (
                <>
                  <IconSymbol name="bolt.fill" size={18} color={tokens.onAccent} />
                  <Text style={styles.scanBtnText}>Scan & Analyze Impulse</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Results Section */}
        {showFullAreaLoading ? (
          <View style={styles.listContainer}>
            {SKELETON_TRADE_ROWS.map((i) => (
              <View key={i} style={styles.tradeCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <View style={styles.skeletonSymbol} />
                    <View style={styles.skeletonQty} />
                  </View>
                  <View style={styles.skeletonCostBadge} />
                </View>
                <View style={styles.skeletonComparisonRow} />
              </View>
            ))}
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
                <IconSymbol name="checkmark.shield.fill" size={44} color={tokens.positive} />
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
                            <Text style={[styles.sideLabel, { color: tokens.accent }]}>Data-Backed Timing</Text>
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


function createStyles(tokens: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.canvas },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
    headerTitle: { fontSize: 30, fontWeight: '700', color: tokens.textPrimary },
    headerSubtitle: { fontSize: 13, color: tokens.textSecondary, marginTop: 4 },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 12,
      padding: 4,
      marginHorizontal: 20,
      marginBottom: 12,
    },
    segment: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: 'transparent',
    },
    segmentSelected: {
      backgroundColor: tokens.accent,
    },
    segmentText: {
      color: tokens.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    segmentTextSelected: {
      color: tokens.onAccent,
    },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    formSection: { marginBottom: 20 },
    formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    formSectionTitle: { fontSize: 18, fontWeight: '700', color: tokens.textPrimary },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: tokens.secondarySurface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    addBtnText: { color: tokens.accent, fontSize: 13, fontWeight: '600' },
    tradeInputCard: {
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: tokens.dividerSubtle,
    },
    rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    rowNumber: { fontSize: 12, fontWeight: '600', color: tokens.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
    inputGroup: { flex: 1 },
    inputLabel: { fontSize: 11, fontWeight: '600', color: tokens.textTertiary, marginBottom: 4, textTransform: 'uppercase' },
    textInput: {
      backgroundColor: tokens.secondarySurface,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 15,
      color: tokens.textPrimary,
      borderWidth: 1,
      borderColor: tokens.dividerSubtle,
    },
    scanBtn: {
      backgroundColor: tokens.accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
      marginTop: 4,
    },
    scanBtnText: { color: tokens.onAccent, fontSize: 15, fontWeight: '700' },
    resultsSection: { marginTop: 8 },
    summaryCard: {
      borderWidth: 1,
      padding: 20,
      borderRadius: 16,
      alignItems: 'center',
      marginBottom: 20,
    },
    summaryCardNegative: {
      backgroundColor: withAlpha(tokens.negative, '22'),
      borderColor: withAlpha(tokens.negative, '4D'),
    },
    summaryCardNeutral: {
      backgroundColor: tokens.elevatedSurface,
      borderColor: tokens.dividerSubtle,
    },
    summaryLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    summaryLabelNegative: { color: tokens.negative },
    summaryLabelNeutral: { color: tokens.textSecondary },
    summaryValue: { fontSize: 46, fontWeight: '700', marginVertical: 8, fontVariant: ['tabular-nums'] },
    summaryValueNegative: { color: tokens.negative },
    summaryValueNeutral: { color: tokens.textPrimary },
    summaryCount: { color: tokens.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
    summaryDesc: { color: tokens.textTertiary, fontSize: 12, textAlign: 'center', lineHeight: 17 },
    emptyState: {
      alignItems: 'center',
      marginTop: 24,
      padding: 24,
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: tokens.dividerSubtle,
    },
    emptyTitle: { color: tokens.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 12 },
    emptyText: { marginTop: 8, fontSize: 13, color: tokens.textSecondary, textAlign: 'center', lineHeight: 18 },
    listContainer: { paddingBottom: 24 },
    listTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: tokens.textPrimary },
    tradeCard: {
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: tokens.dividerSubtle,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    symbol: { fontSize: 17, fontWeight: '700', color: tokens.textPrimary },
    qtyText: { fontSize: 12, color: tokens.textTertiary, marginTop: 2 },
    costBadge: { alignItems: 'flex-end' },
    costBadgeLabel: { fontSize: 10, color: tokens.textTertiary, textTransform: 'uppercase' },
    rupeeCost: { fontSize: 15, fontWeight: '700', color: tokens.negative, marginTop: 2 },
    comparisonRow: {
      flexDirection: 'row',
      backgroundColor: tokens.secondarySurface,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: tokens.dividerSubtle,
    },
    side: { flex: 1, alignItems: 'center' },
    divider: { width: 1, backgroundColor: tokens.dividerStrong, marginHorizontal: 8 },
    sideLabel: { fontSize: 11, color: tokens.textTertiary, marginBottom: 4, textTransform: 'uppercase', fontWeight: '700' },
    sideDate: { fontSize: 11, color: tokens.textTertiary, marginBottom: 2 },
    sidePrice: { fontSize: 12, color: tokens.textSecondary, marginBottom: 4 },
    outcomeLoss: { fontSize: 15, fontWeight: '700', color: tokens.negative },
    outcomeProfit: { fontSize: 15, fontWeight: '700', color: tokens.positive },
    noComparisonBox: {
      backgroundColor: tokens.secondarySurface,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: tokens.dividerSubtle,
    },
    noComparisonText: { fontSize: 13, color: tokens.textTertiary, textAlign: 'center' },
    skeletonSymbol: { width: 70, height: 17, borderRadius: 4, backgroundColor: tokens.secondarySurface },
    skeletonQty: { width: 50, height: 12, borderRadius: 4, backgroundColor: tokens.secondarySurface, marginTop: 6 },
    skeletonCostBadge: { width: 80, height: 30, borderRadius: 6, backgroundColor: tokens.secondarySurface },
    skeletonComparisonRow: { height: 90, borderRadius: 10, backgroundColor: tokens.secondarySurface },
    formError: {
      backgroundColor: withAlpha(tokens.negative, '22'),
      color: tokens.negative,
      padding: 12,
      borderRadius: 8,
      marginBottom: 12,
      fontSize: 13,
    },
    errorBox: {
      padding: 20,
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 14,
      alignItems: 'center',
      marginVertical: 12,
    },
    errorText: {
      color: tokens.negative,
      fontSize: 15,
      marginBottom: 8,
      textAlign: 'center',
    },
    retryText: {
      color: tokens.accent,
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
