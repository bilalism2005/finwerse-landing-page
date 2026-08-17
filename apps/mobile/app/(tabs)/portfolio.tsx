import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import {
  usePortfolioStore,
  PortfolioHolding,
  HoldingPeriod,
  HoldingStatus,
} from '@/src/store/portfolioStore';
import { searchStocks } from '@/src/api/stockService';

export default function PortfolioScreen() {
  const {
    holdings,
    fetchHoldings,
    loading,
    addHolding,
    updateHolding,
    deleteHolding,
    sellHolding,
  } = usePortfolioStore();

  const [activeTab, setActiveTab] = useState<HoldingStatus>('held');
  const [refreshing, setRefreshing] = useState(false);

  // Add Stock Modal State
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [addSymbol, setAddSymbol] = useState('');
  const [symbolSuggestions, setSymbolSuggestions] = useState<Array<{ symbol: string; overall_score: number }>>([]);
  const [isSearchingSymbol, setIsSearchingSymbol] = useState(false);
  const [addQty, setAddQty] = useState('');
  const [addAvgPrice, setAddAvgPrice] = useState('');
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);
  const [addPeriod, setAddPeriod] = useState<HoldingPeriod>('medium');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Sell Stock Modal State
  const [isSellModalVisible, setSellModalVisible] = useState(false);
  const [selectedHoldingForSell, setSelectedHoldingForSell] = useState<PortfolioHolding | null>(null);
  const [sellQty, setSellQty] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingSell, setIsSubmittingSell] = useState(false);
  const [sellError, setSellError] = useState<string | null>(null);

  // Edit Stock Modal State
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [selectedHoldingForEdit, setSelectedHoldingForEdit] = useState<PortfolioHolding | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editAvgPrice, setEditAvgPrice] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPeriod, setEditPeriod] = useState<HoldingPeriod>('medium');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    await fetchHoldings(activeTab);
    setRefreshing(false);
  }, [activeTab, fetchHoldings]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Symbol Autocomplete Search
  const handleSymbolSearch = async (text: string) => {
    setAddSymbol(text.toUpperCase());
    if (text.trim().length >= 2) {
      setIsSearchingSymbol(true);
      try {
        const results = await searchStocks(text, 'medium');
        setSymbolSuggestions(results);
      } catch {
        setSymbolSuggestions([]);
      } finally {
        setIsSearchingSymbol(false);
      }
    } else {
      setSymbolSuggestions([]);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setAddSymbol('');
    setSymbolSuggestions([]);
    setAddQty('');
    setAddAvgPrice('');
    setAddDate(new Date().toISOString().split('T')[0]);
    setAddPeriod('medium');
    setAddError(null);
    setAddModalVisible(true);
  };

  // Submit Add Holding
  const handleSaveHolding = async () => {
    if (!addSymbol.trim()) {
      setAddError('Please enter or select a stock symbol.');
      return;
    }
    const qtyNum = parseInt(addQty, 10);
    if (!qtyNum || qtyNum <= 0) {
      setAddError('Quantity must be greater than 0.');
      return;
    }
    const priceNum = parseFloat(addAvgPrice);
    if (!priceNum || priceNum <= 0) {
      setAddError('Average buy price must be greater than 0.');
      return;
    }
    if (!addDate.trim()) {
      setAddError('Purchase date is required (YYYY-MM-DD).');
      return;
    }

    setAddError(null);
    setIsSubmittingAdd(true);
    try {
      await addHolding({
        stock_symbol: addSymbol.trim().toUpperCase(),
        quantity: qtyNum,
        avg_price: priceNum,
        purchase_date: addDate.trim(),
        intended_holding_period: addPeriod,
      });
      setAddModalVisible(false);
    } catch (e: any) {
      setAddError(e.message || 'Failed to save position.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open Sell Modal
  const handleOpenSellModal = (item: PortfolioHolding) => {
    setSelectedHoldingForSell(item);
    setSellQty(item.quantity.toString());
    setSellPrice(item.avg_price.toString());
    setSellDate(new Date().toISOString().split('T')[0]);
    setSellError(null);
    setSellModalVisible(true);
  };

  // Submit Sell Holding
  const handleConfirmSell = async () => {
    if (!selectedHoldingForSell) return;

    const qtyNum = parseInt(sellQty, 10);
    if (!qtyNum || qtyNum <= 0) {
      setSellError('Sell quantity must be greater than 0.');
      return;
    }
    if (qtyNum > selectedHoldingForSell.quantity) {
      setSellError(`Cannot sell more than held quantity (${selectedHoldingForSell.quantity}).`);
      return;
    }
    const priceNum = parseFloat(sellPrice);
    if (!priceNum || priceNum < 0) {
      setSellError('Selling price must be valid.');
      return;
    }

    setSellError(null);
    setIsSubmittingSell(true);
    try {
      await sellHolding(selectedHoldingForSell.id, {
        sold_quantity: qtyNum,
        sold_price: priceNum,
        sold_date: sellDate.trim(),
      });
      setSellModalVisible(false);
    } catch (e: any) {
      setSellError(e.message || 'Failed to record sale.');
    } finally {
      setIsSubmittingSell(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: PortfolioHolding) => {
    setSelectedHoldingForEdit(item);
    setEditQty(item.quantity.toString());
    setEditAvgPrice(item.avg_price.toString());
    setEditDate(item.purchase_date);
    setEditPeriod(item.intended_holding_period);
    setEditError(null);
    setEditModalVisible(true);
  };

  // Submit Edit Holding
  const handleSaveEdit = async () => {
    if (!selectedHoldingForEdit) return;

    const qtyNum = parseInt(editQty, 10);
    if (!qtyNum || qtyNum <= 0) {
      setEditError('Quantity must be greater than 0.');
      return;
    }
    const priceNum = parseFloat(editAvgPrice);
    if (!priceNum || priceNum <= 0) {
      setEditError('Average price must be greater than 0.');
      return;
    }

    setEditError(null);
    setIsSubmittingEdit(true);
    try {
      await updateHolding(selectedHoldingForEdit.id, {
        quantity: qtyNum,
        avg_price: priceNum,
        purchase_date: editDate.trim(),
        intended_holding_period: editPeriod,
      });
      setEditModalVisible(false);
    } catch (e: any) {
      setEditError(e.message || 'Failed to update position.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete Holding with Confirmation
  const handleDelete = (id: string, symbol: string) => {
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
  };

  const renderItem = ({ item }: { item: PortfolioHolding }) => {
    const isHeld = item.status === 'held';
    const totalInvested = item.quantity * item.avg_price;
    const isSold = item.status === 'sold';
    const soldTotal = isSold && item.sold_quantity && item.sold_price ? item.sold_quantity * item.sold_price : null;
    const pnl = isSold && soldTotal ? soldTotal - (item.sold_quantity! * item.avg_price) : null;
    const pnlPct = isSold && pnl && item.sold_quantity ? (pnl / (item.sold_quantity * item.avg_price)) * 100 : null;

    return (
      <View style={styles.holdingCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.symbol}>{item.stock_symbol}</Text>
          <View style={[styles.statusBadge, isHeld ? styles.statusHeld : styles.statusSold]}>
            <Text style={styles.statusText}>{isHeld ? 'HELD' : 'SOLD'}</Text>
          </View>
        </View>

        <View style={styles.cardGrid}>
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>{isHeld ? 'Quantity' : 'Sold Qty'}</Text>
            <Text style={styles.metricVal}>{isHeld ? item.quantity : item.sold_quantity || item.quantity}</Text>
          </View>

          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>Avg Buy Price</Text>
            <Text style={styles.metricVal}>₹{item.avg_price.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>{isHeld ? 'Total Invested' : 'Sold Price'}</Text>
            <Text style={styles.metricVal}>
              {isHeld ? `₹${Math.round(totalInvested).toLocaleString('en-IN')}` : `₹${item.sold_price || '—'}`}
            </Text>
          </View>

          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>{isHeld ? 'Holding Period' : 'Realized P&L'}</Text>
            {isHeld ? (
              <Text style={styles.metricVal}>
                {item.intended_holding_period ? item.intended_holding_period.toUpperCase() : 'MEDIUM'}
              </Text>
            ) : pnl !== null ? (
              <Text style={[styles.metricVal, { color: pnl >= 0 ? '#10B981' : '#EF4444' }]}>
                {pnl >= 0 ? '+' : ''}₹{Math.round(pnl).toLocaleString('en-IN')} ({pnlPct?.toFixed(1)}%)
              </Text>
            ) : (
              <Text style={styles.metricVal}>—</Text>
            )}
          </View>
        </View>

        <View style={styles.dateRow}>
          <Text style={styles.dateText}>
            Bought on: {item.purchase_date} {isSold && item.sold_date ? ` • Sold on: ${item.sold_date}` : ''}
          </Text>
        </View>

        <View style={styles.cardActions}>
          {isHeld && (
            <TouchableOpacity style={[styles.actionBtn, styles.sellBtn]} onPress={() => handleOpenSellModal(item)}>
              <Text style={styles.sellBtnText}>Sell</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEditModal(item)}>
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item.id, item.stock_symbol)}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabToggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, activeTab === 'held' && styles.activeToggle]}
          onPress={() => setActiveTab('held')}
        >
          <Text style={[styles.toggleText, activeTab === 'held' && styles.activeToggleText]}>
            Currently Held
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, activeTab === 'sold' && styles.activeToggle]}
          onPress={() => setActiveTab('sold')}
        >
          <Text style={[styles.toggleText, activeTab === 'sold' && styles.activeToggleText]}>
            Sold Positions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Holdings List / Empty State */}
      {loading && holdings.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B7FF00" />
          <Text style={styles.loadingText}>Loading positions...</Text>
        </View>
      ) : holdings.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#B7FF00" />}
        >
          <Text style={styles.emptyTitle}>No positions found.</Text>
          <Text style={styles.emptySubtitle}>Add your first stock to unlock Portfolio Health.</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={holdings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#B7FF00" />}
        />
      )}

      {/* Floating Add Stock Button */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenAddModal} activeOpacity={0.85}>
        <Text style={styles.fabText}>+ Add Stock</Text>
      </TouchableOpacity>

      {/* ===================== ADD STOCK MODAL ===================== */}
      <Modal visible={isAddModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Stock Position</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {addError ? <Text style={styles.modalError}>{addError}</Text> : null}

              {/* Stock Symbol Autocomplete */}
              <Text style={styles.inputLabel}>Stock Symbol / Company</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. RELIANCE, TCS, INFY"
                placeholderTextColor="#666"
                value={addSymbol}
                onChangeText={handleSymbolSearch}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {isSearchingSymbol && <ActivityIndicator size="small" color="#B7FF00" style={{ alignSelf: 'flex-start', marginVertical: 4 }} />}

              {symbolSuggestions.length > 0 && (
                <View style={styles.suggestionBox}>
                  {symbolSuggestions.map((item) => (
                    <TouchableOpacity
                      key={item.symbol}
                      style={styles.suggestionRow}
                      onPress={() => {
                        setAddSymbol(item.symbol);
                        setSymbolSuggestions([]);
                      }}
                    >
                      <Text style={styles.suggestionSymbol}>{item.symbol}</Text>
                      <Text style={styles.suggestionScore}>Score: {Math.round(item.overall_score)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Quantity */}
              <Text style={styles.inputLabel}>Quantity</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 50"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={addQty}
                onChangeText={setAddQty}
              />

              {/* Avg Price */}
              <Text style={styles.inputLabel}>Average Buy Price (₹)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 2450.50"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
                value={addAvgPrice}
                onChangeText={setAddAvgPrice}
              />

              {/* Purchase Date */}
              <Text style={styles.inputLabel}>Purchase Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#666"
                value={addDate}
                onChangeText={setAddDate}
              />

              {/* Holding Period */}
              <Text style={styles.inputLabel}>Intended Holding Period</Text>
              <View style={styles.periodPillRow}>
                {(['short', 'medium', 'long'] as HoldingPeriod[]).map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[styles.periodPill, addPeriod === period && styles.periodPillActive]}
                    onPress={() => setAddPeriod(period)}
                  >
                    <Text style={[styles.periodPillText, addPeriod === period && styles.periodPillTextActive]}>
                      {period.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.modalSubmitBtn, isSubmittingAdd && styles.btnDisabled]}
                onPress={handleSaveHolding}
                disabled={isSubmittingAdd}
              >
                {isSubmittingAdd ? (
                  <ActivityIndicator color="#0D0D0D" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Position</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===================== SELL STOCK MODAL ===================== */}
      <Modal visible={isSellModalVisible} animationType="slide" transparent onRequestClose={() => setSellModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Sale - {selectedHoldingForSell?.stock_symbol}</Text>
              <TouchableOpacity onPress={() => setSellModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {sellError ? <Text style={styles.modalError}>{sellError}</Text> : null}

              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>
                  Held Quantity: <Text style={{ fontWeight: 'bold', color: '#fff' }}>{selectedHoldingForSell?.quantity}</Text>
                </Text>
                <Text style={styles.infoBannerText}>
                  Buy Price: <Text style={{ fontWeight: 'bold', color: '#fff' }}>₹{selectedHoldingForSell?.avg_price}</Text>
                </Text>
              </View>

              {/* Sold Quantity */}
              <Text style={styles.inputLabel}>Sold Quantity</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={`Max ${selectedHoldingForSell?.quantity}`}
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={sellQty}
                onChangeText={setSellQty}
              />

              {/* Sold Price */}
              <Text style={styles.inputLabel}>Selling Price per share (₹)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 2600.00"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
                value={sellPrice}
                onChangeText={setSellPrice}
              />

              {/* Sold Date */}
              <Text style={styles.inputLabel}>Sale Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#666"
                value={sellDate}
                onChangeText={setSellDate}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.modalSubmitBtn, styles.sellSubmitBtn, isSubmittingSell && styles.btnDisabled]}
                onPress={handleConfirmSell}
                disabled={isSubmittingSell}
              >
                {isSubmittingSell ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={[styles.modalSubmitText, { color: '#FFF' }]}>Confirm Sale</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===================== EDIT STOCK MODAL ===================== */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Position - {selectedHoldingForEdit?.stock_symbol}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {editError ? <Text style={styles.modalError}>{editError}</Text> : null}

              {/* Quantity */}
              <Text style={styles.inputLabel}>Quantity</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Quantity"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={editQty}
                onChangeText={setEditQty}
              />

              {/* Avg Price */}
              <Text style={styles.inputLabel}>Average Price (₹)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Average Price"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
                value={editAvgPrice}
                onChangeText={setEditAvgPrice}
              />

              {/* Purchase Date */}
              <Text style={styles.inputLabel}>Purchase Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#666"
                value={editDate}
                onChangeText={setEditDate}
              />

              {/* Holding Period */}
              <Text style={styles.inputLabel}>Intended Holding Period</Text>
              <View style={styles.periodPillRow}>
                {(['short', 'medium', 'long'] as HoldingPeriod[]).map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[styles.periodPill, editPeriod === period && styles.periodPillActive]}
                    onPress={() => setEditPeriod(period)}
                  >
                    <Text style={[styles.periodPillText, editPeriod === period && styles.periodPillTextActive]}>
                      {period.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.modalSubmitBtn, isSubmittingEdit && styles.btnDisabled]}
                onPress={handleSaveEdit}
                disabled={isSubmittingEdit}
              >
                {isSubmittingEdit ? (
                  <ActivityIndicator color="#0D0D0D" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    padding: 16,
    paddingTop: 54,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  tabToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    padding: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeToggle: {
    backgroundColor: '#2A2A2A',
  },
  toggleText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 14,
  },
  activeToggleText: {
    color: '#FFF',
    fontWeight: '700',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    paddingBottom: 90,
  },
  holdingCard: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#141414',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  symbol: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusHeld: {
    backgroundColor: '#133918',
  },
  statusSold: {
    backgroundColor: '#333333',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'transparent',
    rowGap: 12,
    marginBottom: 12,
  },
  metricCol: {
    width: '50%',
    backgroundColor: 'transparent',
  },
  metricLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EEE',
  },
  dateRow: {
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingTop: 8,
    marginBottom: 10,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    backgroundColor: 'transparent',
    paddingTop: 4,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  sellBtn: {
    backgroundColor: '#1E3A1E',
    borderColor: '#2E5A2E',
  },
  sellBtnText: {
    color: '#34D399',
    fontWeight: '700',
    fontSize: 13,
  },
  deleteBtn: {
    backgroundColor: '#3A1414',
    borderColor: '#551C1C',
  },
  actionText: {
    color: '#DDD',
    fontWeight: '600',
    fontSize: 13,
  },
  deleteText: {
    color: '#F87171',
    fontWeight: '600',
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#10B981',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    color: '#0D0D0D',
    fontWeight: '800',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  closeBtn: {
    fontSize: 20,
    color: '#888',
    padding: 4,
  },
  modalError: {
    backgroundColor: '#3A1414',
    color: '#F87171',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 13,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#AAA',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#2E2E2E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 15,
  },
  suggestionBox: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 160,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  suggestionSymbol: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  suggestionScore: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 13,
  },
  periodPillRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  periodPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  periodPillActive: {
    backgroundColor: '#2A2A2A',
    borderColor: '#10B981',
  },
  periodPillText: {
    color: '#777',
    fontWeight: '600',
    fontSize: 12,
  },
  periodPillTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  modalSubmitBtn: {
    backgroundColor: '#B7FF00',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  sellSubmitBtn: {
    backgroundColor: '#10B981',
  },
  modalSubmitText: {
    color: '#0D0D0D',
    fontWeight: '800',
    fontSize: 16,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  infoBanner: {
    backgroundColor: '#1F1F1F',
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoBannerText: {
    color: '#AAA',
    fontSize: 13,
  },
});
