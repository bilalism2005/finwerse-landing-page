import { useState, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, Timeframe } from '../../src/store';
import { getStockDetailScore, StockScoreDetail } from '../../src/api/stockService';
import { IconSymbol } from '../../components/ui/IconSymbol';

// Design System — Mobile Redesign tokens (spec/ui.md → "Design System — Mobile Redesign")
// Duplicated locally (same values as app/(tabs)/index.tsx) rather than importing from that
// screen, to keep this a self-contained single-file redesign per the build instructions.
const COLOR_CANVAS = '#090B0A';
const COLOR_SURFACE_ELEVATED = '#131613';
const COLOR_DIVIDER = '#1A1E1A';
const COLOR_TEXT_PRIMARY = '#F5F7F2';
const COLOR_TEXT_SECONDARY = '#A4AAA3';
const COLOR_TEXT_TERTIARY = '#6F766F';
const COLOR_ACCENT_LIME = '#C7FF3D';
const COLOR_NEGATIVE = '#FF6B67';
const COLOR_WARNING = '#FFB84D';

type Band = 'green' | 'amber' | 'red';
type PillarKey = 'technical' | 'safety' | 'sentiment';

const HORIZON_LABELS: Record<Timeframe, string> = {
  short: 'Short',
  medium: 'Medium',
  long: 'Long',
};

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

const SIGNAL_DRIVER_ROWS = ['Momentum', 'Trend strength', 'Volume confirmation', 'Financial safety'];

const MORE_ON_STOCK_ROWS = [
  'Fundamentals',
  'Earnings & financials',
  'News & sentiment',
  'Peer comparison',
  'Score history',
];

const CHART_RANGE_SEGMENTS = ['1D', '1W', '1M', '3M', '1Y'];

function isNotAvailable(value: number | string | null | undefined): boolean {
  return value === 'Not Available' || value === null || value === undefined;
}

function progressBarWidthPercent(score: number): number {
  return Math.max(0, Math.min(100, (score + 100) / 2));
}

function withAlpha(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}

export default function StockDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  const { selectedTimeframe } = useAppStore();
  const [timeframe, setTimeframe] = useState<Timeframe>(selectedTimeframe || 'short');
  const [data, setData] = useState<StockScoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

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

  const toggleRow = (index: number) => {
    setExpandedRows((prev) => ({ ...prev, [index]: !prev[index] }));
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
          <IconSymbol name="chevron.left" size={20} color={COLOR_TEXT_PRIMARY} />
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
            color={isFavorited ? COLOR_ACCENT_LIME : COLOR_TEXT_SECONDARY}
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
              <Text style={[styles.heroScore, { color: BAND_COLOR[getBand(data.overall)] }]}>
                {Math.round(data.overall)}
              </Text>
              <Text style={styles.heroScoreSuffix}> / 100</Text>
            </View>
            {(() => {
              const band = getBand(data.overall);
              const color = BAND_COLOR[band];
              return (
                <View style={[styles.statusPill, { backgroundColor: withAlpha(color, '26') }]}>
                  <View style={[styles.statusDot, { backgroundColor: color }]} />
                  <Text style={[styles.statusPillText, { color }]}>{BAND_STATUS_WORD[band]} momentum</Text>
                </View>
              );
            })()}
          </View>

          {/* Price + chart — STUB (no OHLCV/price-history endpoint exists today) */}
          <View style={styles.priceStubSection}>
            <Text style={styles.priceStubText}>Price data coming soon</Text>
            <View style={styles.chartStubBox}>
              <IconSymbol name="chart.line.uptrend.xyaxis" size={32} color={COLOR_TEXT_TERTIARY} />
              <Text style={styles.chartStubText}>Chart coming soon</Text>
            </View>
            <View style={styles.chartRangeRow}>
              {CHART_RANGE_SEGMENTS.map((label) => (
                <View key={label} style={styles.chartRangeSegment}>
                  <Text style={styles.chartRangeSegmentText}>{label}</Text>
                </View>
              ))}
            </View>
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
                        { color: na ? COLOR_TEXT_SECONDARY : BAND_COLOR[band as Band] },
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

      {/* Signal drivers — STUB (no per-driver breakdown computed/stored today) */}
      <Text style={styles.sectionTitle}>Signal drivers</Text>
      <View style={styles.signalDriversSection}>
        {SIGNAL_DRIVER_ROWS.map((label, index) => (
          <View
            key={label}
            style={[
              styles.signalDriverRow,
              index !== SIGNAL_DRIVER_ROWS.length - 1 && styles.pillarRowDivider,
            ]}
          >
            <Text style={styles.signalDriverLabel}>{label}</Text>
            <Text style={styles.signalDriverStatus}>Coming soon</Text>
            <IconSymbol name="chevron.right" size={16} color={COLOR_TEXT_TERTIARY} style={styles.chevronDimmed} />
          </View>
        ))}
      </View>

      {/* "More on this stock" — STUB, 5 expandable disclosure rows */}
      <Text style={styles.moreOnStockHeading}>MORE ON THIS STOCK</Text>
      <View style={styles.moreOnStockSection}>
        {MORE_ON_STOCK_ROWS.map((label, index) => {
          const isExpanded = !!expandedRows[index];
          return (
            <View key={label} style={index !== MORE_ON_STOCK_ROWS.length - 1 ? styles.pillarRowDivider : undefined}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${isExpanded ? 'expanded' : 'collapsed'}`}
                onPress={() => toggleRow(index)}
                style={({ pressed }) => [styles.disclosureRow, pressed && styles.headerIconButtonPressed]}
              >
                <Text style={styles.disclosureLabel}>{label}</Text>
                <IconSymbol
                  name="chevron.down"
                  size={18}
                  color={COLOR_TEXT_SECONDARY}
                  style={isExpanded ? styles.chevronExpanded : undefined}
                />
              </Pressable>
              {isExpanded && (
                <View style={styles.disclosureBody}>
                  <Text style={styles.disclosureBodyText}>Coming soon — this section isn't available yet</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLOR_CANVAS,
  },
  container: {
    flex: 1,
    backgroundColor: COLOR_CANVAS,
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
    borderRadius: 19,
    backgroundColor: COLOR_SURFACE_ELEVATED,
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
    color: COLOR_TEXT_PRIMARY,
  },
  descriptor: {
    fontSize: 13.5,
    color: COLOR_TEXT_SECONDARY,
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
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
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextSelected: {
    color: COLOR_CANVAS,
  },
  // Loading skeleton (item 4, spec/ui.md → Screen: Stock Detail) — matches the score-hero +
  // "Why this score?" pillar-row shape, same block-based pattern as Home/Portfolio/Health.
  skeletonHeroScore: {
    width: 120,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLOR_SURFACE_ELEVATED,
  },
  skeletonStatusPill: {
    width: 130,
    height: 28,
    borderRadius: 999,
    backgroundColor: COLOR_SURFACE_ELEVATED,
    marginTop: 10,
  },
  skeletonSectionTitle: {
    width: 140,
    height: 19,
    borderRadius: 4,
    backgroundColor: COLOR_SURFACE_ELEVATED,
    marginBottom: 12,
  },
  skeletonPillarLabel: {
    width: 80,
    height: 15,
    borderRadius: 4,
    backgroundColor: COLOR_SURFACE_ELEVATED,
  },
  skeletonPillarValue: {
    width: 32,
    height: 17,
    borderRadius: 4,
    backgroundColor: COLOR_SURFACE_ELEVATED,
  },
  skeletonPillarNote: {
    width: '65%',
    height: 12.5,
    borderRadius: 4,
    backgroundColor: COLOR_SURFACE_ELEVATED,
    marginTop: 6,
  },
  skeletonPillarBarFill: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLOR_SURFACE_ELEVATED,
  },
  errorBox: {
    padding: 20,
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 24,
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
    color: COLOR_TEXT_TERTIARY,
    marginBottom: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 10,
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
  priceStubSection: {
    marginBottom: 24,
  },
  priceStubText: {
    fontSize: 14,
    color: COLOR_TEXT_TERTIARY,
    textAlign: 'center',
    marginBottom: 12,
  },
  chartStubBox: {
    height: 140,
    borderRadius: 16,
    backgroundColor: COLOR_SURFACE_ELEVATED,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chartStubText: {
    fontSize: 13,
    color: COLOR_TEXT_TERTIARY,
  },
  chartRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    opacity: 0.4,
  },
  chartRangeSegment: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chartRangeSegmentText: {
    fontSize: 12,
    color: COLOR_TEXT_TERTIARY,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLOR_TEXT_PRIMARY,
    marginBottom: 12,
  },
  pillarSection: {
    marginBottom: 24,
  },
  pillarRow: {
    paddingVertical: 14,
  },
  pillarRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLOR_DIVIDER,
  },
  pillarRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillarLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR_TEXT_PRIMARY,
  },
  pillarValue: {
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  pillarNote: {
    fontSize: 12.5,
    color: COLOR_TEXT_SECONDARY,
    marginTop: 4,
  },
  pillarBarTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: COLOR_DIVIDER,
    overflow: 'hidden',
    marginTop: 10,
  },
  pillarBarFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: COLOR_ACCENT_LIME,
  },
  signalDriversSection: {
    marginBottom: 24,
  },
  signalDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  signalDriverLabel: {
    flex: 1,
    fontSize: 15,
    color: COLOR_TEXT_PRIMARY,
  },
  signalDriverStatus: {
    fontSize: 13,
    color: COLOR_TEXT_TERTIARY,
  },
  chevronDimmed: {
    opacity: 0.4,
  },
  moreOnStockHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLOR_TEXT_TERTIARY,
    marginBottom: 8,
  },
  moreOnStockSection: {
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  disclosureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  disclosureLabel: {
    fontSize: 15,
    color: COLOR_TEXT_PRIMARY,
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  disclosureBody: {
    paddingBottom: 16,
  },
  disclosureBodyText: {
    fontSize: 13,
    color: COLOR_TEXT_SECONDARY,
  },
});
