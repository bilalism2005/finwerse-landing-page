import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, Timeframe } from '../../src/store';
import { getTopStocks, getCachedTopStocks, searchStocks, StockItem } from '../../src/api/stockService';
import { warmUpBackend } from '../../src/api/client';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { useThemeTokens } from '../../src/store/themeStore';
import type { ThemeTokens } from '../../src/theme/tokens';

// Standing Platform Rule 2: scores are -100..100, same color bands everywhere (Red <40, Amber 41-65, Green 66-100).
const GREEN_BAND_MIN = 66;

type SearchResult = { symbol: string; overall_score: number };

const HORIZON_LABELS: Record<Timeframe, string> = {
  short: 'Short',
  medium: 'Medium',
  long: 'Long',
};

const HORIZON_CONTEXT: Record<Timeframe, string> = {
  short: 'Short-term reads use daily signals. Momentum names lead this view.',
  medium: 'Medium-term signals are strongest this week. Higher score means a stronger setup.',
  long: 'Long-term reads weight financial safety and durable trends more heavily.',
};

const SKELETON_ROWS = [0, 1, 2, 3, 4, 5];

function signalBarWidthPercent(score: number): number {
  return Math.max(0, Math.min(100, (score + 100) / 2));
}

export default function HomeScreen() {
  const router = useRouter();
  const { selectedTimeframe, setTimeframe } = useAppStore();
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [topStocks, setTopStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-warm backend on startup for background ML/AI readiness
  useEffect(() => {
    warmUpBackend();
  }, []);

  const loadStocks = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else if (topStocks.length === 0) setLoading(true);
      setError(null);

      try {
        // Step 1: Immediately render from local cache if present (0ms!)
        if (!isRefresh && topStocks.length === 0) {
          const cached = await getCachedTopStocks('overall', selectedTimeframe);
          if (cached && cached.length > 0) {
            setTopStocks(cached);
            setLoading(false);
          }
        }

        // Step 2: Fetch fresh data
        const res = await getTopStocks('overall', selectedTimeframe, 10);
        setTopStocks(res.stocks ?? []);
      } catch (e) {
        console.error('Failed to load top stocks:', e);
        if (topStocks.length === 0) {
          setError('Failed to load stocks. Please pull down to retry.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedTimeframe, topStocks.length]
  );

  useEffect(() => {
    loadStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeframe]);

  const trimmedQuery = searchQuery.trim();
  const isSearchActive = trimmedQuery.length > 0;

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);

    // Debounce: wait for the user to pause typing before firing a request,
    // instead of hitting the API on every keystroke.
    const timer = setTimeout(() => {
      searchStocks(trimmedQuery, selectedTimeframe)
        .then((results) => {
          if (!cancelled) setSearchResults(results);
        })
        .catch((e) => {
          console.error('Search failed:', e);
          if (!cancelled) setSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery, selectedTimeframe]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadStocks(true)} tintColor={tokens.accent} />
      }
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.wordmark}>Finwerse</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          style={({ pressed }) => [styles.headerIconButton, pressed && styles.headerIconButtonPressed]}
        >
          <IconSymbol name="bell.fill" size={18} color={tokens.textPrimary} />
        </Pressable>
      </View>

      {/* Search field */}
      <View style={styles.searchField}>
        <IconSymbol name="magnifyingglass" size={18} color={tokens.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stocks, e.g. RELIANCE"
          placeholderTextColor={tokens.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

      {/* Time horizon control */}
      <View style={styles.segmentedControl}>
        {(Object.keys(HORIZON_LABELS) as Timeframe[]).map((value) => {
          const isSelected = selectedTimeframe === value;
          return (
            <Pressable
              key={value}
              onPress={() => setTimeframe(value)}
              style={[styles.segment, isSelected && styles.segmentSelected]}
            >
              <Text style={[styles.segmentText, isSelected && styles.segmentTextSelected]}>
                {HORIZON_LABELS[value]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Context sentence */}
      <Text style={styles.contextSentence}>{HORIZON_CONTEXT[selectedTimeframe]}</Text>

      {isSearchActive ? (
        <View style={styles.listSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Search results</Text>
          </View>

          {trimmedQuery.length < 2 ? (
            <Text style={styles.hintText}>Type at least 2 characters to search.</Text>
          ) : searchLoading ? (
            <View style={styles.searchLoadingRow}>
              <ActivityIndicator size="small" color={tokens.accent} />
              <Text style={styles.hintText}>Searching…</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <Text style={styles.hintText}>
              No stocks match '{trimmedQuery}'. Try a different ticker or company name.
            </Text>
          ) : (
            searchResults.map((stock) => (
              <Pressable
                key={stock.symbol}
                onPress={() => router.push(`/stock/${stock.symbol}`)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Text style={styles.ticker}>{stock.symbol}</Text>
                <View style={styles.scoreColumn}>
                  <Text style={styles.score}>{Math.round(stock.overall_score)}</Text>
                  <Text
                    style={[
                      styles.statusLabel,
                      { color: stock.overall_score >= GREEN_BAND_MIN ? tokens.accent : tokens.textSecondary },
                    ]}
                  >
                    {stock.overall_score >= GREEN_BAND_MIN ? 'Strong' : 'Building'}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : (
        <View style={styles.listSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Strongest signals</Text>
            <Text style={styles.sectionMeta}>Score -100 to 100</Text>
          </View>

          {loading && topStocks.length === 0 ? (
            SKELETON_ROWS.map((i) => (
              <View key={i} style={styles.row}>
                <View style={styles.skeletonBlockSmall} />
                <View style={styles.rowMiddle}>
                  <View style={styles.skeletonBlockTicker} />
                  <View style={styles.skeletonBlockDescriptor} />
                  <View style={styles.skeletonBar} />
                </View>
                <View style={styles.skeletonBlockScore} />
              </View>
            ))
          ) : error && topStocks.length === 0 ? (
            <Pressable style={styles.errorBox} onPress={() => loadStocks()}>
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.retryText}>Tap to Retry</Text>
            </Pressable>
          ) : topStocks.length === 0 ? (
            <Text style={styles.hintText}>
              No ranked signals yet for this timeframe. Check back after today's market update.
            </Text>
          ) : (
            topStocks.map((stock, index) => {
              const barWidth = signalBarWidthPercent(stock.score);
              const isStrong = stock.score >= GREEN_BAND_MIN;
              return (
                <Pressable
                  key={stock.symbol}
                  onPress={() => router.push(`/stock/${stock.symbol}`)}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <Text style={styles.rank}>{String(index + 1).padStart(2, '0')}</Text>
                  <View style={styles.rowMiddle}>
                    <Text style={styles.ticker}>{stock.symbol}</Text>
                    {stock.sector ? <Text style={styles.descriptor}>{stock.sector}</Text> : null}
                    <View style={styles.signalBarTrack}>
                      <View style={[styles.signalBarFill, { width: `${barWidth}%` }]} />
                    </View>
                  </View>
                  <View style={styles.scoreColumn}>
                    <Text style={styles.score}>{Math.round(stock.score)}</Text>
                    <Text style={[styles.statusLabel, { color: isStrong ? tokens.accent : tokens.textSecondary }]}>
                      {isStrong ? 'Strong' : 'Building'}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      )}
    </ScrollView>
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
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    wordmark: {
      fontSize: 30,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    headerIconButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: tokens.elevatedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconButtonPressed: {
      opacity: 0.7,
    },
    searchField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 12,
      paddingHorizontal: 14,
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      color: tokens.textPrimary,
      paddingVertical: 14,
      fontSize: 15,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 12,
      padding: 4,
      marginBottom: 8,
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
    segmentText: {
      color: tokens.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    segmentTextSelected: {
      color: tokens.onAccent,
    },
    contextSentence: {
      fontSize: 13,
      color: tokens.textSecondary,
      marginBottom: 24,
    },
    listSection: {
      gap: 0,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 19,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    sectionMeta: {
      fontSize: 12,
      color: tokens.textTertiary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: tokens.dividerSubtle,
      gap: 12,
    },
    rowPressed: {
      transform: [{ scale: 0.985 }],
    },
    rank: {
      fontSize: 12,
      color: tokens.textTertiary,
      fontVariant: ['tabular-nums'],
      width: 18,
    },
    rowMiddle: {
      flex: 1,
      gap: 6,
    },
    ticker: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    descriptor: {
      fontSize: 12.5,
      color: tokens.textTertiary,
    },
    signalBarTrack: {
      height: 3,
      borderRadius: 2,
      backgroundColor: tokens.dividerSubtle,
      overflow: 'hidden',
      marginTop: 2,
    },
    signalBarFill: {
      height: 3,
      borderRadius: 2,
      backgroundColor: tokens.accent,
      opacity: 0.85,
    },
    scoreColumn: {
      alignItems: 'flex-end',
    },
    score: {
      fontSize: 22,
      fontWeight: '700',
      color: tokens.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    statusLabel: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
    },
    hintText: {
      fontSize: 14,
      color: tokens.textSecondary,
      paddingVertical: 24,
      textAlign: 'center',
    },
    searchLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 24,
      justifyContent: 'center',
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
      fontSize: 14,
      marginBottom: 8,
      textAlign: 'center',
    },
    retryText: {
      color: tokens.accent,
      fontSize: 14,
      fontWeight: '600',
    },
    skeletonBlockSmall: {
      width: 18,
      height: 12,
      borderRadius: 4,
      backgroundColor: tokens.elevatedSurface,
    },
    skeletonBlockTicker: {
      width: 80,
      height: 14,
      borderRadius: 4,
      backgroundColor: tokens.elevatedSurface,
    },
    skeletonBlockDescriptor: {
      width: 120,
      height: 10,
      borderRadius: 4,
      backgroundColor: tokens.elevatedSurface,
    },
    skeletonBar: {
      height: 3,
      borderRadius: 2,
      backgroundColor: tokens.elevatedSurface,
    },
    skeletonBlockScore: {
      width: 32,
      height: 22,
      borderRadius: 4,
      backgroundColor: tokens.elevatedSurface,
    },
  });
}
