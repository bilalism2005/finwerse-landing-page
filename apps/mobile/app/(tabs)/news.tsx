import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  Linking, 
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSentimentStore, Article } from '../../src/store/sentimentStore';
import { IconSymbol } from '../../components/ui/IconSymbol';

export default function SentimentFeedScreen() {
  const { articles, isLoading, fetchMarketNews, fetchPortfolioSentiment, searchSentiment } = useSentimentStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'portfolio'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNews();
  }, [activeTab]);

  const loadNews = async () => {
    if (activeTab === 'all') {
      await fetchMarketNews();
    } else {
      await fetchPortfolioSentiment();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (searchQuery.trim()) {
      await searchSentiment(searchQuery);
    } else {
      await loadNews();
    }
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
      return { label: 'Bullish', bg: 'rgba(52, 199, 89, 0.15)', text: '#34C759', border: 'rgba(52, 199, 89, 0.3)' };
    }
    if (polarity < -0.15) {
      return { label: 'Bearish', bg: 'rgba(255, 69, 58, 0.15)', text: '#FF453A', border: 'rgba(255, 69, 58, 0.3)' };
    }
    return { label: 'Neutral', bg: 'rgba(255, 149, 0, 0.15)', text: '#FF9500', border: 'rgba(255, 149, 0, 0.3)' };
  };

  const extractHeadline = (url: string) => {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;
      const parts = pathname.split('/').filter(p => p.length > 0);
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
    const dateStr = item.article_date ? new Date(item.article_date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) : 'Recent';

    return (
      <TouchableOpacity 
        style={styles.articleCard}
        onPress={() => Linking.openURL(item.source_url)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.symbolBadge}>
            <Text style={styles.symbolText}>{item.stock_symbol}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <View style={[styles.badgeDot, { backgroundColor: badge.text }]} />
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <Text style={styles.headline} numberOfLines={3}>{headline}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.sourceText}>🌐 {domain}</Text>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Market News</Text>
        <Text style={styles.headerSubtitle}>Real-time financial sentiment & corporate coverage</Text>
      </View>

      {/* Mode Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
          onPress={() => { setActiveTab('all'); setSearchQuery(''); }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'all' && styles.tabButtonTextActive]}>
            All Market News
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'portfolio' && styles.tabButtonActive]}
          onPress={() => { setActiveTab('portfolio'); setSearchQuery(''); }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'portfolio' && styles.tabButtonTextActive]}>
            My Portfolio News
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <IconSymbol name="magnifyingglass" size={18} color="#777" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by symbol or company (e.g. INFY, ZOMATO)..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="characters"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
            <IconSymbol name="xmark.circle.fill" size={18} color="#777" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B8F567" />
          <Text style={styles.loadingText}>Fetching Latest News & Sentiment...</Text>
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderArticle}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B8F567" />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol name="newspaper" size={40} color="#555" />
              <Text style={styles.emptyTitle}>No Articles Found</Text>
              <Text style={styles.emptyText}>
                {searchQuery ? `No news recorded matching "${searchQuery}".` : 'Pull down to refresh latest market news.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  headerSubtitle: { fontSize: 13, color: '#888', marginTop: 3 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1A1A1A', alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  tabButtonActive: { backgroundColor: '#B8F567', borderColor: '#B8F567' },
  tabButtonText: { fontSize: 13, fontWeight: '700', color: '#AAA' },
  tabButtonTextActive: { color: '#0D0D0D' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, borderRadius: 10, height: 44, borderWidth: 1, borderColor: '#262626' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#FFF' },
  clearBtn: { padding: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  articleCard: { backgroundColor: '#161616', padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#262626' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  symbolBadge: { backgroundColor: '#222', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#333' },
  symbolText: { fontSize: 13, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, gap: 5 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  headline: { fontSize: 15, fontWeight: '600', color: '#DDD', lineHeight: 21, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#222', paddingTop: 10 },
  sourceText: { fontSize: 12, color: '#888', fontWeight: '500' },
  dateText: { fontSize: 12, color: '#666' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888', marginTop: 12, fontSize: 13 },
  emptyState: { padding: 40, alignItems: 'center', marginTop: 30 },
  emptyTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptyText: { color: '#888', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 }
});
