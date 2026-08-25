import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  usePortfolioStore,
  PortfolioHolding,
  HoldingPeriod,
} from '@/src/store/portfolioStore';
import { searchStocks } from '@/src/api/stockService';
import { IconSymbol } from '@/components/ui/IconSymbol';

// Design System — Mobile Redesign tokens (spec/ui.md → "Design System — Mobile Redesign")
// Duplicated locally (same values as app/(tabs)/index.tsx and app/stock/[symbol].tsx) rather
// than importing from those screens, to keep this a self-contained single-file redesign per
// the build instructions.
const COLOR_CANVAS = '#090B0A';
const COLOR_SURFACE_ELEVATED = '#131613';
const COLOR_SURFACE_SECONDARY = '#191D19';
const COLOR_DIVIDER = '#1A1E1A';
const COLOR_TEXT_PRIMARY = '#F5F7F2';
const COLOR_TEXT_SECONDARY = '#A4AAA3';
const COLOR_TEXT_TERTIARY = '#6F766F';
const COLOR_ACCENT_LIME = '#C7FF3D';
const COLOR_POSITIVE = '#B8F35A';
const COLOR_NEGATIVE = '#FF6B67';
const COLOR_WARNING = '#FFB84D';

type Band = 'green' | 'amber' | 'red';

// Standing Platform Rule 2 / spec/ui.md Cross-Cutting UI Rules: Red <40, Amber 41-65, Green 66-100
function getBand(score: number): Band {
  if (score < 40) return 'red';
  if (score <= 65) return 'amber';
  return 'green';
}

const BAND_COLOR: Record<Band, string> = {
  green: COLOR_ACCENT_LIME,
  amber: COLOR_WARNING,
  red: COLOR_NEGATIVE,
};

function withAlpha(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}

function formatRupees(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

const SKELETON_HOLDING_ROWS = [0, 1, 2];

export default function PortfolioScreen() {
  const router = useRouter();
  const {
    holdings,
    fetchHoldings,
    loading,
    error,
    addHolding,
    updateHolding,
    deleteHolding,
    sellHolding,
  } = usePortfolioStore();

  const [filterTab, setFilterTab] = useState<'all' | 'held' | 'sold'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Add Stock Modal State
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [addSymbol, setAddSymbol] = useState('');
  const [symbolSuggestions, setSymbolSuggestions] = useState<Array<{ symbol: string; overall_score: number }>>([]);
  const [isSearchingSymbol, setIsSearchingSymbol] = useState(false);
  const [addQty, setAddQty] = useState('');
  const [addAvgPrice, setAddAvgPrice] = useState('');
  const [addDate, setAddDate] = useState('');
  const [addPeriod, setAddPeriod] = useState<HoldingPeriod>('medium');
  const [addIsSold, setAddIsSold] = useState(false);
  const [addSoldPrice, setAddSoldPrice] = useState('');
  const [addSoldDate, setAddSoldDate] = useState('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Sell Stock Modal State
  const [isSellModalVisible, setSellModalVisible] = useState(false);
  const [selectedHoldingForSell, setSelectedHoldingForSell] = useState<PortfolioHolding | null>(null);
  const [sellQty, setSellQty] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingSell, setIsSubmittingSell] = useState(false);
  const [sellError, setSellError] = useState<string | null>(null);

  // Edit Stock Modal State
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [selectedHoldingForEdit, setSelectedHoldingForEdit] = useState<PortfolioHolding | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editAvgPrice, setEditAvgPrice] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPeriod, setEditPeriod] = useState<HoldingPeriod>('medium');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    await fetchHoldings();
    setRefreshing(false);
  }, [fetchHoldings]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered Holdings
  const displayedHoldings = useMemo(() => {
    if (filterTab === 'held') return holdings.filter((h) => h.status === 'held');
    if (filterTab === 'sold') return holdings.filter((h) => h.status === 'sold');
    return holdings;
  }, [holdings, filterTab]);

  const heldCount = useMemo(() => holdings.filter((h) => h.status === 'held').length, [holdings]);
  const soldCount = useMemo(() => holdings.filter((h) => h.status === 'sold').length, [holdings]);

  // Portfolio summary — real aggregates only (spec/ui.md "Screen: Portfolio", item 2): no
  // sparkline/trend chart and no "today's change" stat, since neither has backing data.
  const investedTotal = useMemo(
    () =>
      holdings
        .filter((h) => h.status === 'held')
        .reduce((sum, h) => sum + h.quantity * h.avg_price, 0),
    [holdings]
  );

  const realizedPnl = useMemo(
    () =>
      holdings
        .filter((h) => h.status === 'sold')
        .reduce((sum, h) => {
          const soldQty = h.sold_quantity ?? h.quantity;
          const soldPrice = h.sold_price ?? 0;
          return sum + (soldPrice - h.avg_price) * soldQty;
        }, 0),
    [holdings]
  );

  // Symbol Autocomplete Search
  const handleSymbolSearch = async (text: string) => {
    setAddSymbol(text.toUpperCase());
    if (text.trim().length >= 2) {
      setIsSearchingSymbol(true);
      try {
        const results = await searchStocks(text, 'medium');
        setSymbolSuggestions(results);
      } catch {
        setSymbolSuggestions([]);
      } finally {
        setIsSearchingSymbol(false);
      }
    } else {
      setSymbolSuggestions([]);
    }
  };

  // Helper for quick date chips
  const setQuickDate = (type: 'today' | '1w' | '1m' | '3m' | '6m' | '1y', target: 'purchase' | 'sold' | 'sellModal' | 'edit') => {
    const d = new Date();
    if (type === '1w') d.setDate(d.getDate() - 7);
    else if (type === '1m') d.setMonth(d.getMonth() - 1);
    else if (type === '3m') d.setMonth(d.getMonth() - 3);
    else if (type === '6m') d.setMonth(d.getMonth() - 6);
    else if (type === '1y') d.setFullYear(d.getFullYear() - 1);

    const formatted = d.toISOString().split('T')[0];
    if (target === 'purchase') setAddDate(formatted);
    else if (target === 'sold') setAddSoldDate(formatted);
    else if (target === 'sellModal') setSellDate(formatted);
    else if (target === 'edit') setEditDate(formatted);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setAddSymbol('');
    setSymbolSuggestions([]);
    setAddQty('');
    setAddAvgPrice('');
    setAddDate(new Date().toISOString().split('T')[0]);
    setAddPeriod('medium');
    setAddIsSold(false);
    setAddSoldPrice('');
    setAddSoldDate(new Date().toISOString().split('T')[0]);
    setAddError(null);
    setAddModalVisible(true);
  };

  // Submit Add Holding
  const handleSaveHolding = async () => {
    if (!addSymbol.trim()) {
      setAddError('Please enter or select a stock symbol.');
      return;
    }
    const qtyNum = parseInt(addQty, 10);
    if (!qtyNum || qtyNum <= 0) {
      setAddError('Quantity must be greater than 0.');
      return;
    }
    const priceNum = parseFloat(addAvgPrice);
    if (!priceNum || priceNum <= 0) {
      setAddError('Average buy price must be greater than 0.');
      return;
    }

    let soldPriceNum: number | undefined;
    if (addIsSold) {
      soldPriceNum = parseFloat(addSoldPrice);
      if (!soldPriceNum || soldPriceNum < 0) {
        setAddError('Please enter a valid selling price.');
        return;
      }
    }

    setAddError(null);
    setIsSubmittingAdd(true);
    try {
      await addHolding({
        stock_symbol: addSymbol.trim().toUpperCase(),
        quantity: qtyNum,
        avg_price: priceNum,
        purchase_date: addDate.trim() || new Date().toISOString().split('T')[0],
        intended_holding_period: addPeriod,
        status: addIsSold ? 'sold' : 'held',
        sold_quantity: addIsSold ? qtyNum : null,
        sold_price: addIsSold ? soldPriceNum : null,
        sold_date: addIsSold ? (addSoldDate.trim() || new Date().toISOString().split('T')[0]) : null,
      });
      setAddModalVisible(false);
    } catch (e: any) {
      setAddError(e.message || 'Failed to save position.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open Sell Modal
  const handleOpenSellModal = (item: PortfolioHolding) => {
    setSelectedHoldingForSell(item);
    setSellQty(item.quantity.toString());
    setSellPrice(item.avg_price.toString());
    setSellDate(new Date().toISOString().split('T')[0]);
    setSellError(null);
    setSellModalVisible(true);
  };

  // Submit Sell Holding
  const handleConfirmSell = async () => {
    if (!selectedHoldingForSell) return;

    const qtyNum = parseInt(sellQty, 10);
    if (!qtyNum || qtyNum <= 0) {
      setSellError('Sell quantity must be greater than 0.');
      return;
    }
    if (qtyNum > selectedHoldingForSell.quantity) {
      setSellError(`Cannot sell more than held quantity (${selectedHoldingForSell.quantity}).`);
      return;
    }
    const priceNum = parseFloat(sellPrice);
    if (!priceNum || priceNum < 0) {
      setSellError('Selling price must be valid.');
      return;
    }

    setSellError(null);
    setIsSubmittingSell(true);
    try {
      await sellHolding(selectedHoldingForSell.id, {
        sold_quantity: qtyNum,
        sold_price: priceNum,
        sold_date: sellDate.trim() || new Date().toISOString().split('T')[0],
      });
      setSellModalVisible(false);
    } catch (e: any) {
      setSellError(e.message || 'Failed to record sale.');
    } finally {
      setIsSubmittingSell(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: PortfolioHolding) => {
    setSelectedHoldingForEdit(item);
    setEditQty(item.quantity.toString());
    setEditAvgPrice(item.avg_price.toString());
    setEditDate(item.purchase_date || '');
    setEditPeriod(item.intended_holding_period);
    setEditError(null);
    setEditModalVisible(true);
  };

  // Submit Edit Holding
  const handleSaveEdit = async () => {
    if (!selectedHoldingForEdit) return;

    const qtyNum = parseInt(editQty, 10);
    if (!qtyNum || qtyNum <= 0) {
      setEditError('Quantity must be greater than 0.');
      return;
    }
    const priceNum = parseFloat(editAvgPrice);
    if (!priceNum || priceNum <= 0) {
      setEditError('Average price must be greater than 0.');
      return;
    }

    setEditError(null);
    setIsSubmittingEdit(true);
    try {
      await updateHolding(selectedHoldingForEdit.id, {
        quantity: qtyNum,
        avg_price: priceNum,
        purchase_date: editDate.trim() || selectedHoldingForEdit.purchase_date,
        intended_holding_period: editPeriod,
      });
      setEditModalVisible(false);
    } catch (e: any) {
      setEditError(e.message || 'Failed to update position.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete Holding with Confirmation
  const handleDelete = (id: string, symbol: string) => {
    Alert.alert(
      'Delete Holding',
      `Are you sure you want to delete ${symbol}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHolding(id);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete holding.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: PortfolioHolding }) => {
    const isHeld = item.status === 'held';
    const totalInvested = item.quantity * item.avg_price;
    const soldQty = item.sold_quantity ?? item.quantity;
    const soldTotal = !isHeld && item.sold_price != null ? soldQty * item.sold_price : null;
    const pnl = !isHeld && soldTotal !== null ? soldTotal - soldQty * item.avg_price : null;
    const pnlPct = !isHeld && pnl !== null && item.avg_price > 0 ? (pnl / (soldQty * item.avg_price)) * 100 : null;

    return (
      <View style={styles.holdingCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.ticker}>{item.stock_symbol}</Text>
          <View style={[styles.statusPill, isHeld ? styles.statusPillHeld : styles.statusPillSold]}>
            <Text style={[styles.statusPillText, isHeld ? styles.statusPillTextHeld : styles.statusPillTextSold]}>
              {isHeld ? 'HELD' : 'SOLD'}
            </Text>
          </View>
        </View>

        {isHeld ? (
          <View style={styles.metricsRow}>
            <Text style={styles.metricsLine}>
              <Text style={styles.metricLabelInline}>Qty </Text>
              <Text style={styles.metricValueInline}>{item.quantity}</Text>
              <Text style={styles.metricLabelInline}>  ·  Avg </Text>
              <Text style={styles.metricValueInline}>{formatRupees(item.avg_price)}</Text>
              <Text style={styles.metricLabelInline}>  ·  Invested </Text>
              <Text style={styles.metricValueInline}>{formatRupees(totalInvested)}</Text>
            </Text>
          </View>
        ) : (
          <View style={styles.metricsRow}>
            <Text style={styles.metricsLine}>
              <Text style={styles.metricLabelInline}>Sold Qty </Text>
              <Text style={styles.metricValueInline}>{soldQty}</Text>
              <Text style={styles.metricLabelInline}>  ·  Price </Text>
              <Text style={styles.metricValueInline}>
                {item.sold_price != null ? formatRupees(item.sold_price) : '—'}
              </Text>
              <Text style={styles.metricLabelInline}>  ·  P&L </Text>
              {pnl !== null ? (
                <Text style={[styles.metricValueInline, { color: pnl >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE }]}>
                  {pnl >= 0 ? '+' : ''}
                  {formatRupees(pnl)} ({pnlPct !== null ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%` : '0%'})
                </Text>
              ) : (
                <Text style={styles.metricValueInline}>—</Text>
              )}
            </Text>
          </View>
        )}

        <View style={styles.cardMetaRow}>
          <View style={styles.periodTag}>
            <Text style={styles.periodTagText}>
              {(item.intended_holding_period || 'medium').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.dateRow}>
          <Text style={styles.dateText}>
            Bought: {item.purchase_date || 'Today'}{!isHeld && item.sold_date ? ` • Sold: ${item.sold_date}` : ''}
          </Text>
        </View>

        <View style={styles.cardActions}>
          {isHeld && (
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.sellBtn, pressed && styles.actionBtnPressed]}
              onPress={() => handleOpenSellModal(item)}
            >
              <Text style={styles.sellBtnText}>Mark as Sold</Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={() => handleOpenEditModal(item)}
          >
            <Text style={styles.actionBtnText}>Edit</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.deleteBtn, pressed && styles.actionBtnPressed]}
            onPress={() => handleDelete(item.id, item.stock_symbol)}
          >
            <Text style={styles.deleteBtnText}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const showInitialSkeleton = loading && holdings.length === 0;
  const showFetchError = !showInitialSkeleton && !!error && holdings.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.topHeader}>
        <Text style={styles.pageTitle}>Portfolio</Text>
        <Text style={styles.pageSubtitle}>
          {holdings.length} {holdings.length === 1 ? 'Position' : 'Positions'}
        </Text>
      </View>

      {/* Portfolio summary — via typography, not cards (spec/ui.md item 2) */}
      <View style={styles.summaryBlock}>
        <Text style={styles.summaryLabel}>Total Invested</Text>
        <Text style={styles.investedValue}>{formatRupees(investedTotal)}</Text>
        <View style={styles.pnlRow}>
          <Text style={styles.pnlLabel}>Realized P&L</Text>
          <Text style={[styles.pnlValue, { color: realizedPnl >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE }]}>
            {realizedPnl >= 0 ? '+' : ''}
            {formatRupees(realizedPnl)}
          </Text>
        </View>
      </View>

      {/* "View portfolio health →" link-out — no new fetch, pure navigation (spec/ui.md item 3) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View portfolio health"
        onPress={() => router.push('/(tabs)/health')}
        style={({ pressed }) => [styles.healthLinkRow, pressed && styles.healthLinkRowPressed]}
      >
        <Text style={styles.healthLinkText}>View portfolio health</Text>
        <IconSymbol name="chevron.right" size={16} color={COLOR_TEXT_SECONDARY} />
      </Pressable>

      {/* Filter row */}
      <View style={styles.segmentedControl}>
        <Pressable
          onPress={() => setFilterTab('all')}
          style={[styles.segment, filterTab === 'all' && styles.segmentSelected]}
        >
          <Text style={[styles.segmentText, filterTab === 'all' && styles.segmentTextSelected]}>
            All ({holdings.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilterTab('held')}
          style={[styles.segment, filterTab === 'held' && styles.segmentSelected]}
        >
          <Text style={[styles.segmentText, filterTab === 'held' && styles.segmentTextSelected]}>
            Held ({heldCount})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilterTab('sold')}
          style={[styles.segment, filterTab === 'sold' && styles.segmentSelected]}
        >
          <Text style={[styles.segmentText, filterTab === 'sold' && styles.segmentTextSelected]}>
            Sold ({soldCount})
          </Text>
        </Pressable>
      </View>

      {/* Holdings List / Skeleton / Error / Empty */}
      {showInitialSkeleton ? (
        <ScrollView contentContainerStyle={styles.list}>
          {SKELETON_HOLDING_ROWS.map((i) => (
            <View key={i} style={styles.holdingCard}>
              <View style={styles.cardHeader}>
                <View style={styles.skeletonTicker} />
                <View style={styles.skeletonPill} />
              </View>
              <View style={styles.skeletonMetricsLine} />
              <View style={styles.skeletonMetaRow}>
                <View style={styles.skeletonTagSmall} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : showFetchError ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={COLOR_ACCENT_LIME} />}
        >
          <Pressable style={styles.errorBox} onPress={() => loadData()}>
            <Text style={styles.errorText}>Couldn't load your positions. Please try again.</Text>
            <Text style={styles.retryText}>Tap to Retry</Text>
          </Pressable>
        </ScrollView>
      ) : displayedHoldings.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={COLOR_ACCENT_LIME} />}
        >
          <Text style={styles.emptyTitle}>
            {filterTab === 'sold' ? 'No sold positions yet.' : 'No portfolio positions yet.'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {filterTab === 'sold'
              ? 'When you sell positions, they will appear here with realized P&L tracking.'
              : 'Add your stocks to unlock real-time Portfolio Health analysis.'}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={displayedHoldings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={COLOR_ACCENT_LIME} />}
        />
      )}

      {/* Floating Add Stock Button */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={handleOpenAddModal}
      >
        <Text style={styles.fabText}>+ Add Stock</Text>
      </Pressable>

      {/* ===================== ADD STOCK MODAL ===================== */}
      <Modal visible={isAddModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Stock Position</Text>
              <Pressable
                onPress={() => setAddModalVisible(false)}
                style={({ pressed }) => pressed && styles.pressedOpacity}
              >
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
              {addError ? <Text style={styles.modalError}>{addError}</Text> : null}

              {/* Stock Symbol Autocomplete */}
              <Text style={styles.inputLabel}>Stock Symbol / Company *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. RELIANCE, TCS, INFY, AYMSYNTEX"
                placeholderTextColor={COLOR_TEXT_TERTIARY}
                value={addSymbol}
                onChangeText={handleSymbolSearch}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {isSearchingSymbol && <ActivityIndicator size="small" color={COLOR_ACCENT_LIME} style={{ alignSelf: 'flex-start', marginVertical: 4 }} />}

              {symbolSuggestions.length > 0 && (
                <View style={styles.suggestionBox}>
                  {symbolSuggestions.map((item) => {
                    const band = getBand(item.overall_score);
                    return (
                      <Pressable
                        key={item.symbol}
                        style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressedOpacity]}
                        onPress={() => {
                          setAddSymbol(item.symbol);
                          setSymbolSuggestions([]);
                        }}
                      >
                        <Text style={styles.suggestionSymbol}>{item.symbol}</Text>
                        <Text style={[styles.suggestionScore, { color: BAND_COLOR[band] }]}>
                          Score: {Math.round(item.overall_score)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Quantity */}
              <Text style={styles.inputLabel}>Quantity *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 10"
                placeholderTextColor={COLOR_TEXT_TERTIARY}
                keyboardType="numeric"
                value={addQty}
                onChangeText={setAddQty}
              />

              {/* Avg Price */}
              <Text style={styles.inputLabel}>Average Buy Price (₹) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 254.00"
                placeholderTextColor={COLOR_TEXT_TERTIARY}
                keyboardType="decimal-pad"
                value={addAvgPrice}
                onChangeText={setAddAvgPrice}
              />

              {/* Purchase Date (Optional) */}
              <Text style={styles.inputLabel}>Purchase Date (Optional)</Text>
              <View style={styles.quickDateRow}>
                <Pressable style={({ pressed }) => [styles.quickDateChip, pressed && styles.pressedOpacity]} onPress={() => setQuickDate('today', 'purchase')}>
                  <Text style={styles.quickDateText}>Today</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.quickDateChip, pressed && styles.pressedOpacity]} onPress={() => setQuickDate('1m', 'purchase')}>
                  <Text style={styles.quickDateText}>1M Ago</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.quickDateChip, pressed && styles.pressedOpacity]} onPress={() => setQuickDate('6m', 'purchase')}>
                  <Text style={styles.quickDateText}>6M Ago</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.quickDateChip, pressed && styles.pressedOpacity]} onPress={() => setQuickDate('1y', 'purchase')}>
                  <Text style={styles.quickDateText}>1Y Ago</Text>
                </Pressable>
              </View>
              <TextInput
                style={styles.modalInput}
                placeholder="YYYY-MM-DD (defaults to Today)"
                placeholderTextColor={COLOR_TEXT_TERTIARY}
                value={addDate}
                onChangeText={setAddDate}
              />

              {/* Holding Period */}
              <Text style={styles.inputLabel}>Intended Holding Horizon</Text>
              <View style={styles.periodPillRow}>
                {(['short', 'medium', 'long'] as HoldingPeriod[]).map((period) => (
                  <Pressable
                    key={period}
                    style={[styles.periodPill, addPeriod === period && styles.periodPillActive]}
                    onPress={() => setAddPeriod(period)}
                  >
                    <Text style={[styles.periodPillText, addPeriod === period && styles.periodPillTextActive]}>
                      {period.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Toggle Already Sold */}
              <Pressable
                style={({ pressed }) => [styles.soldToggleCard, pressed && styles.pressedOpacity]}
                onPress={() => setAddIsSold(!addIsSold)}
              >
                <Text style={styles.soldToggleTitle}>Is this a closed / already sold trade?</Text>
                <View style={[styles.toggleCheckbox, addIsSold && styles.toggleCheckboxChecked]}>
                  {addIsSold && <Text style={styles.checkmarkText}>✓</Text>}
                </View>
              </Pressable>

              {addIsSold && (
                <View style={styles.soldFieldsBlock}>
                  <Text style={styles.inputLabel}>Selling Price (₹) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 290.00"
                    placeholderTextColor={COLOR_TEXT_TERTIARY}
                    keyboardType="decimal-pad"
                    value={addSoldPrice}
                    onChangeText={setAddSoldPrice}
                  />

                  <Text style={styles.inputLabel}>Sale Date (Optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="YYYY-MM-DD (defaults to Today)"
                    placeholderTextColor={COLOR_TEXT_TERTIARY}
                    value={addSoldDate}
                    onChangeText={setAddSoldDate}
                  />
                </View>
              )}

              {/* Submit Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.modalSubmitBtn,
                  isSubmittingAdd && styles.btnDisabled,
                  pressed && styles.pressedOpacity,
                ]}
                onPress={handleSaveHolding}
                disabled={isSubmittingAdd}
              >
                {isSubmittingAdd ? (
                  <ActivityIndicator color={COLOR_CANVAS} />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Position</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===================== SELL STOCK MODAL ===================== */}
      <Modal visible={isSellModalVisible} animationType="slide" transparent onRequestClose={() => setSellModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Sale — {selectedHoldingForSell?.stock_symbol}</Text>
              <Pressable
                onPress={() => setSellModalVisible(false)}
                style={({ pressed }) => pressed && styles.pressedOpacity}
              >
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
              {sellError ? <Text style={styles.modalError}>{sellError}</Text> : null}

              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>
                  Held Quantity: <Text style={styles.infoBannerValue}>{selectedHoldingForSell?.quantity}</Text>
                </Text>
                <Text style={styles.infoBannerText}>
                  Avg Buy: <Text style={styles.infoBannerValue}>₹{selectedHoldingForSell?.avg_price}</Text>
                </Text>
              </View>

              {/* Quick Qty Presets */}
              <Text style={styles.inputLabel}>Quantity to Sell *</Text>
              <View style={styles.quickDateRow}>
                <Pressable
                  style={({ pressed }) => [styles.quickDateChip, pressed && styles.pressedOpacity]}
                  onPress={() => setSellQty(selectedHoldingForSell?.quantity.toString() || '')}
                >
                  <Text style={styles.quickDateText}>All ({selectedHoldingForSell?.quantity})</Text>
                </Pressable>
                {selectedHoldingForSell && selectedHoldingForSell.quantity > 1 && (
                  <Pressable
                    style={({ pressed }) => [styles.quickDateChip, pressed && styles.pressedOpacity]}
                    onPress={() => setSellQty(Math.floor(selectedHoldingForSell.quantity / 2).toString())}
                  >
                    <Text style={styles.quickDateText}>50% ({Math.floor(selectedHoldingForSell.quantity / 2)})</Text>
                  </Pressable>
                )}
              </View>
              <TextInput
                style={styles.modalInput}
                placeholder={`Max ${selectedHoldingForSell?.quantity}`}
                placeholderTextColor={COLOR_TEXT_TERTIARY}
                keyboardType="numeric"
                value={sellQty}
                onChangeText={setSellQty}
              />

              {/* Sold Price */}
              <Text style={styles.inputLabel}>Selling Price per share (₹) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 290.00"
                placeholderTextColor={COLOR_TEXT_TERTIARY}
                keyboardType="decimal-pad"
                value={sellPrice}
                onChangeText={setSellPrice}
              />

              {/* Sold Date */}
              <Text style={styles.inputLabel}>Sale Date (Optional)</Text>
              <View style={styles.quickDateRow}>
                <Pressable style={({ pressed }) => [styles.quickDateChip, pressed && styles.pressedOpacity]} onPress={() => setQuickDate('today', 'sellModal')}>
                  <Text style={styles.quickDateText}>Today</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.quickDateChip, pressed && styles.pressedOpacity]} onPress={() => setQuickDate('1w', 'sellModal')}>
                  <Text style={styles.quickDateText}>1W Ago</Text>
                </Pressable>
              </View>
              <TextInput
                style={styles.modalInput}
                placeholder="YYYY-MM-DD (defaults to Today)"
                placeholderTextColor={COLOR_TEXT_TERTIARY}
                value={sellDate}
                onChangeText={setSellDate}
              />

              {/* Submit Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.modalSubmitBtn,
                  styles.sellSubmitBtn,
                  isSubmittingSell && styles.btnDisabled,
                  pressed && styles.pressedOpacity,
                ]}
                onPress={handleConfirmSell}
                disabled={isSubmittingSell}
              >
                {isSubmittingSell ? (
                  <ActivityIndicator color={COLOR_CANVAS} />
                ) : (
                  <Text style={styles.modalSubmitText}>Confirm Sale</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===================== EDIT STOCK MODAL ===================== */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Position — {selectedHoldingForEdit?.stock_symbol}</Text>
              <Pressable
                onPress={() => setEditModalVisible(false)}
                style={({ pressed }) => pressed && styles.pressedOpacity}
              >
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
              {editError ? <Text style={styles.modalError}>{editError}</Text> : null}

              {/* Quantity */}
              <Text style={styles.inputLabel}>Quantity *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Quantity"
                placeholderTextColor={COLOR_TEXT_TERTIARY}
                keyboardType="numeric"
                value={editQty}
                onChangeText={setEditQty}
              />

              {/* Avg Price */}
              <Text style={styles.inputLabel}>Average Buy Price (₹) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Average Price"
                placeholderTextColor={COLOR_TEXT_TERTIARY}
                keyboardType="decimal-pad"
                value={editAvgPrice}
                onChangeText={setEditAvgPrice}
              />

              {/* Purchase Date */}
              <Text style={styles.inputLabel}>Purchase Date (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLOR_TEXT_TERTIARY}
                value={editDate}
                onChangeText={setEditDate}
              />

              {/* Holding Period */}
              <Text style={styles.inputLabel}>Intended Holding Horizon</Text>
              <View style={styles.periodPillRow}>
                {(['short', 'medium', 'long'] as HoldingPeriod[]).map((period) => (
                  <Pressable
                    key={period}
                    style={[styles.periodPill, editPeriod === period && styles.periodPillActive]}
                    onPress={() => setEditPeriod(period)}
                  >
                    <Text style={[styles.periodPillText, editPeriod === period && styles.periodPillTextActive]}>
                      {period.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Submit Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.modalSubmitBtn,
                  isSubmittingEdit && styles.btnDisabled,
                  pressed && styles.pressedOpacity,
                ]}
                onPress={handleSaveEdit}
                disabled={isSubmittingEdit}
              >
                {isSubmittingEdit ? (
                  <ActivityIndicator color={COLOR_CANVAS} />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Changes</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pressedOpacity: {
    opacity: 0.7,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLOR_CANVAS,
  },
  container: {
    flex: 1,
    backgroundColor: COLOR_CANVAS,
    paddingHorizontal: 20,
  },
  topHeader: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: COLOR_TEXT_PRIMARY,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLOR_TEXT_SECONDARY,
    marginTop: 2,
  },
  summaryBlock: {
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLOR_TEXT_SECONDARY,
    marginBottom: 4,
  },
  investedValue: {
    fontSize: 46,
    fontWeight: '700',
    color: COLOR_TEXT_PRIMARY,
    fontVariant: ['tabular-nums'],
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  pnlLabel: {
    fontSize: 13,
    color: COLOR_TEXT_SECONDARY,
  },
  pnlValue: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  healthLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 16,
  },
  healthLinkRowPressed: {
    opacity: 0.7,
  },
  healthLinkText: {
    fontSize: 15,
    color: COLOR_TEXT_SECONDARY,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
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
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLOR_TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLOR_TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    padding: 20,
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderRadius: 14,
    alignItems: 'center',
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
  list: {
    paddingBottom: 100,
  },
  holdingCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: COLOR_SURFACE_ELEVATED,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ticker: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR_TEXT_PRIMARY,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillHeld: {
    backgroundColor: withAlpha(COLOR_ACCENT_LIME, '26'),
  },
  statusPillSold: {
    backgroundColor: COLOR_SURFACE_SECONDARY,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPillTextHeld: {
    color: COLOR_ACCENT_LIME,
  },
  statusPillTextSold: {
    color: COLOR_TEXT_TERTIARY,
  },
  metricsRow: {
    marginBottom: 10,
  },
  metricsLine: {
    fontSize: 14,
    lineHeight: 20,
  },
  metricLabelInline: {
    color: COLOR_TEXT_SECONDARY,
  },
  metricValueInline: {
    color: COLOR_TEXT_PRIMARY,
    fontWeight: '600',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLOR_SURFACE_SECONDARY,
  },
  periodTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLOR_TEXT_TERTIARY,
  },
  cardDivider: {
    borderTopWidth: 1,
    borderTopColor: COLOR_DIVIDER,
    marginTop: 12,
  },
  dateRow: {
    paddingTop: 10,
  },
  dateText: {
    fontSize: 12,
    color: COLOR_TEXT_TERTIARY,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 10,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLOR_SURFACE_SECONDARY,
  },
  actionBtnPressed: {
    opacity: 0.7,
  },
  sellBtn: {
    backgroundColor: withAlpha(COLOR_POSITIVE, '22'),
  },
  sellBtnText: {
    color: COLOR_POSITIVE,
    fontWeight: '600',
    fontSize: 13,
  },
  deleteBtn: {
    backgroundColor: withAlpha(COLOR_NEGATIVE, '22'),
  },
  actionBtnText: {
    color: COLOR_TEXT_SECONDARY,
    fontWeight: '600',
    fontSize: 13,
  },
  deleteBtnText: {
    color: COLOR_NEGATIVE,
    fontWeight: '600',
    fontSize: 13,
  },
  skeletonTicker: {
    width: 72,
    height: 16,
    borderRadius: 4,
    backgroundColor: COLOR_SURFACE_SECONDARY,
  },
  skeletonPill: {
    width: 44,
    height: 18,
    borderRadius: 6,
    backgroundColor: COLOR_SURFACE_SECONDARY,
  },
  skeletonMetricsLine: {
    width: '80%',
    height: 14,
    borderRadius: 4,
    backgroundColor: COLOR_SURFACE_SECONDARY,
    marginBottom: 10,
  },
  skeletonMetaRow: {
    flexDirection: 'row',
  },
  skeletonTagSmall: {
    width: 56,
    height: 16,
    borderRadius: 6,
    backgroundColor: COLOR_SURFACE_SECONDARY,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: COLOR_ACCENT_LIME,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 30,
  },
  fabPressed: {
    opacity: 0.85,
  },
  fabText: {
    color: COLOR_CANVAS,
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLOR_SURFACE_SECONDARY,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLOR_TEXT_PRIMARY,
  },
  closeBtn: {
    fontSize: 20,
    color: COLOR_TEXT_SECONDARY,
    padding: 4,
  },
  modalError: {
    backgroundColor: withAlpha(COLOR_NEGATIVE, '22'),
    color: COLOR_NEGATIVE,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 13,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR_TEXT_TERTIARY,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderWidth: 1,
    borderColor: COLOR_DIVIDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLOR_TEXT_PRIMARY,
    fontSize: 15,
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quickDateChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderWidth: 1,
    borderColor: COLOR_DIVIDER,
  },
  quickDateText: {
    color: COLOR_TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionBox: {
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLOR_DIVIDER,
    maxHeight: 160,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_DIVIDER,
  },
  suggestionSymbol: {
    color: COLOR_TEXT_PRIMARY,
    fontWeight: '700',
    fontSize: 14,
  },
  suggestionScore: {
    fontWeight: '600',
    fontSize: 13,
  },
  periodPillRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  periodPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderWidth: 1,
    borderColor: COLOR_DIVIDER,
  },
  periodPillActive: {
    backgroundColor: COLOR_ACCENT_LIME,
    borderColor: COLOR_ACCENT_LIME,
  },
  periodPillText: {
    color: COLOR_TEXT_SECONDARY,
    fontWeight: '600',
    fontSize: 12,
  },
  periodPillTextActive: {
    color: COLOR_CANVAS,
    fontWeight: '700',
  },
  soldToggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLOR_SURFACE_ELEVATED,
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  soldToggleTitle: {
    color: COLOR_TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  toggleCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLOR_TEXT_TERTIARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCheckboxChecked: {
    backgroundColor: COLOR_ACCENT_LIME,
    borderColor: COLOR_ACCENT_LIME,
  },
  checkmarkText: {
    color: COLOR_CANVAS,
    fontWeight: '700',
    fontSize: 13,
  },
  soldFieldsBlock: {
    backgroundColor: COLOR_SURFACE_ELEVATED,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  modalSubmitBtn: {
    backgroundColor: COLOR_ACCENT_LIME,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  sellSubmitBtn: {
    backgroundColor: COLOR_POSITIVE,
  },
  modalSubmitText: {
    color: COLOR_CANVAS,
    fontWeight: '700',
    fontSize: 16,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  infoBanner: {
    backgroundColor: COLOR_SURFACE_ELEVATED,
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoBannerText: {
    color: COLOR_TEXT_SECONDARY,
    fontSize: 13,
  },
  infoBannerValue: {
    fontWeight: '700',
    color: COLOR_TEXT_PRIMARY,
  },
});
