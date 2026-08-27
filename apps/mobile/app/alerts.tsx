import { useEffect, useMemo, useState } from 'react';
import {
  Alert as RNAlert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlertsStore, Alert } from '../src/store/alertsStore';
import { IconSymbol } from '../components/ui/IconSymbol';
import { useThemeTokens } from '../src/store/themeStore';
import { registerAndSyncPushToken } from '../src/notifications';
import type { ThemeTokens } from '../src/theme/tokens';

const SKELETON_ROWS = [0, 1, 2];

type AlertType = 'universe_wide' | 'specific_stock' | 'portfolio_only';
type ScoreType = 'overall' | 'technical' | 'safety';
type Timeframe = 'short' | 'medium' | 'long';
type Direction = 'above' | 'below';

const SCOPE_OPTIONS: { value: AlertType; label: string }[] = [
  { value: 'portfolio_only', label: 'Portfolio' },
  { value: 'specific_stock', label: 'Specific stock' },
  { value: 'universe_wide', label: 'Universe-wide' },
];

const SCORE_TYPE_OPTIONS: ScoreType[] = ['overall', 'technical', 'safety'];
const TIMEFRAME_OPTIONS: Timeframe[] = ['short', 'medium', 'long'];
const DIRECTION_OPTIONS: Direction[] = ['above', 'below'];

// Same grouping key logic as the previous implementation — by stock symbol / "My Portfolio" /
// "Universe-wide" — restyled only, not changed.
function groupKeyFor(alert: Alert): string {
  if (alert.alert_type === 'specific_stock') return alert.stock_symbol ?? 'Stock';
  if (alert.alert_type === 'portfolio_only') return 'My Portfolio';
  return 'Universe-wide';
}

export default function AlertsScreen() {
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const { alerts, fetchAlerts, createAlert, deleteAlert, isLoading, error } = useAlertsStore();
  const [showForm, setShowForm] = useState(false);

  // Form state — unchanged from the previous implementation, only the presentation changes.
  const [alertType, setAlertType] = useState<AlertType>('portfolio_only');
  const [stockSymbol, setStockSymbol] = useState('');
  const [scoreType, setScoreType] = useState<ScoreType>('overall');
  const [timeframe, setTimeframe] = useState<Timeframe>('short');
  const [direction, setDirection] = useState<Direction>('below');
  const [threshold, setThreshold] = useState('');

  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!threshold || isNaN(Number(threshold))) {
      RNAlert.alert('Invalid Threshold', 'Please enter a valid number.');
      return;
    }
    if (alertType === 'specific_stock' && !stockSymbol.trim()) {
      RNAlert.alert('Missing Symbol', 'Please enter a stock symbol.');
      return;
    }

    const isFirstAlert = alerts.length === 0;

    try {
      await createAlert({
        alert_type: alertType,
        stock_symbol: alertType === 'specific_stock' ? stockSymbol.toUpperCase() : undefined,
        score_type: scoreType,
        timeframe,
        direction,
        threshold_value: Number(threshold),
      });
      setShowForm(false);
      setThreshold('');
      setStockSymbol('');

      // Contextual permission request (spec/ui.md): only ask for push access once the
      // user has done something that makes clear why Finwerse would notify them, with a
      // one-line rationale shown before the OS dialog -- not blindly at login for every
      // user regardless of whether they ever open this screen.
      if (isFirstAlert) {
        RNAlert.alert(
          'Enable Notifications?',
          'Finwerse can notify you when this alert triggers.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Enable', onPress: () => registerAndSyncPushToken() },
          ]
        );
      }
    } catch (e) {
      RNAlert.alert('Error', 'Could not create alert.');
    }
  };

  // Delete Alert with Confirmation — spec/ui.md's cross-cutting Error States rule requires
  // destructive actions to confirm before executing, matching portfolio.tsx's handleDelete.
  const confirmDeleteAlert = (id: string) => {
    RNAlert.alert('Delete alert?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteAlert(id) },
    ]);
  };

  // Triggered alerts render first (existing behavior, unchanged).
  const triggeredAlerts = alerts.filter((a) => a.status === 'triggered');
  const activeAlerts = alerts.filter((a) => a.status === 'active');

  const groupedActive = activeAlerts.reduce((acc, curr) => {
    const key = groupKeyFor(curr);
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {} as Record<string, Alert[]>);

  const isInitialLoading = isLoading && alerts.length === 0 && !error;
  const isInitialError = !!error && alerts.length === 0;
  const isEmpty = !showForm && !isInitialLoading && !isInitialError && alerts.length === 0;

  const renderForm = () => (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>New Alert</Text>

      <Text style={styles.formSectionTitle}>What are you watching?</Text>
      <View style={styles.chipRow}>
        {SCOPE_OPTIONS.map((option) => {
          const isSelected = alertType === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setAlertType(option.value)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {alertType === 'specific_stock' && (
        <TextInput
          style={styles.input}
          placeholder="Stock symbol (e.g. RELIANCE)"
          placeholderTextColor={tokens.textTertiary}
          value={stockSymbol}
          onChangeText={setStockSymbol}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      )}

      <Text style={[styles.formSectionTitle, styles.formSectionTitleSpaced]}>What should trigger it?</Text>

      <Text style={styles.fieldLabel}>Score type</Text>
      <View style={styles.chipRow}>
        {SCORE_TYPE_OPTIONS.map((option) => {
          const isSelected = scoreType === option;
          return (
            <Pressable
              key={option}
              onPress={() => setScoreType(option)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.fieldLabel}>Timeframe</Text>
      <View style={styles.chipRow}>
        {TIMEFRAME_OPTIONS.map((option) => {
          const isSelected = timeframe === option;
          return (
            <Pressable
              key={option}
              onPress={() => setTimeframe(option)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.fieldLabel}>Direction &amp; threshold</Text>
      <View style={styles.chipRow}>
        {DIRECTION_OPTIONS.map((option) => {
          const isSelected = direction === option;
          return (
            <Pressable
              key={option}
              onPress={() => setDirection(option)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>Drops {option}</Text>
            </Pressable>
          );
        })}
        <TextInput
          style={[styles.input, styles.thresholdInput]}
          placeholder="Value"
          placeholderTextColor={tokens.textTertiary}
          keyboardType="numeric"
          value={threshold}
          onChangeText={setThreshold}
        />
      </View>

      <View style={styles.formActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowForm(false)}
          style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressedOpacity]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={handleCreate}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressedOpacity]}
        >
          <Text style={styles.saveText}>Set Alert</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Alerts</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showForm ? 'Close new alert form' : 'New alert'}
          onPress={() => setShowForm((prev) => !prev)}
          style={({ pressed }) => [styles.headerIconButton, pressed && styles.headerIconButtonPressed]}
        >
          <IconSymbol
            name={showForm ? 'xmark.circle.fill' : 'plus.circle.fill'}
            size={22}
            color={tokens.accent}
          />
        </Pressable>
      </View>

      {isInitialLoading ? (
        SKELETON_ROWS.map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <View style={styles.skeletonLineWide} />
            <View style={styles.skeletonLineNarrow} />
          </View>
        ))
      ) : isInitialError ? (
        <Pressable style={styles.errorBox} onPress={() => fetchAlerts()}>
          <Text style={styles.errorText}>Couldn&apos;t load your alerts. Please try again.</Text>
          <Text style={styles.retryText}>Tap to Retry</Text>
        </Pressable>
      ) : (
        <>
          {showForm && renderForm()}

          {isEmpty && (
            <View style={styles.emptyState}>
              <IconSymbol name="bell.fill" size={40} color={tokens.textTertiary} />
              <Text style={styles.emptyTitle}>Nothing needs your attention.</Text>
              <Text style={styles.emptySubtitle}>Create an alert and Finwerse will watch it for you.</Text>
            </View>
          )}

          {triggeredAlerts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recently Triggered</Text>
              {triggeredAlerts.map((alert) => (
                <View key={alert.id} style={styles.triggeredCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: tokens.warning }]} />
                      <Text style={styles.triggeredLabel}>Fired on {alert.triggered_date}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete alert"
                      onPress={() => confirmDeleteAlert(alert.id)}
                      hitSlop={8}
                      style={({ pressed }) => pressed && styles.pressedOpacity}
                    >
                      <IconSymbol name="trash" size={18} color={tokens.negative} />
                    </Pressable>
                  </View>
                  <Text style={styles.alertDesc}>
                    {alert.triggered_symbol} crossed {alert.direction} {alert.threshold_value} on{' '}
                    {alert.timeframe} {alert.score_type}.
                  </Text>
                </View>
              ))}
            </View>
          )}

          {activeAlerts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active Alerts</Text>
              {Object.entries(groupedActive).map(([groupKey, groupAlerts]) => (
                <View key={groupKey} style={styles.groupContainer}>
                  <Text style={styles.groupLabel}>{groupKey.toUpperCase()}</Text>
                  <View style={styles.groupCard}>
                    {groupAlerts.map((alert, index) => (
                      <View
                        key={alert.id}
                        style={[styles.alertRow, index !== groupAlerts.length - 1 && styles.alertRowDivider]}
                      >
                        <Text style={styles.alertDesc}>
                          {alert.timeframe} {alert.score_type} is {alert.direction} {alert.threshold_value}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Delete alert"
                          onPress={() => confirmDeleteAlert(alert.id)}
                          hitSlop={8}
                          style={({ pressed }) => pressed && styles.pressedOpacity}
                        >
                          <IconSymbol name="trash" size={18} color={tokens.negative} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
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
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    screenTitle: {
      fontSize: 30,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    headerIconButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: tokens.elevatedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconButtonPressed: {
      opacity: 0.7,
    },
    pressedOpacity: {
      opacity: 0.7,
    },
    // Loading state — skeleton cards matching the alert-card shape
    skeletonCard: {
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      gap: 8,
    },
    skeletonLineWide: {
      width: '70%',
      height: 14,
      borderRadius: 4,
      backgroundColor: tokens.secondarySurface,
    },
    skeletonLineNarrow: {
      width: '45%',
      height: 12,
      borderRadius: 4,
      backgroundColor: tokens.secondarySurface,
    },
    // Error/retry state
    errorBox: {
      padding: 20,
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 14,
      alignItems: 'center',
      marginBottom: 24,
    },
    errorText: {
      color: tokens.negative,
      fontSize: 14,
      marginBottom: 8,
      textAlign: 'center',
    },
    retryText: {
      color: tokens.accent,
      fontSize: 14,
      fontWeight: '600',
    },
    // Empty state
    emptyState: {
      alignItems: 'center',
      paddingVertical: 64,
      gap: 10,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
      marginTop: 8,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 15,
      color: tokens.textSecondary,
      textAlign: 'center',
      maxWidth: 260,
    },
    // New-alert form
    formCard: {
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
    },
    formTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
      marginBottom: 16,
    },
    formSectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: tokens.textPrimary,
      marginBottom: 10,
    },
    formSectionTitleSpaced: {
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: tokens.dividerSubtle,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: tokens.textTertiary,
      marginTop: 12,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
    },
    chip: {
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: tokens.secondarySurface,
    },
    chipSelected: {
      backgroundColor: tokens.accent,
    },
    chipText: {
      color: tokens.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    chipTextSelected: {
      color: tokens.onAccent,
    },
    input: {
      backgroundColor: tokens.secondarySurface,
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
      fontSize: 15,
      color: tokens.textPrimary,
    },
    thresholdInput: {
      flex: 1,
      minWidth: 90,
      marginTop: 0,
    },
    formActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginTop: 24,
      gap: 20,
    },
    cancelBtn: {
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    cancelText: {
      color: tokens.negative,
      fontSize: 15,
      fontWeight: '600',
    },
    saveBtn: {
      backgroundColor: tokens.accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
    },
    saveText: {
      color: tokens.onAccent,
      fontSize: 15,
      fontWeight: '700',
    },
    // Sections
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
      marginBottom: 12,
    },
    // Triggered alerts
    triggeredCard: {
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      borderLeftWidth: 3,
      borderLeftColor: tokens.warning,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    triggeredLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.warning,
    },
    alertDesc: {
      fontSize: 14.5,
      color: tokens.textSecondary,
      flex: 1,
    },
    // Active alerts, grouped by target
    groupContainer: {
      marginBottom: 16,
    },
    groupLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      color: tokens.textTertiary,
      marginBottom: 8,
    },
    groupCard: {
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 14,
      overflow: 'hidden',
    },
    alertRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 12,
    },
    alertRowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: tokens.dividerSubtle,
    },
  });
}
