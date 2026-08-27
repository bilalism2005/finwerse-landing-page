import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@finwerse/shared';
import { IconSymbol, IconSymbolName } from '../../components/ui/IconSymbol';
import { useThemeStore, useThemeTokens } from '../../src/store/themeStore';
import type { ThemeTokens } from '../../src/theme/tokens';
import type { ThemeMode } from '../../src/store/themeStore';

interface MoreRow {
  key: string;
  label: string;
  icon: IconSymbolName;
  route: '/alerts' | '/impulse' | '/news';
}

const ROWS: MoreRow[] = [
  { key: 'alerts', label: 'Alerts', icon: 'bell.fill', route: '/alerts' },
  { key: 'impulse', label: 'Impulse Analyzer', icon: 'chart.line.down.right', route: '/impulse' },
  { key: 'news', label: 'Market News', icon: 'newspaper.fill', route: '/news' },
];

const APPEARANCE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

export default function MoreScreen() {
  const router = useRouter();
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>More</Text>

      <Text style={styles.sectionLabel}>Tools</Text>
      <View style={styles.card}>
        {ROWS.map((row, index) => (
          <Pressable
            key={row.key}
            onPress={() => router.push(row.route)}
            style={({ pressed }) => [
              styles.row,
              index < ROWS.length - 1 && styles.rowDivider,
              pressed && styles.rowPressed,
            ]}
          >
            <View style={styles.rowLeft}>
              <IconSymbol name={row.icon} size={20} color={tokens.textPrimary} />
              <Text style={styles.rowLabel}>{row.label}</Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color={tokens.textTertiary} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Preferences</Text>
      <View style={styles.card}>
        {/* Appearance — not a navigation row: no chevron, no onPress-to-navigate.
            Selecting a segment writes straight to useThemeStore; the whole app
            re-renders under the new theme immediately, no confirmation step. */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Appearance</Text>
          <View style={styles.segmentedControl}>
            {APPEARANCE_OPTIONS.map((option) => {
              const isSelected = mode === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setMode(option.value)}
                  style={[styles.segment, isSelected && styles.segmentSelected]}
                >
                  <Text style={[styles.segmentText, isSelected && styles.segmentTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.card}>
        <Pressable
          onPress={() => signOut()}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.rowLeft}>
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={tokens.negative} />
            <Text style={[styles.rowLabel, { color: tokens.negative }]}>Sign Out</Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(tokens: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tokens.canvas,
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 30,
      fontWeight: '700',
      color: tokens.textPrimary,
      marginTop: 12,
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 8,
      marginTop: 20,
    },
    card: {
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 16,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: tokens.dividerSubtle,
    },
    rowPressed: {
      opacity: 0.7,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowLabel: {
      fontSize: 16,
      color: tokens.textPrimary,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: tokens.secondarySurface,
      borderRadius: 12,
      padding: 4,
    },
    segment: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: 'transparent',
    },
    segmentSelected: {
      backgroundColor: tokens.accent,
    },
    segmentText: {
      color: tokens.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    segmentTextSelected: {
      color: tokens.onAccent,
    },
  });
}
