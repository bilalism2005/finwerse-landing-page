import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHealthStore, StockHealthInfo, SectorInfo } from '@/src/store/healthStore';
import { HoldingPeriod } from '@/src/store/portfolioStore';
import { useChatStore } from '@/src/store/chatStore';
import { useThemeTokens } from '@/src/store/themeStore';
import type { ThemeTokens } from '@/src/theme/tokens';
import { IconSymbol } from '@/components/ui/IconSymbol';

function withAlpha(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}

type Band = 'green' | 'amber' | 'red';

// Standing Platform Rule 2 / spec/ui.md Cross-Cutting UI Rules: Red <40, Amber 41-65, Green 66-100
function getBand(score: number): Band {
  if (score < 40) return 'red';
  if (score <= 65) return 'amber';
  return 'green';
}

const HORIZON_LABELS: Record<HoldingPeriod, string> = {
  short: 'Short',
  medium: 'Medium',
  long: 'Long',
};

// -100..100 -> 0-100% normalization, same formula as Home's signal-strength bar
// and Stock Detail's pillar bars (spec/ui.md).
function normalizedPercent(score: number): number {
  return Math.max(0, Math.min(100, (score + 100) / 2));
}

// --- Semi-circle gauge geometry ---
const GAUGE_RADIUS = 90;
const GAUGE_STROKE = 16;
const GAUGE_WIDTH = GAUGE_RADIUS * 2 + GAUGE_STROKE;
const GAUGE_HEIGHT = GAUGE_RADIUS + GAUGE_STROKE;
const GAUGE_CX = GAUGE_WIDTH / 2;
const GAUGE_CY = GAUGE_RADIUS + GAUGE_STROKE / 2;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy - r * Math.sin(angleRad) };
}

// Draws an arc from startAngle to endAngle (standard math degrees, 180 = left, 90 = top, 0 = right).
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const sweep = startAngle - endAngle;
  const largeArcFlag = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

const GAUGE_TRACK_PATH = describeArc(GAUGE_CX, GAUGE_CY, GAUGE_RADIUS, 180, 0);

const EVIDENCE_ROWS: { key: 'technical_score' | 'safety_score' | 'sentiment_score'; label: string }[] = [
  { key: 'technical_score', label: 'Technical' },
  { key: 'safety_score', label: 'Safety' },
  { key: 'sentiment_score', label: 'Sentiment' },
];

// Categorical sector-identity palette — exempt from the single-accent-color/theme-role
// system (spec/ui.md), used only to distinguish diversification-bar segments from each other.
const SECTOR_COLORS = ['#7c6af7', '#b8f567', '#f7a26a', '#4facfe', '#00f2fe', '#f093fb', '#f5576c', '#5ee7df'];

export default function HealthScreen() {
  const router = useRouter();
  const { sendMessage } = useChatStore();
  const { healthData, fetchHealth, loading, error, clearBottleneckReport } = useHealthStore();
  const [timeframe, setTimeframe] = useState<HoldingPeriod>('medium');
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const BAND_COLOR: Record<Band, string> = {
    green: tokens.positive,
    amber: tokens.warning,
    red: tokens.negative,
  };

  useEffect(() => {
    fetchHealth(timeframe);
    clearBottleneckReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  const handleBottleneckNav = (prompt: string) => {
    router.push('/(tabs)/chat');
    // small delay to let the tab transition before streaming message
    setTimeout(() => {
      sendMessage(prompt);
    }, 300);
  };

  const renderHorizontalBar = (sectors: SectorInfo[]) => (
    <View style={styles.barContainer}>
      {sectors.map((sec, i) => (
        <View
          key={`${sec.sector}-${i}`}
          style={[styles.barSegment, { flex: sec.weight, backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }]}
        />
      ))}
    </View>
  );

  const renderHolding = (item: StockHealthInfo, isLast: boolean) => {
    const band = item.overall_score !== null ? getBand(item.overall_score) : null;
    return (
      <View key={item.stock_symbol} style={[styles.holdingRow, !isLast && styles.rowDivider]}>
        <View style={styles.holdingHeaderRow}>
          <Text style={styles.holdingSymbol}>{item.stock_symbol}</Text>
          <View style={[styles.scoreBadge, { backgroundColor: band ? withAlpha(BAND_COLOR[band], '26') : tokens.secondarySurface }]}>
            <Text style={[styles.scoreBadgeText, { color: band ? BAND_COLOR[band] : tokens.textTertiary }]}>
              {item.overall_score !== null ? Math.round(item.overall_score) : 'N/A'}
            </Text>
          </View>
        </View>
        <Text style={styles.holdingMeta}>
          Weight: {(item.weight * 100).toFixed(1)}%  ·  Tech: {item.technical_score ?? 'N/A'}  ·  Safety:{' '}
          {item.safety_score ?? 'N/A'}
        </Text>
      </View>
    );
  };

  const header = (
    <View style={styles.headerRow}>
      <Text style={styles.screenTitle}>Portfolio Health</Text>
    </View>
  );

  const timeframeControl = (
    <View style={styles.segmentedControl}>
      {(Object.keys(HORIZON_LABELS) as HoldingPeriod[]).map((t) => (
        <Pressable
          key={t}
          onPress={() => setTimeframe(t)}
          style={[styles.segment, timeframe === t && styles.segmentSelected]}
        >
          <Text style={[styles.segmentText, timeframe === t && styles.segmentTextSelected]}>
            {HORIZON_LABELS[t]}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  // Loading (initial fetch, nothing cached yet) — skeleton matching the gauge + evidence-row shape.
  if (loading && !healthData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {header}
        {timeframeControl}
        <View style={styles.gaugeSkeletonWrap}>
          <View style={styles.gaugeSkeletonCircle} />
          <Text style={styles.loadingText}>Analyzing your portfolio…</Text>
        </View>
        <View style={styles.evidenceSection}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.evidenceRow, i !== 2 && styles.rowDivider]}>
              <View style={styles.evidenceTopRow}>
                <View style={styles.skeletonLabel} />
                <View style={styles.skeletonValue} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      </SafeAreaView>
    );
  }

  // Error — fixes the raw-error-string rendering gap with human copy + tap-to-retry.
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {header}
        {timeframeControl}
        <Pressable style={styles.errorBox} onPress={() => fetchHealth(timeframe)}>
          <Text style={styles.errorText}>Couldn't load your portfolio health. Please try again.</Text>
          <Text style={styles.retryText}>Tap to Retry</Text>
        </Pressable>
      </ScrollView>
      </SafeAreaView>
    );
  }

  if (!healthData) {
    // Momentary state before the first fetch resolves — treat like loading rather than a blank screen.
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {header}
        {timeframeControl}
        <View style={styles.gaugeSkeletonWrap}>
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text style={styles.loadingText}>Analyzing your portfolio…</Text>
        </View>
      </ScrollView>
      </SafeAreaView>
    );
  }

  // Empty portfolio — GET /portfolio/health returns an all-zero response, not an error
  // (spec/capabilities/portfolio-health.md). Render an explanatory state instead of a
  // confusing 0/100 gauge with empty evidence rows.
  if (healthData.holdings.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {header}
        {timeframeControl}
        <View style={styles.emptyStateBox}>
          <IconSymbol name="chart.line.uptrend.xyaxis" size={32} color={tokens.textTertiary} />
          <Text style={styles.emptyStateTitle}>You haven't added any holdings yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Add your stocks on the Portfolio tab to unlock your health score, diversification, and the AI Bottleneck
            Report.
          </Text>
        </View>
      </ScrollView>
      </SafeAreaView>
    );
  }

  const overallBand = getBand(healthData.overall_score);
  const gaugeFraction = normalizedPercent(healthData.overall_score) / 100;
  const gaugeFillPath = describeArc(GAUGE_CX, GAUGE_CY, GAUGE_RADIUS, 180, 180 - gaugeFraction * 180);
  const divBand = getBand(healthData.diversification_score);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {header}
      {timeframeControl}

      {/* Score hero — semi-circle gauge, arc fill proportional to (score + 100) / 2 */}
      <View style={styles.gaugeWrap}>
        <Svg width={GAUGE_WIDTH} height={GAUGE_HEIGHT}>
          <Path d={GAUGE_TRACK_PATH} stroke={tokens.dividerSubtle} strokeWidth={GAUGE_STROKE} strokeLinecap="round" fill="none" />
          {gaugeFraction > 0 && (
            <Path
              d={gaugeFillPath}
              stroke={BAND_COLOR[overallBand]}
              strokeWidth={GAUGE_STROKE}
              strokeLinecap="round"
              fill="none"
            />
          )}
        </Svg>
        <View style={styles.gaugeNumeralOverlay}>
          <View style={styles.gaugeScoreRow}>
            <Text style={[styles.gaugeScore, { color: BAND_COLOR[overallBand] }]}>
              {Math.round(healthData.overall_score)}
            </Text>
            <Text style={styles.gaugeScoreSuffix}> / 100</Text>
          </View>
        </View>
      </View>

      <View style={styles.splitScoresRow}>
        <View style={styles.splitBox}>
          <Text style={styles.splitLabel}>Green Score</Text>
          <Text style={[styles.splitVal, { color: tokens.positive }]}>{Math.round(healthData.green_score)}</Text>
        </View>
        <View style={styles.splitBox}>
          <Text style={styles.splitLabel}>Red Score</Text>
          <Text style={[styles.splitVal, { color: tokens.negative }]}>{Math.round(healthData.red_score)}</Text>
        </View>
      </View>

      {/* Evidence rows — Technical, Safety, Sentiment */}
      <View style={styles.evidenceSection}>
        {EVIDENCE_ROWS.map((row, index) => {
          const value = healthData[row.key];
          const na = value === null;
          const band = na ? null : getBand(value as number);
          const isLast = index === EVIDENCE_ROWS.length - 1;
          return (
            <View key={row.key} style={[styles.evidenceRow, !isLast && styles.rowDivider]}>
              <View style={styles.evidenceTopRow}>
                <Text style={styles.evidenceLabel}>{row.label}</Text>
                <Text style={[styles.evidenceValue, { color: na ? tokens.textSecondary : BAND_COLOR[band as Band] }]}>
                  {na ? 'Not Available' : Math.round(value as number)}
                </Text>
              </View>
              {!na && (
                <View style={styles.evidenceBarTrack}>
                  <View
                    style={[
                      styles.evidenceBarFill,
                      { width: `${normalizedPercent(value as number)}%`, backgroundColor: BAND_COLOR[band as Band] },
                    ]}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Diversification */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Diversification</Text>
          <Text style={[styles.sectionMetaScore, { color: BAND_COLOR[divBand] }]}>
            {Math.round(healthData.diversification_score)} / 100
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

      {/* AI Bottleneck Report — restyle only, interaction logic unchanged */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Bottleneck Report</Text>
        <Pressable
          style={({ pressed }) => [styles.bottleneckBtn, pressed && styles.bottleneckBtnPressed]}
          onPress={() => {
            const prompt = `Analyze my portfolio health data and identify the top bottlenecks holding back my overall score for the ${timeframe} timeframe. What should I do to improve diversification, safety, and technical scores?`;
            handleBottleneckNav(prompt);
          }}
        >
          <IconSymbol name="sparkles" size={20} color={tokens.onAccent} />
          <Text style={styles.bottleneckBtnText}>See what's holding your portfolio back</Text>
        </Pressable>
      </View>

      {/* Holdings Impact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Holdings Impact ({timeframe})</Text>
        <View style={styles.holdingsCard}>
          {healthData.holdings.map((item, index) => renderHolding(item, index === healthData.holdings.length - 1))}
        </View>
      </View>
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
      paddingBottom: 60,
    },

    headerRow: {
      marginBottom: 20,
    },
    screenTitle: {
      fontSize: 30,
      fontWeight: '700',
      color: tokens.textPrimary,
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

    loadingText: {
      color: tokens.textSecondary,
      marginTop: 12,
      fontSize: 13,
      textAlign: 'center',
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
      fontSize: 14,
      marginBottom: 8,
      textAlign: 'center',
    },
    retryText: {
      color: tokens.accent,
      fontSize: 14,
      fontWeight: '600',
    },

    emptyStateBox: {
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 20,
      gap: 12,
    },
    emptyStateTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: tokens.textPrimary,
      textAlign: 'center',
    },
    emptyStateSubtitle: {
      fontSize: 14,
      color: tokens.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },

    gaugeSkeletonWrap: {
      alignItems: 'center',
      marginBottom: 24,
    },
    gaugeSkeletonCircle: {
      width: GAUGE_WIDTH,
      height: GAUGE_HEIGHT,
      backgroundColor: tokens.elevatedSurface,
      borderTopLeftRadius: GAUGE_WIDTH / 2,
      borderTopRightRadius: GAUGE_WIDTH / 2,
      marginBottom: 12,
    },
    skeletonLabel: {
      width: 80,
      height: 14,
      borderRadius: 4,
      backgroundColor: tokens.elevatedSurface,
    },
    skeletonValue: {
      width: 40,
      height: 14,
      borderRadius: 4,
      backgroundColor: tokens.elevatedSurface,
    },

    gaugeWrap: {
      width: GAUGE_WIDTH,
      height: GAUGE_HEIGHT,
      alignSelf: 'center',
      position: 'relative',
      marginBottom: 16,
    },
    gaugeNumeralOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 2,
      alignItems: 'center',
    },
    gaugeScoreRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    gaugeScore: {
      fontSize: 48,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    gaugeScoreSuffix: {
      fontSize: 14,
      color: tokens.textTertiary,
      marginBottom: 6,
    },

    splitScoresRow: {
      flexDirection: 'row',
      gap: 24,
      justifyContent: 'center',
      marginBottom: 28,
    },
    splitBox: {
      alignItems: 'center',
    },
    splitLabel: {
      fontSize: 12,
      color: tokens.textSecondary,
      marginBottom: 4,
    },
    splitVal: {
      fontSize: 22,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },

    evidenceSection: {
      marginBottom: 28,
    },
    evidenceRow: {
      paddingVertical: 14,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: tokens.dividerSubtle,
    },
    evidenceTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    evidenceLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    evidenceValue: {
      fontSize: 17,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    evidenceBarTrack: {
      height: 3,
      borderRadius: 2,
      backgroundColor: tokens.dividerSubtle,
      overflow: 'hidden',
      marginTop: 10,
    },
    evidenceBarFill: {
      height: 3,
      borderRadius: 2,
    },

    section: {
      marginBottom: 28,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 19,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    sectionMetaScore: {
      fontSize: 16,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },

    chartBox: {
      padding: 16,
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 14,
      marginBottom: 12,
    },
    chartLabel: {
      fontSize: 12,
      color: tokens.textTertiary,
      marginBottom: 8,
    },
    barContainer: {
      height: 24,
      flexDirection: 'row',
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: tokens.dividerSubtle,
    },
    barSegment: {
      height: '100%',
    },
    sentence: {
      fontSize: 15,
      color: tokens.textSecondary,
      lineHeight: 21,
    },

    bottleneckBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: tokens.accent,
      paddingVertical: 16,
      borderRadius: 14,
    },
    bottleneckBtnPressed: {
      opacity: 0.85,
    },
    bottleneckBtnText: {
      color: tokens.onAccent,
      fontWeight: '700',
      fontSize: 15,
    },

    holdingsCard: {
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 14,
      paddingHorizontal: 16,
    },
    holdingRow: {
      paddingVertical: 14,
    },
    holdingHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    holdingSymbol: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    scoreBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 100,
    },
    scoreBadgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    holdingMeta: {
      fontSize: 12.5,
      color: tokens.textSecondary,
    },
  });
}
