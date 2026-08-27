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
import type { PortfolioHolding, PortfolioHoldingSell } from '@/src/store/portfolioStore';
import type { ThemeTokens } from '@/src/theme/tokens';
import { withAlpha, todayISO } from './shared';

interface SellHoldingModalProps {
  visible: boolean;
  holding: PortfolioHolding | null;
  onClose: () => void;
  tokens: ThemeTokens;
  onSubmit: (id: string, data: PortfolioHoldingSell) => Promise<void>;
}

export function SellHoldingModal({ visible, holding, onClose, tokens, onSubmit }: SellHoldingModalProps) {
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(todayISO());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tracks whether the user has changed anything from the pre-filled defaults, so
  // dismissing the modal only confirms when there's actually something to lose.
  const [isDirty, setIsDirty] = useState(false);

  // Pre-fill from the selected holding every time the modal opens, matching
  // the previous handleOpenSellModal behavior (which reset unconditionally
  // on every "Mark as Sold" press). Keying only on `holding` isn't enough --
  // reopening for the SAME holding (same object reference, since nothing
  // refetched in between) wouldn't re-run this effect, leaving whatever the
  // user typed and then dismissed still showing.
  // Assumes `holding` never gets reassigned by the parent while this modal is
  // open and dirty (true today -- portfolio.tsx sets selectedHoldingForSell
  // once at open time and never re-syncs it from a live refetch). If a future
  // change adds any background/live holdings update, re-verify this doesn't
  // silently wipe isDirty and in-progress edits out from under the user.
  useEffect(() => {
    if (!visible || !holding) return;
    setQty(holding.quantity.toString());
    setPrice(holding.avg_price.toString());
    setDate(todayISO());
    setError(null);
    setIsDirty(false);
  }, [holding, visible]);

  const updateQty = (val: string) => { setQty(val); setIsDirty(true); };
  const updatePrice = (val: string) => { setPrice(val); setIsDirty(true); };
  const updateDate = (val: string) => { setDate(val); setIsDirty(true); };

  const setQuickDate = (type: 'today' | '1w') => {
    const d = new Date();
    if (type === '1w') d.setDate(d.getDate() - 7);
    updateDate(d.toISOString().split('T')[0]);
  };

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

  const submitSale = async (qtyNum: number, priceNum: number) => {
    if (!holding) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(holding.id, {
        sold_quantity: qtyNum,
        sold_price: priceNum,
        sold_date: date.trim() || todayISO(),
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to record sale.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = () => {
    if (!holding) return;

    const qtyNum = parseInt(qty, 10);
    if (!qtyNum || qtyNum <= 0) {
      setError('Sell quantity must be greater than 0.');
      return;
    }
    if (qtyNum > holding.quantity) {
      setError(`Cannot sell more than held quantity (${holding.quantity}).`);
      return;
    }
    const priceNum = parseFloat(price);
    if (!priceNum || priceNum < 0) {
      setError('Selling price must be valid.');
      return;
    }

    setError(null);
    Alert.alert(
      'Confirm sale?',
      `Sell ${qtyNum} share${qtyNum === 1 ? '' : 's'} of ${holding.stock_symbol} at ₹${priceNum}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => submitSale(qtyNum, priceNum) },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleDismissAttempt}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Record Sale — {holding?.stock_symbol}</Text>
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

            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>
                Held Quantity: <Text style={styles.infoBannerValue}>{holding?.quantity}</Text>
              </Text>
              <Text style={styles.infoBannerText}>
                Avg Buy: <Text style={styles.infoBannerValue}>₹{holding?.avg_price}</Text>
              </Text>
            </View>

            <Text style={styles.inputLabel}>Quantity to Sell *</Text>
            <View style={styles.quickDateRow}>
              <Pressable
                style={({ pressed }) => [styles.quickDateChip, pressed && styles.pressedOpacity]}
                onPress={() => updateQty(holding?.quantity.toString() || '')}
              >
                <Text style={styles.quickDateText}>All ({holding?.quantity})</Text>
              </Pressable>
              {holding && holding.quantity > 1 && (
                <Pressable
                  style={({ pressed }) => [styles.quickDateChip, pressed && styles.pressedOpacity]}
                  onPress={() => updateQty(Math.floor(holding.quantity / 2).toString())}
                >
                  <Text style={styles.quickDateText}>50% ({Math.floor(holding.quantity / 2)})</Text>
                </Pressable>
              )}
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder={`Max ${holding?.quantity}`}
              placeholderTextColor={tokens.textTertiary}
              keyboardType="numeric"
              value={qty}
              onChangeText={updateQty}
            />

            <Text style={styles.inputLabel}>Selling Price per share (₹) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 290.00"
              placeholderTextColor={tokens.textTertiary}
              keyboardType="decimal-pad"
              value={price}
              onChangeText={updatePrice}
            />

            <Text style={styles.inputLabel}>Sale Date (Optional)</Text>
            <View style={styles.quickDateRow}>
              <Pressable style={({ pressed }) => [styles.quickDateChip, pressed && styles.pressedOpacity]} onPress={() => setQuickDate('today')}>
                <Text style={styles.quickDateText}>Today</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.quickDateChip, pressed && styles.pressedOpacity]} onPress={() => setQuickDate('1w')}>
                <Text style={styles.quickDateText}>1W Ago</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD (defaults to Today)"
              placeholderTextColor={tokens.textTertiary}
              value={date}
              onChangeText={updateDate}
            />

            <Pressable
              style={({ pressed }) => [
                styles.modalSubmitBtn,
                styles.sellSubmitBtn,
                isSubmitting && styles.btnDisabled,
                pressed && styles.pressedOpacity,
              ]}
              onPress={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={tokens.onAccent} />
              ) : (
                <Text style={styles.modalSubmitText}>Confirm Sale</Text>
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
    modalSubmitBtn: {
      backgroundColor: tokens.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 14,
    },
    sellSubmitBtn: {
      backgroundColor: tokens.positive,
    },
    modalSubmitText: {
      color: tokens.onAccent,
      fontWeight: '700',
      fontSize: 16,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    infoBanner: {
      backgroundColor: tokens.elevatedSurface,
      padding: 12,
      borderRadius: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    infoBannerText: {
      color: tokens.textSecondary,
      fontSize: 13,
    },
    infoBannerValue: {
      fontWeight: '700',
      color: tokens.textPrimary,
    },
  });
}
