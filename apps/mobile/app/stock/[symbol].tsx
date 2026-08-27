import { useMemo, useState, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, Timeframe } from '../../src/store';
import { getStockDetailScore, StockScoreDetail } from '../../src/api/stockService';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { useThemeStore, useThemeTokens } from '../../src/store/themeStore';
import type { ThemeTokens } from '../../src/theme/tokens';
import { getBand, getBandColor, getBadgeBackground, Band } from '../../src/theme/score-band';

type PillarKey = 'technical' | 'safety' | 'sentiment';

const HORIZON_LABELS: Record<Timeframe, string> = {
  short: 'Short',
  medium: 'Medium',
  long: 'Long',
};

// spec/ui.md Score hero: 3-way status pill mapping
const BAND_STATUS_WORD: Record<Band, string> = {
  green: 'Strong',
  amber: 'Steady',
  red: 'Weak',
};

// spec/ui.md "Why this score?" — deterministic, band-derived explanatory note mapping
const PILLAR_NOTES: Record<PillarKey, Record<Band, string>> = {
  technical: {
    green: 'Strong price structure and momentum',
    amber: 'Mixed price signals, no clear direction',
    red: 'Weak price structure, momentum under pressure',
  },
  safety: {
    green: 'Strong financial stability',
    amber: 'Average financial stability',
    red: 'Financial stability concerns',
  },
  sentiment: {
    green: 'Strong positive sentiment',
    amber: 'Mixed sentiment signals',
    red: 'Weak sentiment signals',
  },
};
const NOT_AVAILABLE_NOTE = 'No recent signal';

const PILLAR_ROWS: { key: PillarKey; label: string }[] = [
  { key: 'technical', label: 'Technical' },
  { key: 'safety', label: 'Safety' },
  { key: 'sentiment', label: 'Sentiment' },
];

function isNotAvailable(value: number | string | null | undefined): boolean {
  return value === 'Not Available' || value === null || value === undefined;
}

function progressBarWidthPercent(score: number): number {
  return Math.max(0, Math.min(100, (score + 100) / 2));
}

export default function StockDetailScreen() {
  const tokens = useThemeTokens();
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  const { selectedTimeframe } = useAppStore();
  const [timeframe, setTimeframe] = useState<Timeframe>(selectedTimeframe || 'short');
  const [data, setData] = useState<StockScoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    fetchScore(timeframe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const status = e?.response?.status;
      if (status === 404) {
        setError(`We don't have data for ${symbol?.toUpperCase()}.`);
      } else {
        setError(`Couldn't load ${symbol?.toUpperCase()}'s score. Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header row — back button + star toggle */}
      <View style={styles.headerTopRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerIconButton, pressed && styles.headerIconButtonPressed]}
        >
          <IconSymbol name="chevron.left" size={20} color={tokens.textPrimary} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFavorited ? 'Remove from watchlist' : 'Add to watchlist'}
          onPress={() => setIsFavorited((prev) => !prev)}
          style={({ pressed }) => [styles.headerIconButton, pressed && styles.headerIconButtonPressed]}
        >
          <IconSymbol
            name={isFavorited ? 'star.fill' : 'star'}
            size={20}
            color={isFavorited ? tokens.accent : tokens.textSecondary}
          />
        </Pressable>
      </View>

      <View style={styles.headerTitleBlock}>
        <Text style={styles.ticker}>{symbol?.toUpperCase()}</Text>
        <Text style={styles.descriptor}>· NSE</Text>
      </View>

      {/* Timeframe control — restyled to Home's segmented-control token, same 3-way selector */}
      <View style={styles.segmentedControl}>
        {(Object.keys(HORIZON_LABELS) as Timeframe[]).map((value) => {
          const isSelected = timeframe === value;
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

      {/* Score hero + "Why this score?" — loading skeleton / error / populated */}
      {loading ? (
        <>
          {/* Score hero skeleton — matches heroSection's centered score + status pill shape */}
          <View style={styles.heroSection}>
            <View style={styles.skeletonHeroScore} />
            <View style={styles.skeletonStatusPill} />
          </View>

          {/* "Why this score?" skeleton — matches the 3 pillar rows' shape */}
          <View style={styles.skeletonSectionTitle} />
          <View style={styles.pillarSection}>
            {PILLAR_ROWS.map((pillar, index) => {
              const isLast = index === PILLAR_ROWS.length - 1;
              return (
                <View key={pillar.key} style={[styles.pillarRow, !isLast && styles.pillarRowDivider]}>
                  <View style={styles.pillarRowTop}>
                    <View style={styles.skeletonPillarLabel} />
                    <View style={styles.skeletonPillarValue} />
                  </View>
                  <View style={styles.skeletonPillarNote} />
                  <View style={styles.pillarBarTrack}>
                    <View style={styles.skeletonPillarBarFill} />
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : error || !data ? (
        <Pressable style={styles.errorBox} onPress={() => fetchScore(timeframe)}>
          <Text style={styles.errorText}>{error || 'Stock score unavailable'}</Text>
          <Text style={styles.retryText}>Tap to Retry</Text>
        </Pressable>
      ) : (
        <>
          {/* Score hero */}
          <View style={styles.heroSection}>
            <View style={styles.heroScoreRow}>
              <Text style={[styles.heroScore, { color: getBandColor(tokens, getBand(data.overall)) }]}>
                {Math.round(data.overall)}
              </Text>
              <Text style={styles.heroScoreSuffix}> / 100</Text>
            </View>
            {(() => {
              const band = getBand(data.overall);
              const color = getBandColor(tokens, band);
              return (
                <View style={[styles.statusPill, { backgroundColor: getBadgeBackground(tokens, band, mode) }]}>
                  <View style={[styles.statusDot, { backgroundColor: color }]} />
                  <Text style={[styles.statusPillText, { color }]}>{BAND_STATUS_WORD[band]} momentum</Text>
                </View>
              );
            })()}
          </View>

          {/* Why this score? */}
          <Text style={styles.sectionTitle}>Why this score?</Text>
          <View style={styles.pillarSection}>
            {PILLAR_ROWS.map((pillar, index) => {
              const rawValue = data[pillar.key];
              const na = isNotAvailable(rawValue);
              const numericValue = na ? 0 : Number(rawValue);
              const band = na ? null : getBand(numericValue);
              const note = na ? NOT_AVAILABLE_NOTE : PILLAR_NOTES[pillar.key][band as Band];
              const isLast = index === PILLAR_ROWS.length - 1;
              return (
                <View key={pillar.key} style={[styles.pillarRow, !isLast && styles.pillarRowDivider]}>
                  <View style={styles.pillarRowTop}>
                    <Text style={styles.pillarLabel}>{pillar.label}</Text>
                    <Text
                      style={[
                        styles.pillarValue,
                        { color: na ? tokens.textSecondary : getBandColor(tokens, band as Band) },
                      ]}
                    >
                      {na ? 'Not Available' : Math.round(numericValue)}
                    </Text>
                  </View>
                  <Text style={styles.pillarNote}>{note}</Text>
                  {!na && (
                    <View style={styles.pillarBarTrack}>
                      <View
                        style={[styles.pillarBarFill, { width: `${progressBarWidthPercent(numericValue)}%` }]}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </>
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
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerIconButton: {
      width: 38,
      height: 38,
      borderRadius: 999,
      backgroundColor: tokens.elevatedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconButtonPressed: {
      opacity: 0.7,
    },
    headerTitleBlock: {
      marginBottom: 20,
    },
    ticker: {
      fontSize: 28,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    descriptor: {
      fontSize: 13,
      color: tokens.textSecondary,
      marginTop: 4,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 12,
      padding: 4,
      marginBottom: 24,
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
    // Loading skeleton (item 4, spec/ui.md → Screen: Stock Detail) — matches the score-hero +
    // "Why this score?" pillar-row shape, same block-based pattern as Home/Portfolio/Health.
    skeletonHeroScore: {
      width: 120,
      height: 50,
      borderRadius: 8,
      backgroundColor: tokens.elevatedSurface,
    },
    skeletonStatusPill: {
      width: 130,
      height: 28,
      borderRadius: 999,
      backgroundColor: tokens.elevatedSurface,
      marginTop: 12,
    },
    skeletonSectionTitle: {
      width: 140,
      height: 19,
      borderRadius: 4,
      backgroundColor: tokens.elevatedSurface,
      marginBottom: 12,
    },
    skeletonPillarLabel: {
      width: 80,
      height: 15,
      borderRadius: 4,
      backgroundColor: tokens.elevatedSurface,
    },
    skeletonPillarValue: {
      width: 32,
      height: 17,
      borderRadius: 4,
      backgroundColor: tokens.elevatedSurface,
    },
    skeletonPillarNote: {
      width: '65%',
      height: 12.5,
      borderRadius: 4,
      backgroundColor: tokens.elevatedSurface,
      marginTop: 8,
    },
    skeletonPillarBarFill: {
      width: '100%',
      height: '100%',
      borderRadius: 2,
      backgroundColor: tokens.elevatedSurface,
    },
    errorBox: {
      padding: 20,
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 14,
      alignItems: 'center',
      marginBottom: 24,
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
    heroSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    heroScoreRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    heroScore: {
      fontSize: 50,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    heroScoreSuffix: {
      fontSize: 16,
      color: tokens.textTertiary,
      marginBottom: 8,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      marginTop: 12,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusPillText: {
      fontSize: 13,
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 19,
      fontWeight: '700',
      color: tokens.textPrimary,
      marginBottom: 12,
    },
    pillarSection: {
      marginBottom: 24,
    },
    pillarRow: {
      paddingVertical: 16,
    },
    pillarRowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: tokens.dividerSubtle,
    },
    pillarRowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pillarLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    pillarValue: {
      fontSize: 17,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    pillarNote: {
      fontSize: 13,
      color: tokens.textSecondary,
      marginTop: 4,
    },
    pillarBarTrack: {
      height: 3,
      borderRadius: 2,
      backgroundColor: tokens.dividerSubtle,
      overflow: 'hidden',
      marginTop: 12,
    },
    pillarBarFill: {
      height: 3,
      borderRadius: 2,
      backgroundColor: tokens.accent,
    },
  });
}
