import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { HoldingPeriod, PortfolioHoldingCreate } from '@/src/store/portfolioStore';
import type { ThemeTokens } from '@/src/theme/tokens';
import { getBand, getBandColor } from '@/src/theme/score-band';
import { searchStocks } from '@/src/api/stockService';
import { withAlpha, todayISO } from './shared';

interface AddHoldingModalProps {
  visible: boolean;
  onClose: () => void;
  tokens: ThemeTokens;
  onSubmit: (data: PortfolioHoldingCreate) => Promise<void>;
}

export function AddHoldingModal({ visible, onClose, tokens, onSubmit }: AddHoldingModalProps) {
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const [symbol, setSymbol] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ symbol: string; overall_score: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [qty, setQty] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [date, setDate] = useState('');
  const [period, setPeriod] = useState<HoldingPeriod>('medium');
  const [isSold, setIsSold] = useState(false);
  const [soldPrice, setSoldPrice] = useState('');
  const [soldDate, setSoldDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form each time the modal opens, matching the previous
  // handleOpenAddModal behavior.
  useEffect(() => {
    if (!visible) return;
    setSymbol('');
    setSuggestions([]);
    setQty('');
    setAvgPrice('');
    setDate(todayISO());
    setPeriod('medium');
    setIsSold(false);
    setSoldPrice('');
    setSoldDate(todayISO());
    setError(null);
  }, [visible]);

  useEffect(() => {
    const trimmed = symbol.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const timer = setTimeout(() => {
      searchStocks(trimmed, 'medium')
        .then((results) => {
          if (!cancelled) setSuggestions(results);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [symbol]);

  // Dirty-check for confirm-on-dismiss: only the substantive fields a user actually
  // types matter here -- date/period all have sensible defaults, so reverting those
  // in isolation isn't "lost work" worth confirming. soldDate defaults to today too,
  // but IS compared against that default (rather than any-truthy, since it's always
  // non-empty) -- otherwise editing soldDate without touching soldPrice would silently
  // discard that edit on dismiss with no warning.
  const isDirty = !!symbol.trim() || !!qty || !!avgPrice || (isSold && (!!soldPrice || soldDate !== todayISO()));

  const handleDismissAttempt = () => {
    if (!isDirty) {
      onClose();
      return;
    }
    Alert.alert(
      'Discard changes?',
      "The values you've entered will be lost.",
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onClose },
      ]
    );
  };

  const setQuickDate = (type: 'today' | '1m' | '6m' | '1y', target: 'purchase' | 'sold') => {
    const d = new Date();
    if (type === '1m') d.setMonth(d.getMonth() - 1);
    else if (type === '6m') d.setMonth(d.getMonth() - 6);
    else if (type === '1y') d.setFullYear(d.getFullYear() - 1);

    const formatted = d.toISOString().split('T')[0];
    if (target === 'purchase') setDate(formatted);
    else setSoldDate(formatted);
  };

  const handleSave = async () => {
    if (!symbol.trim()) {
      setError('Please enter or select a stock symbol.');
      return;
    }
    const qtyNum = parseInt(qty, 10);
    if (!qtyNum || qtyNum <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }
    const priceNum = parseFloat(avgPrice);
    if (!priceNum || priceNum <= 0) {
      setError('Average buy price must be greater than 0.');
      return;
    }

    let soldPriceNum: number | undefined;
    if (isSold) {
      soldPriceNum = parseFloat(soldPrice);
      if (!soldPriceNum || soldPriceNum < 0) {
        setError('Please enter a valid selling price.');
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        stock_symbol: symbol.trim().toUpperCase(),
        quantity: qtyNum,
        avg_price: priceNum,
        purchase_date: date.trim() || todayISO(),
        intended_holding_period: period,
        status: isSold ? 'sold' : 'held',
        sold_quantity: isSold ? qtyNum : null,
        sold_price: isSold ? soldPriceNum : null,
        sold_date: isSold ? (soldDate.trim() || todayISO()) : null,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save position.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleDismissAttempt}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Stock Position</Text>
            <Pressable
              onPress={handleDismissAttempt}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              style={({ pressed }) => pressed && styles.pressedOpacity}
            >
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
            {error ? <Text style={styles.modalError}>{error}</Text> : null}

            <Text style={styles.inputLabel}>Stock Symbol / Company *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. RELIANCE, TCS, INFY, AYMSYNTEX"
              placeholderTextColor={tokens.textTertiary}
              value={symbol}
              onChangeText={(text) => setSymbol(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {isSearching && <ActivityIndicator size="small" color={tokens.accent} style={{ alignSelf: 'flex-start', marginVertical: 4 }} />}

            {suggestions.length > 0 && (
              <View style={styles.suggestionBox}>
                {suggestions.map((item) => {
                  const band = getBand(item.overall_score);
                  return (
                    <Pressable
                      key={item.symbol}
                      style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressedOpacity]}
                      onPress={() => {
                        setSymbol(item.symbol);
                        setSuggestions([]);
                      }}
                    >
                      <Text style={styles.suggestionSymbol}>{item.symbol}</Text>
                      <Text style={[styles.suggestionScore, { color: getBandColor(tokens, band) }]}>
                        Score: {Math.round(item.overall_score)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Text style={styles.inputLabel}>Quantity *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 10"
              placeholderTextColor={tokens.textTertiary}
              keyboardType="numeric"
              value={qty}
              onChangeText={setQty}
            />

            <Text style={styles.inputLabel}>Average Buy Price (₹) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 254.00"
              placeholderTextColor={tokens.textTertiary}
              keyboardType="decimal-pad"
              value={avgPrice}
              onChangeText={setAvgPrice}
            />

            <Text style={styles.inputLabel}>Purchase Date (Optional)</Text>
            <View style={styles.quickDateRow}>
              <Pressable style={({ pressed }) => [styles.quickDateChip, pressed && styles.pressedOpacity]} onPress={() => setQuickDate('today', 'purchase')}>
                <Text style={styles.quickDateText}>Today</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.quickDateChip, pressed && styles.pressedOpacity]} onPress={() => setQuickDate('1m', 'purchase')}>
                <Text style={styles.quickDateText}>1M Ago</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.quickDateChip, pressed && styles.pressedOpacity]} onPress={() => setQuickDate('6m', 'purchase')}>
                <Text style={styles.quickDateText}>6M Ago</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.quickDateChip, pressed && styles.pressedOpacity]} onPress={() => setQuickDate('1y', 'purchase')}>
                <Text style={styles.quickDateText}>1Y Ago</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD (defaults to Today)"
              placeholderTextColor={tokens.textTertiary}
              value={date}
              onChangeText={setDate}
            />

            <Text style={styles.inputLabel}>Intended Holding Horizon</Text>
            <View style={styles.periodPillRow}>
              {(['short', 'medium', 'long'] as HoldingPeriod[]).map((p) => (
                <Pressable
                  key={p}
                  style={[styles.periodPill, period === p && styles.periodPillActive]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={[styles.periodPillText, period === p && styles.periodPillTextActive]}>
                    {p.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.soldToggleCard, pressed && styles.pressedOpacity]}
              onPress={() => setIsSold(!isSold)}
            >
              <Text style={styles.soldToggleTitle}>Is this a closed / already sold trade?</Text>
              <View style={[styles.toggleCheckbox, isSold && styles.toggleCheckboxChecked]}>
                {isSold && <Text style={styles.checkmarkText}>✓</Text>}
              </View>
            </Pressable>

            {isSold && (
              <View style={styles.soldFieldsBlock}>
                <Text style={styles.inputLabel}>Selling Price (₹) *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 290.00"
                  placeholderTextColor={tokens.textTertiary}
                  keyboardType="decimal-pad"
                  value={soldPrice}
                  onChangeText={setSoldPrice}
                />

                <Text style={styles.inputLabel}>Sale Date (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="YYYY-MM-DD (defaults to Today)"
                  placeholderTextColor={tokens.textTertiary}
                  value={soldDate}
                  onChangeText={setSoldDate}
                />
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.modalSubmitBtn,
                isSubmitting && styles.btnDisabled,
                pressed && styles.pressedOpacity,
              ]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={tokens.onAccent} />
              ) : (
                <Text style={styles.modalSubmitText}>Save Position</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(tokens: ThemeTokens) {
  return StyleSheet.create({
    pressedOpacity: { opacity: 0.7 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: tokens.secondarySurface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 19,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    closeBtn: {
      fontSize: 20,
      color: tokens.textSecondary,
      padding: 4,
    },
    modalError: {
      backgroundColor: withAlpha(tokens.negative, '22'),
      color: tokens.negative,
      padding: 10,
      borderRadius: 8,
      marginBottom: 12,
      fontSize: 13,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.textTertiary,
      marginBottom: 6,
      marginTop: 10,
    },
    modalInput: {
      backgroundColor: tokens.elevatedSurface,
      borderWidth: 1,
      borderColor: tokens.dividerSubtle,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: tokens.textPrimary,
      fontSize: 15,
    },
    quickDateRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    quickDateChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: tokens.elevatedSurface,
      borderWidth: 1,
      borderColor: tokens.dividerSubtle,
    },
    quickDateText: {
      color: tokens.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    suggestionBox: {
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 10,
      marginTop: 4,
      borderWidth: 1,
      borderColor: tokens.dividerSubtle,
      maxHeight: 160,
      overflow: 'hidden',
    },
    suggestionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.dividerSubtle,
    },
    suggestionSymbol: {
      color: tokens.textPrimary,
      fontWeight: '700',
      fontSize: 15,
    },
    suggestionScore: {
      fontWeight: '600',
      fontSize: 13,
    },
    periodPillRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
      marginBottom: 16,
    },
    periodPill: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
      backgroundColor: tokens.elevatedSurface,
      borderWidth: 1,
      borderColor: tokens.dividerSubtle,
    },
    periodPillActive: {
      backgroundColor: tokens.accent,
      borderColor: tokens.accent,
    },
    periodPillText: {
      color: tokens.textSecondary,
      fontWeight: '600',
      fontSize: 12,
    },
    periodPillTextActive: {
      color: tokens.onAccent,
      fontWeight: '700',
    },
    soldToggleCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: tokens.elevatedSurface,
      padding: 14,
      borderRadius: 10,
      marginTop: 8,
      marginBottom: 8,
    },
    soldToggleTitle: {
      color: tokens.textSecondary,
      fontSize: 15,
      fontWeight: '600',
      flex: 1,
      marginRight: 12,
    },
    toggleCheckbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: tokens.textTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toggleCheckboxChecked: {
      backgroundColor: tokens.accent,
      borderColor: tokens.accent,
    },
    checkmarkText: {
      color: tokens.onAccent,
      fontWeight: '700',
      fontSize: 13,
    },
    soldFieldsBlock: {
      backgroundColor: tokens.elevatedSurface,
      padding: 12,
      borderRadius: 10,
      marginBottom: 10,
    },
    modalSubmitBtn: {
      backgroundColor: tokens.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 14,
    },
    modalSubmitText: {
      color: tokens.onAccent,
      fontWeight: '700',
      fontSize: 16,
    },
    btnDisabled: {
      opacity: 0.6,
    },
  });
}
