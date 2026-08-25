import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconSymbol, IconSymbolName } from '../../components/ui/IconSymbol';

// Design System — Mobile Redesign tokens (spec/ui.md)
const COLOR_CANVAS = '#090B0A';
const COLOR_SURFACE_ELEVATED = '#131613';
const COLOR_DIVIDER = '#1A1E1A';
const COLOR_TEXT_PRIMARY = '#F5F7F2';
const COLOR_TEXT_TERTIARY = '#6F766F';

interface MoreRow {
  key: string;
  label: string;
  icon: IconSymbolName;
  route: '/(tabs)/alerts' | '/(tabs)/impulse' | '/(tabs)/news';
}

const ROWS: MoreRow[] = [
  { key: 'alerts', label: 'Alerts', icon: 'bell.fill', route: '/(tabs)/alerts' },
  { key: 'impulse', label: 'Impulse Analyzer', icon: 'chart.line.down.right', route: '/(tabs)/impulse' },
  { key: 'news', label: 'Market News', icon: 'newspaper.fill', route: '/(tabs)/news' },
];

export default function MoreScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>More</Text>

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
              <IconSymbol name={row.icon} size={20} color={COLOR_TEXT_PRIMARY} />
              <Text style={styles.rowLabel}>{row.label}</Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color={COLOR_TEXT_TERTIARY} />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR_CANVAS,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: COLOR_TEXT_PRIMARY,
    marginTop: 12,
    marginBottom: 24,
  },
  card: {
    backgroundColor: COLOR_SURFACE_ELEVATED,
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
    borderBottomColor: COLOR_DIVIDER,
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
    color: COLOR_TEXT_PRIMARY,
  },
});
