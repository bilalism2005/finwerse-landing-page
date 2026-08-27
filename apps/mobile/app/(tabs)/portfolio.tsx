import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ScrollView,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  usePortfolioStore,
  PortfolioHolding,
} from '@/src/store/portfolioStore';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeTokens } from '../../src/store/themeStore';
import type { ThemeTokens } from '../../src/theme/tokens';
import { HoldingCard } from '@/components/portfolio/HoldingCard';
import { AddHoldingModal } from '@/components/portfolio/AddHoldingModal';
import { SellHoldingModal } from '@/components/portfolio/SellHoldingModal';
import { EditHoldingModal } from '@/components/portfolio/EditHoldingModal';
import { formatRupees } from '@/components/portfolio/shared';

const SKELETON_HOLDING_ROWS = [0, 1, 2];

export default function PortfolioScreen() {
  const router = useRouter();
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
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

  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [isSellModalVisible, setSellModalVisible] = useState(false);
  const [selectedHoldingForSell, setSelectedHoldingForSell] = useState<PortfolioHolding | null>(null);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [selectedHoldingForEdit, setSelectedHoldingForEdit] = useState<PortfolioHolding | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    await fetchHoldings();
    setRefreshing(false);
  }, [fetchHoldings]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleOpenAddModal = useCallback(() => setAddModalVisible(true), []);

  const handleOpenSellModal = useCallback((item: PortfolioHolding) => {
    setSelectedHoldingForSell(item);
    setSellModalVisible(true);
  }, []);

  const handleOpenEditModal = useCallback((item: PortfolioHolding) => {
    setSelectedHoldingForEdit(item);
    setEditModalVisible(true);
  }, []);

  const handleDelete = useCallback((id: string, symbol: string) => {
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
  }, [deleteHolding]);

  // Stable across renders (deps only change with tokens/theme or the callbacks
  // above, which are themselves stable) so FlatList's PureComponent-based cell
  // renderers don't re-render every visible row on every keystroke elsewhere
  // on this screen -- previously renderItem was a brand-new inline closure
  // every render.
  const renderItem = useCallback(
    ({ item }: { item: PortfolioHolding }) => (
      <HoldingCard
        item={item}
        tokens={tokens}
        onSell={handleOpenSellModal}
        onEdit={handleOpenEditModal}
        onDelete={handleDelete}
      />
    ),
    [tokens, handleOpenSellModal, handleOpenEditModal, handleDelete]
  );

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
          <Text style={[styles.pnlValue, { color: realizedPnl >= 0 ? tokens.positive : tokens.negative }]}>
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
        <IconSymbol name="chevron.right" size={16} color={tokens.textSecondary} />
      </Pressable>

      {/* Filter row */}
      <View style={styles.segmentedControl}>
        <Pressable
          onPress={() => setFilterTab('all')}
          style={({ pressed }) => [styles.segment, filterTab === 'all' && styles.segmentSelected, pressed && styles.segmentPressed]}
        >
          <Text style={[styles.segmentText, filterTab === 'all' && styles.segmentTextSelected]}>
            All ({holdings.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilterTab('held')}
          style={({ pressed }) => [styles.segment, filterTab === 'held' && styles.segmentSelected, pressed && styles.segmentPressed]}
        >
          <Text style={[styles.segmentText, filterTab === 'held' && styles.segmentTextSelected]}>
            Held ({heldCount})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilterTab('sold')}
          style={({ pressed }) => [styles.segment, filterTab === 'sold' && styles.segmentSelected, pressed && styles.segmentPressed]}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={tokens.accent} />}
        >
          <Pressable style={styles.errorBox} onPress={() => loadData()}>
            <Text style={styles.errorText}>Couldn't load your positions. Please try again.</Text>
            <Text style={styles.retryText}>Tap to Retry</Text>
          </Pressable>
        </ScrollView>
      ) : displayedHoldings.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={tokens.accent} />}
        >
          <Text style={styles.emptyTitle}>
            {filterTab === 'sold' ? 'No sold positions yet.' : 'No portfolio positions yet.'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {filterTab === 'sold'
              ? 'When you sell positions, they will appear here with realized P&L tracking.'
              : "Add your stocks to unlock real-time Portfolio Health analysis. You'll pick a holding horizon (Short, Medium, or Long) for each — scores and analysis are tuned to that timeframe."}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={displayedHoldings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={tokens.accent} />}
        />
      )}

      {/* Floating Add Stock Button */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={handleOpenAddModal}
      >
        <Text style={styles.fabText}>+ Add Stock</Text>
      </Pressable>

      <AddHoldingModal
        visible={isAddModalVisible}
        onClose={() => setAddModalVisible(false)}
        tokens={tokens}
        onSubmit={addHolding}
      />

      <SellHoldingModal
        visible={isSellModalVisible}
        holding={selectedHoldingForSell}
        onClose={() => setSellModalVisible(false)}
        tokens={tokens}
        onSubmit={sellHolding}
      />

      <EditHoldingModal
        visible={isEditModalVisible}
        holding={selectedHoldingForEdit}
        onClose={() => setEditModalVisible(false)}
        tokens={tokens}
        onSubmit={updateHolding}
      />
    </View>
    </SafeAreaView>
  );
}

function createStyles(tokens: ThemeTokens) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tokens.canvas,
  },
  container: {
    flex: 1,
    backgroundColor: tokens.canvas,
    paddingHorizontal: 20,
  },
  topHeader: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: tokens.textPrimary,
  },
  pageSubtitle: {
    fontSize: 13,
    color: tokens.textSecondary,
    marginTop: 2,
  },
  summaryBlock: {
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 13,
    color: tokens.textSecondary,
    marginBottom: 4,
  },
  investedValue: {
    fontSize: 46,
    fontWeight: '700',
    color: tokens.textPrimary,
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
    color: tokens.textSecondary,
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
    color: tokens.textSecondary,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: tokens.elevatedSurface,
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
    backgroundColor: tokens.accent,
  },
  segmentPressed: {
    opacity: 0.7,
  },
  segmentText: {
    color: tokens.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextSelected: {
    color: tokens.onAccent,
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
    color: tokens.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: tokens.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    padding: 20,
    backgroundColor: tokens.elevatedSurface,
    borderRadius: 14,
    alignItems: 'center',
  },
  errorText: {
    color: tokens.negative,
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  retryText: {
    color: tokens.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 100,
  },
  // Only used by the loading skeleton below -- the real cards render via
  // components/portfolio/HoldingCard.tsx, which has its own matching styles.
  holdingCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: tokens.elevatedSurface,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  skeletonTicker: {
    width: 72,
    height: 16,
    borderRadius: 4,
    backgroundColor: tokens.secondarySurface,
  },
  skeletonPill: {
    width: 44,
    height: 18,
    borderRadius: 6,
    backgroundColor: tokens.secondarySurface,
  },
  skeletonMetricsLine: {
    width: '80%',
    height: 14,
    borderRadius: 4,
    backgroundColor: tokens.secondarySurface,
    marginBottom: 10,
  },
  skeletonMetaRow: {
    flexDirection: 'row',
  },
  skeletonTagSmall: {
    width: 56,
    height: 16,
    borderRadius: 6,
    backgroundColor: tokens.secondarySurface,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: tokens.accent,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 30,
  },
  fabPressed: {
    opacity: 0.85,
  },
  fabText: {
    color: tokens.onAccent,
    fontWeight: '700',
    fontSize: 16,
  },
  });
}
