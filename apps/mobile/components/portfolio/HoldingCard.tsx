import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PortfolioHolding } from '@/src/store/portfolioStore';
import type { ThemeTokens } from '@/src/theme/tokens';
import { withAlpha, formatRupees } from './shared';

interface HoldingCardProps {
  item: PortfolioHolding;
  tokens: ThemeTokens;
  onSell: (item: PortfolioHolding) => void;
  onEdit: (item: PortfolioHolding) => void;
  onDelete: (id: string, symbol: string) => void;
}

function HoldingCardImpl({ item, tokens, onSell, onEdit, onDelete }: HoldingCardProps) {
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const isHeld = item.status === 'held';
  const totalInvested = item.quantity * item.avg_price;
  const soldQty = item.sold_quantity ?? item.quantity;
  const soldTotal = !isHeld && item.sold_price != null ? soldQty * item.sold_price : null;
  const pnl = !isHeld && soldTotal !== null ? soldTotal - soldQty * item.avg_price : null;
  const pnlPct = !isHeld && pnl !== null && item.avg_price > 0 ? (pnl / (soldQty * item.avg_price)) * 100 : null;

  return (
    <View style={styles.holdingCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.ticker}>{item.stock_symbol}</Text>
        <View style={[styles.statusPill, isHeld ? styles.statusPillHeld : styles.statusPillSold]}>
          <Text style={[styles.statusPillText, isHeld ? styles.statusPillTextHeld : styles.statusPillTextSold]}>
            {isHeld ? 'HELD' : 'SOLD'}
          </Text>
        </View>
      </View>

      {isHeld ? (
        <View style={styles.metricsRow}>
          <Text style={styles.metricsLine}>
            <Text style={styles.metricLabelInline}>Qty </Text>
            <Text style={styles.metricValueInline}>{item.quantity}</Text>
            <Text style={styles.metricLabelInline}>  ·  Avg </Text>
            <Text style={styles.metricValueInline}>{formatRupees(item.avg_price)}</Text>
            <Text style={styles.metricLabelInline}>  ·  Invested </Text>
            <Text style={styles.metricValueInline}>{formatRupees(totalInvested)}</Text>
          </Text>
        </View>
      ) : (
        <View style={styles.metricsRow}>
          <Text style={styles.metricsLine}>
            <Text style={styles.metricLabelInline}>Sold Qty </Text>
            <Text style={styles.metricValueInline}>{soldQty}</Text>
            <Text style={styles.metricLabelInline}>  ·  Price </Text>
            <Text style={styles.metricValueInline}>
              {item.sold_price != null ? formatRupees(item.sold_price) : '—'}
            </Text>
            <Text style={styles.metricLabelInline}>  ·  P&L </Text>
            {pnl !== null ? (
              <Text style={[styles.metricValueInline, { color: pnl >= 0 ? tokens.positive : tokens.negative }]}>
                {pnl >= 0 ? '+' : ''}
                {formatRupees(pnl)} ({pnlPct !== null ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%` : '0%'})
              </Text>
            ) : (
              <Text style={styles.metricValueInline}>—</Text>
            )}
          </Text>
        </View>
      )}

      <View style={styles.cardMetaRow}>
        <View style={styles.periodTag}>
          <Text style={styles.periodTagText}>
            {(item.intended_holding_period || 'medium').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.dateRow}>
        <Text style={styles.dateText}>
          Bought: {item.purchase_date || 'Today'}{!isHeld && item.sold_date ? ` • Sold: ${item.sold_date}` : ''}
        </Text>
      </View>

      <View style={styles.cardActions}>
        {isHeld && (
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.sellBtn, pressed && styles.actionBtnPressed]}
            onPress={() => onSell(item)}
          >
            <Text style={styles.sellBtnText}>Mark as Sold</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          onPress={() => onEdit(item)}
        >
          <Text style={styles.actionBtnText}>Edit</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.deleteBtn, pressed && styles.actionBtnPressed]}
          onPress={() => onDelete(item.id, item.stock_symbol)}
        >
          <Text style={styles.deleteBtnText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Re-renders only when its own item/tokens/callback props change, instead of
// on every keystroke in the Portfolio screen's Add/Sell/Edit modal forms.
export const HoldingCard = React.memo(HoldingCardImpl);

function createStyles(tokens: ThemeTokens) {
  return StyleSheet.create({
    holdingCard: {
      padding: 16,
      marginBottom: 12,
      borderRadius: 16,
      backgroundColor: tokens.elevatedSurface,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    ticker: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusPillHeld: {
      backgroundColor: withAlpha(tokens.accent, '26'),
    },
    statusPillSold: {
      backgroundColor: tokens.secondarySurface,
    },
    statusPillText: {
      fontSize: 11,
      fontWeight: '700',
    },
    statusPillTextHeld: {
      color: tokens.accent,
    },
    statusPillTextSold: {
      color: tokens.textTertiary,
    },
    metricsRow: {
      marginBottom: 10,
    },
    metricsLine: {
      fontSize: 14,
      lineHeight: 20,
    },
    metricLabelInline: {
      color: tokens.textSecondary,
    },
    metricValueInline: {
      color: tokens.textPrimary,
      fontWeight: '600',
    },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    periodTag: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: tokens.secondarySurface,
    },
    periodTagText: {
      fontSize: 10,
      fontWeight: '600',
      color: tokens.textTertiary,
    },
    cardDivider: {
      borderTopWidth: 1,
      borderTopColor: tokens.dividerSubtle,
      marginTop: 12,
    },
    dateRow: {
      paddingTop: 10,
    },
    dateText: {
      fontSize: 12,
      color: tokens.textTertiary,
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      paddingTop: 10,
    },
    actionBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: tokens.secondarySurface,
    },
    actionBtnPressed: {
      opacity: 0.7,
    },
    sellBtn: {
      backgroundColor: withAlpha(tokens.positive, '22'),
    },
    sellBtnText: {
      color: tokens.positive,
      fontWeight: '600',
      fontSize: 13,
    },
    deleteBtn: {
      backgroundColor: withAlpha(tokens.negative, '22'),
    },
    actionBtnText: {
      color: tokens.textSecondary,
      fontWeight: '600',
      fontSize: 13,
    },
    deleteBtnText: {
      color: tokens.negative,
      fontWeight: '600',
      fontSize: 13,
    },
  });
}
