import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import type { HoldingPeriod, PortfolioHolding, PortfolioHoldingUpdate } from '@/src/store/portfolioStore';
import type { ThemeTokens } from '@/src/theme/tokens';
import { withAlpha } from './shared';

interface EditHoldingModalProps {
  visible: boolean;
  holding: PortfolioHolding | null;
  onClose: () => void;
  tokens: ThemeTokens;
  onSubmit: (id: string, data: PortfolioHoldingUpdate) => Promise<void>;
}

export function EditHoldingModal({ visible, holding, onClose, tokens, onSubmit }: EditHoldingModalProps) {
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const [qty, setQty] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [date, setDate] = useState('');
  const [period, setPeriod] = useState<HoldingPeriod>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from the selected holding every time the modal opens, matching
  // the previous handleOpenEditModal behavior (which reset unconditionally
  // on every "Edit" press). Keying only on `holding` isn't enough --
  // reopening for the SAME holding (same object reference, since nothing
  // refetched in between) wouldn't re-run this effect, leaving whatever the
  // user typed and then dismissed still showing.
  useEffect(() => {
    if (!visible || !holding) return;
    setQty(holding.quantity.toString());
    setAvgPrice(holding.avg_price.toString());
    setDate(holding.purchase_date || '');
    setPeriod(holding.intended_holding_period);
    setError(null);
  }, [holding, visible]);

  const handleSave = async () => {
    if (!holding) return;

    const qtyNum = parseInt(qty, 10);
    if (!qtyNum || qtyNum <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }
    const priceNum = parseFloat(avgPrice);
    if (!priceNum || priceNum <= 0) {
      setError('Average price must be greater than 0.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(holding.id, {
        quantity: qtyNum,
        avg_price: priceNum,
        purchase_date: date.trim() || holding.purchase_date,
        intended_holding_period: period,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to update position.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Position — {holding?.stock_symbol}</Text>
            <Pressable onPress={onClose} style={({ pressed }) => pressed && styles.pressedOpacity}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
            {error ? <Text style={styles.modalError}>{error}</Text> : null}

            <Text style={styles.inputLabel}>Quantity *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Quantity"
              placeholderTextColor={tokens.textTertiary}
              keyboardType="numeric"
              value={qty}
              onChangeText={setQty}
            />

            <Text style={styles.inputLabel}>Average Buy Price (₹) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Average Price"
              placeholderTextColor={tokens.textTertiary}
              keyboardType="decimal-pad"
              value={avgPrice}
              onChangeText={setAvgPrice}
            />

            <Text style={styles.inputLabel}>Purchase Date (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD"
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
                <Text style={styles.modalSubmitText}>Save Changes</Text>
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
