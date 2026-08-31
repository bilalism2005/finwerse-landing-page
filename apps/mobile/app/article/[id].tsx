import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getArticleDetail, ArticleDetail } from '../../src/api/sentimentService';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { useThemeStore, useThemeTokens } from '../../src/store/themeStore';
import type { ThemeTokens } from '../../src/theme/tokens';
import { getBand, getBandColor, getBadgeBackground, Band } from '../../src/theme/score-band';
import { extractDomain } from '../../src/utils/url';

// spec/ui.md Score hero: 3-way status pill mapping — same mapping as stock/[symbol].tsx,
// reused rather than inventing a new one for this screen.
const BAND_STATUS_WORD: Record<Band, string> = {
  green: 'Strong',
  amber: 'Steady',
  red: 'Weak',
};

const SKELETON_BODY_LINES = [0, 1, 2, 3, 4];

export default function ArticleDetailScreen() {
  const tokens = useThemeTokens();
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArticle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchArticle = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const article = await getArticleDetail(id);
      setData(article);
    } catch (e: any) {
      console.error('Failed to load article:', e);
      setError("Couldn't load this article.");
    } finally {
      setLoading(false);
    }
  };

  const dateStr = data?.article_date
    ? new Date(data.article_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Recent';

  const domain = data ? extractDomain(data.source_url) : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header row — back button + stock symbol badge */}
        <View style={styles.headerTopRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.headerIconButton, pressed && styles.headerIconButtonPressed]}
          >
            <IconSymbol name="chevron.left" size={20} color={tokens.textPrimary} />
          </Pressable>

          {data && (
            <View style={styles.symbolBadge}>
              <Text style={styles.symbolText}>{data.stock_symbol}</Text>
            </View>
          )}
        </View>

        {loading ? (
          <>
            {/* Score + headline + metadata skeleton */}
            <View style={styles.skeletonScorePill} />
            <View style={styles.skeletonHeadlineLineFull} />
            <View style={styles.skeletonHeadlineLineShort} />
            <View style={styles.skeletonMetaLine} />

            {/* Body skeleton */}
            <View style={styles.bodySkeletonBlock}>
              {SKELETON_BODY_LINES.map((i) => (
                <View
                  key={i}
                  style={[styles.skeletonBodyLine, i === SKELETON_BODY_LINES.length - 1 && styles.skeletonBodyLineShort]}
                />
              ))}
            </View>
          </>
        ) : error || !data ? (
          <Pressable style={styles.errorBox} onPress={fetchArticle}>
            <Text style={styles.errorText}>{error || "Couldn't load this article."}</Text>
            <Text style={styles.retryText}>Tap to Retry</Text>
          </Pressable>
        ) : (
          <>
            {/* Sentiment score */}
            {(() => {
              const numericScore = Math.round(data.polarity * 100);
              const band = getBand(numericScore);
              const color = getBandColor(tokens, band);
              return (
                <View style={styles.scoreSection}>
                  <View style={styles.scoreRow}>
                    <Text style={[styles.scoreValue, { color }]}>{numericScore}</Text>
                    <Text style={styles.scoreSuffix}> / 100</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: getBadgeBackground(tokens, band, mode) }]}>
                    <View style={[styles.statusDot, { backgroundColor: color }]} />
                    <Text style={[styles.statusPillText, { color }]}>{BAND_STATUS_WORD[band]} sentiment</Text>
                  </View>
                </View>
              );
            })()}

            {/* Headline */}
            <Text style={styles.headline}>{data.headline}</Text>

            {/* Metadata row */}
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{dateStr}</Text>
              <Text style={styles.metaDivider}>·</Text>
              <Text style={styles.metaText} numberOfLines={1}>
                {domain}
              </Text>
            </View>

            {/* Body — branches on full_text/summary nullability */}
            {data.full_text ? (
              <View style={styles.bodySection}>
                <Text style={styles.bodyText}>{data.full_text}</Text>
                <Pressable onPress={() => Linking.openURL(data.source_url)} style={styles.attributionRow}>
                  <Text style={styles.attributionText}>Source: {domain}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.bodySection}>
                {data.summary ? (
                  <Text style={styles.bodyText}>{data.summary}</Text>
                ) : (
                  <Text style={styles.notAvailableText}>Full article text isn't available for this story.</Text>
                )}
                <Pressable
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
                  onPress={() => Linking.openURL(data.source_url)}
                >
                  <Text style={styles.primaryButtonText}>Read full article on {domain}</Text>
                </Pressable>
              </View>
            )}
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
      marginBottom: 20,
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
    symbolBadge: {
      backgroundColor: tokens.elevatedSurface,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 8,
    },
    symbolText: { fontSize: 13, fontWeight: '700', color: tokens.textPrimary, letterSpacing: 0.5 },
    // Loading skeleton — matches the populated layout shape (header metadata + several body lines)
    skeletonScorePill: {
      width: 120,
      height: 50,
      borderRadius: 8,
      backgroundColor: tokens.elevatedSurface,
      marginBottom: 20,
    },
    skeletonHeadlineLineFull: {
      width: '100%',
      height: 24,
      borderRadius: 4,
      backgroundColor: tokens.elevatedSurface,
      marginBottom: 10,
    },
    skeletonHeadlineLineShort: {
      width: '65%',
      height: 24,
      borderRadius: 4,
      backgroundColor: tokens.elevatedSurface,
      marginBottom: 16,
    },
    skeletonMetaLine: {
      width: 160,
      height: 13,
      borderRadius: 4,
      backgroundColor: tokens.elevatedSurface,
      marginBottom: 24,
    },
    bodySkeletonBlock: {
      gap: 10,
    },
    skeletonBodyLine: {
      width: '100%',
      height: 14,
      borderRadius: 4,
      backgroundColor: tokens.elevatedSurface,
    },
    skeletonBodyLineShort: {
      width: '55%',
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
    scoreSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    scoreValue: {
      fontSize: 50,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    scoreSuffix: {
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
    headline: {
      fontSize: 22,
      fontWeight: '700',
      color: tokens.textPrimary,
      lineHeight: 29,
      marginBottom: 12,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 24,
    },
    metaText: {
      fontSize: 13,
      color: tokens.textTertiary,
      flexShrink: 1,
    },
    metaDivider: {
      fontSize: 13,
      color: tokens.textTertiary,
    },
    bodySection: {
      marginBottom: 12,
    },
    bodyText: {
      fontSize: 16,
      color: tokens.textPrimary,
      lineHeight: 25,
      marginBottom: 20,
    },
    notAvailableText: {
      fontSize: 15,
      color: tokens.textSecondary,
      lineHeight: 22,
      marginBottom: 20,
    },
    attributionRow: {
      paddingVertical: 4,
    },
    attributionText: {
      fontSize: 12,
      color: tokens.textTertiary,
    },
    primaryButton: {
      backgroundColor: tokens.accent,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    primaryButtonPressed: {
      opacity: 0.85,
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: tokens.onAccent,
    },
  });
}
