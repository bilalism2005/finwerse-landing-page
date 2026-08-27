import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSentimentStore, Article } from '../src/store/sentimentStore';
import { IconSymbol } from '../components/ui/IconSymbol';
import { useThemeTokens } from '../src/store/themeStore';
import type { ThemeTokens } from '../src/theme/tokens';
import { withAlphaFraction as withAlpha } from '../src/theme/color';

const SKELETON_ROWS = [0, 1, 2, 3, 4, 5];

export default function SentimentFeedScreen() {
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { articles, isLoading, error, fetchMarketNews, fetchPortfolioSentiment, searchSentiment } =
    useSentimentStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'portfolio'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadNews = async () => {
    if (activeTab === 'all') {
      await fetchMarketNews();
    } else {
      await fetchPortfolioSentiment();
    }
  };

  const reload = async () => {
    if (searchQuery.trim()) {
      await searchSentiment(searchQuery);
    } else {
      await loadNews();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchSentiment(searchQuery);
    } else {
      loadNews();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    loadNews();
  };

  const getPolarityBadge = (polarity: number) => {
    if (polarity > 0.15) {
      return { label: 'Bullish', color: tokens.positive };
    }
    if (polarity < -0.15) {
      return { label: 'Bearish', color: tokens.negative };
    }
    return { label: 'Neutral', color: tokens.warning };
  };

  const extractHeadline = (url: string) => {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;
      const parts = pathname.split('/').filter((p) => p.length > 0);
      const lastPart = parts[parts.length - 1] || '';
      const cleaned = lastPart
        .replace(/\.html?$/i, '')
        .replace(/-\d+$/, '')
        .split('-')
        .join(' ');
      if (cleaned.length > 10) {
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
      return `Article on ${parsed.hostname.replace('www.', '')}`;
    } catch {
      return 'Market Intelligence & Analysis';
    }
  };

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'News Source';
    }
  };

  const renderArticle = ({ item }: { item: Article }) => {
    const badge = getPolarityBadge(item.polarity);
    const domain = extractDomain(item.source_url);
    const headline = extractHeadline(item.source_url);
    const dateStr = item.article_date
      ? new Date(item.article_date).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Recent';

    return (
      <TouchableOpacity
        style={styles.articleRow}
        onPress={() => Linking.openURL(item.source_url)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.symbolBadge}>
            <Text style={styles.symbolText}>{item.stock_symbol}</Text>
          </View>
          <View
            style={[
              styles.sentimentBadge,
              { backgroundColor: withAlpha(badge.color, 0.15), borderColor: withAlpha(badge.color, 0.35) },
            ]}
          >
            <View style={[styles.badgeDot, { backgroundColor: badge.color }]} />
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        <Text style={styles.headline} numberOfLines={3}>
          {headline}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.sourceText} numberOfLines={1}>
            {domain}
          </Text>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const showSkeleton = isLoading && !refreshing;
  const showError = !showSkeleton && !!error && articles.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header row */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Market News</Text>
        <Text style={styles.headerSubtitle}>Real-time financial sentiment & corporate coverage</Text>
      </View>

      {/* Mode switcher */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, activeTab === 'all' && styles.segmentSelected]}
          onPress={() => {
            setActiveTab('all');
            setSearchQuery('');
          }}
        >
          <Text style={[styles.segmentText, activeTab === 'all' && styles.segmentTextSelected]}>
            All Market News
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeTab === 'portfolio' && styles.segmentSelected]}
          onPress={() => {
            setActiveTab('portfolio');
            setSearchQuery('');
          }}
        >
          <Text style={[styles.segmentText, activeTab === 'portfolio' && styles.segmentTextSelected]}>
            My Portfolio News
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search field */}
      <View style={styles.searchField}>
        <IconSymbol name="magnifyingglass" size={18} color={tokens.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by symbol or company (e.g. INFY, ZOMATO)..."
          placeholderTextColor={tokens.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
            <IconSymbol name="xmark.circle.fill" size={18} color={tokens.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {showSkeleton ? (
        <View style={styles.listContent}>
          {SKELETON_ROWS.map((i) => (
            <View key={i} style={styles.articleRow}>
              <View style={styles.cardHeader}>
                <View style={styles.skeletonSymbolBadge} />
                <View style={styles.skeletonSentimentBadge} />
              </View>
              <View style={styles.skeletonHeadlineLineFull} />
              <View style={styles.skeletonHeadlineLineShort} />
              <View style={styles.cardFooter}>
                <View style={styles.skeletonFooterLine} />
                <View style={styles.skeletonFooterLineShort} />
              </View>
            </View>
          ))}
        </View>
      ) : showError ? (
        <View style={styles.listContent}>
          <TouchableOpacity style={styles.errorBox} onPress={reload}>
            <Text style={styles.errorText}>Couldn't load the news feed. Please try again.</Text>
            <Text style={styles.retryText}>Tap to Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderArticle}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.accent} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol name="newspaper.fill" size={40} color={tokens.textTertiary} />
              <Text style={styles.emptyTitle}>No Articles Found</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? `No news recorded matching "${searchQuery}".`
                  : 'Pull down to refresh latest market news.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(tokens: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.canvas },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
    headerTitle: { fontSize: 30, fontWeight: '700', color: tokens.textPrimary },
    headerSubtitle: { fontSize: 13, color: tokens.textSecondary, marginTop: 3 },
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
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: 'transparent',
    },
    segmentSelected: { backgroundColor: tokens.accent },
    segmentText: { fontSize: 13, fontWeight: '600', color: tokens.textSecondary },
    segmentTextSelected: { color: tokens.onAccent },
    searchField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: tokens.elevatedSurface,
      marginHorizontal: 20,
      marginBottom: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    searchInput: { flex: 1, color: tokens.textPrimary, paddingVertical: 14, fontSize: 15 },
    clearBtn: { padding: 4 },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    articleRow: {
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: tokens.dividerSubtle,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    symbolBadge: {
      backgroundColor: tokens.elevatedSurface,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    symbolText: { fontSize: 13, fontWeight: '700', color: tokens.textPrimary, letterSpacing: 0.5 },
    sentimentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      gap: 5,
    },
    badgeDot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    headline: { fontSize: 15, fontWeight: '600', color: tokens.textPrimary, lineHeight: 21, marginBottom: 12 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    sourceText: { fontSize: 12.5, color: tokens.textTertiary, fontWeight: '500', flexShrink: 1 },
    dateText: { fontSize: 12.5, color: tokens.textTertiary },
    errorBox: {
      padding: 20,
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 12,
    },
    errorText: { color: tokens.negative, fontSize: 14, marginBottom: 8, textAlign: 'center' },
    retryText: { color: tokens.accent, fontSize: 14, fontWeight: '600' },
    emptyState: { padding: 40, alignItems: 'center', marginTop: 30 },
    emptyTitle: { color: tokens.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 12 },
    emptyText: { color: tokens.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
    // Skeleton loading state (item 5, spec/ui.md → Screen: Market News) — matches populated row shape.
    skeletonSymbolBadge: { width: 56, height: 22, borderRadius: 8, backgroundColor: tokens.elevatedSurface },
    skeletonSentimentBadge: { width: 72, height: 22, borderRadius: 8, backgroundColor: tokens.elevatedSurface },
    skeletonHeadlineLineFull: {
      width: '100%',
      height: 14,
      borderRadius: 4,
      backgroundColor: tokens.elevatedSurface,
      marginBottom: 8,
    },
    skeletonHeadlineLineShort: {
      width: '60%',
      height: 14,
      borderRadius: 4,
      backgroundColor: tokens.elevatedSurface,
      marginBottom: 12,
    },
    skeletonFooterLine: { width: 90, height: 10, borderRadius: 4, backgroundColor: tokens.elevatedSurface },
    skeletonFooterLineShort: { width: 60, height: 10, borderRadius: 4, backgroundColor: tokens.elevatedSurface },
  });
}
