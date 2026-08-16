import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import { usePortfolioStore, PortfolioHolding } from '@/src/store/portfolioStore';
import Colors from '@/constants/Colors';

export default function PortfolioScreen() {
  const { holdings, fetchHoldings, loading, deleteHolding } = usePortfolioStore();
  const [activeTab, setActiveTab] = useState<'held' | 'sold'>('held');

  useEffect(() => {
    fetchHoldings(activeTab);
  }, [activeTab]);

  const handleDelete = (id: string) => {
    Alert.alert("Delete Holding", "Are you sure you want to delete this position?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteHolding(id) }
    ]);
  };

  const renderItem = ({ item }: { item: PortfolioHolding }) => (
    <View style={styles.holdingCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.symbol}>{item.stock_symbol}</Text>
        <Text style={styles.statusBadge}>{item.status.toUpperCase()}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text>Qty: {item.quantity}</Text>
        <Text>Avg Price: ₹{item.avg_price}</Text>
        <Text>Period: {item.intended_holding_period}</Text>
        <Text>Date: {item.purchase_date}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        {item.status === 'held' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
            <Text style={styles.actionText}>Sell</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item.id)}>
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabToggle}>
        <TouchableOpacity 
          style={[styles.toggleBtn, activeTab === 'held' && styles.activeToggle]}
          onPress={() => setActiveTab('held')}
        >
          <Text style={styles.toggleText}>Currently Held</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleBtn, activeTab === 'sold' && styles.activeToggle]}
          onPress={() => setActiveTab('sold')}
        >
          <Text style={styles.toggleText}>Sold Positions</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><Text>Loading portfolio...</Text></View>
      ) : holdings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No positions found.</Text>
          <Text style={styles.emptySubtitle}>Add your first stock to unlock Portfolio Health.</Text>
        </View>
      ) : (
        <FlatList
          data={holdings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => {}}>
        <Text style={styles.fabText}>+ Add Stock</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#444',
  },
  toggleBtn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  activeToggle: {
    backgroundColor: '#333',
  },
  toggleText: {
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  list: {
    paddingBottom: 80,
  },
  holdingCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: '#1a1a1a',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  symbol: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#444',
    overflow: 'hidden',
  },
  cardBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  deleteBtn: {
    backgroundColor: '#4a1111',
  },
  actionText: {
    fontWeight: 'bold',
  },
  deleteText: {
    color: '#ff6b6b',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#2e7d32',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    elevation: 4,
  },
  fabText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
