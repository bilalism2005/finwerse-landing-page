import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSentimentStore, Article } from '../../src/store/sentimentStore';
import { IconSymbol } from '../../components/ui/IconSymbol';

export default function SentimentFeedScreen() {
  const { articles, isLoading, fetchPortfolioSentiment, searchSentiment } = useSentimentStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Default view on mount
    fetchPortfolioSentiment();
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      searchSentiment(searchQuery);
    } else {
      setIsSearching(false);
      fetchPortfolioSentiment();
    }
  };

  const getPolarityColor = (polarity: number) => {
    if (polarity > 0.1) return '#34C759'; // Green
    if (polarity < -0.1) return '#FF3B30'; // Red
    return '#FF9500'; // Amber
  };

  const renderArticle = ({ item }: { item: Article }) => (
    <TouchableOpacity 
      style={styles.articleCard}
      onPress={() => Linking.openURL(item.source_url)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.symbol}>{item.stock_symbol}</Text>
        <View style={[styles.badge, { backgroundColor: getPolarityColor(item.polarity) }]}>
          <Text style={styles.badgeText}>
            {item.polarity > 0.1 ? 'Positive' : item.polarity < -0.1 ? 'Negative' : 'Neutral'}
          </Text>
        </View>
      </View>
      <Text style={styles.date}>{new Date(item.article_date).toLocaleDateString()}</Text>
      <Text style={styles.headline} numberOfLines={2}>Read article on {new URL(item.source_url).hostname}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Market Sentiment</Text>
      </View>
      
      {/* Hick's Law: Simple unified search overrides default view */}
      <View style={styles.searchContainer}>
        <IconSymbol name="magnifyingglass" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stock symbol..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          autoCapitalize="characters"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); setIsSearching(false); fetchPortfolioSentiment(); }}>
            <IconSymbol name="xmark.circle.fill" size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.viewLabel}>
        {isSearching ? `Results for "${searchQuery.toUpperCase()}"` : 'My Portfolio News'}
      </Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderArticle}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No articles found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { padding: 16, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5E5EA', margin: 16, paddingHorizontal: 12, borderRadius: 10, height: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
  viewLabel: { paddingHorizontal: 16, marginBottom: 8, fontSize: 14, fontWeight: '600', color: '#666', textTransform: 'uppercase' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  articleCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  symbol: { fontSize: 16, fontWeight: 'bold', color: '#1C1C1E' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  date: { fontSize: 13, color: '#8E8E93', marginBottom: 8 },
  headline: { fontSize: 15, color: '#333', lineHeight: 20 },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#8E8E93', fontSize: 16 },
});
