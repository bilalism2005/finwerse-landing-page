// Custom bottom tab bar for the swipeable (tabs) pager (spec/ui.md → "Tab Navigation — Swipe
// Gestures"). `TopTabs` (expo-router/js-top-tabs) renders its tab bar at the *top* of the
// screen by default (`MaterialTopTabBar`) — this component restyles that into the app's
// existing bottom-bar look via the navigator's `tabBar` prop, and replicates the behavior the
// old bottom-tabs `Tabs` gave "for free" (keyboard-hide, safe-area inset) per the
// Behavior-parity requirements in spec/ui.md.
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { IconSymbol } from '../ui/IconSymbol';
import { useThemeTokens } from '../../src/store/themeStore';
import type { ThemeTokens } from '../../src/theme/tokens';

// Kept in the same order as spec/ui.md's "5-screen swipe set": Home → Portfolio → Health →
// Ask AI → More. Icon choices are unchanged from the previous apps/mobile/app/(tabs)/_layout.tsx.
type TabRouteName = 'index' | 'portfolio' | 'health' | 'chat' | 'more';

const TAB_LABELS: Record<TabRouteName, string> = {
  index: 'Home',
  portfolio: 'Portfolio',
  health: 'Health',
  chat: 'Ask AI',
  more: 'More',
};

const TAB_ICONS: Record<TabRouteName, (color: string) => JSX.Element> = {
  index: (color) => <IconSymbol size={28} name="house.fill" color={color} />,
  portfolio: (color) => (
    <SymbolView
      name={{ ios: 'briefcase.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
      tintColor={color}
      size={28}
    />
  ),
  health: (color) => <IconSymbol size={28} name="heart.fill" color={color} />,
  chat: (color) => <IconSymbol size={28} name="bubble.left.and.bubble.right.fill" color={color} />,
  more: (color) => <IconSymbol size={28} name="ellipsis" color={color} />,
};

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const value = parseInt(clean, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// Linear-interpolates between two hex colors by t (0..1) — used to drive the tab icons' tint
// in sync with drag progress (spec/ui.md's "Visual / motion requirement" — the active tint must
// visibly interpolate mid-drag, not just snap at the end).
function mixColor(from: string, to: string, t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  const r = Math.round(r1 + (r2 - r1) * clampedT);
  const g = Math.round(g1 + (g2 - g1) * clampedT);
  const b = Math.round(b1 + (b2 - b1) * clampedT);
  return `rgb(${r}, ${g}, ${b})`;
}

// `MaterialTopTabBarProps` (expo-router/js-top-tabs) types this any-ish on purpose — the real
// shape we get at runtime is `{ state, navigation, descriptors, position, jumpTo, layout, ... }`
// (react-native-tab-view's SceneRendererProps merged in by expo-router's own
// MaterialTopTabView.js). `position` is a classic Animated.Value/AnimatedInterpolation tracking
// the fractional route index during a drag — not a Reanimated shared value — so plain
// `addListener` works here.
export function CustomTabBar({ state, navigation, position }: any) {
  const tokens = useThemeTokens();
  const styles = createStyles(tokens);
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [dragPosition, setDragPosition] = useState(state.index);

  // Parity requirement 1 (spec/ui.md): today's tabBarHideOnKeyboard: true hides the tab bar
  // while the keyboard is open (relevant on Ask AI's composer). material-top-tabs has no
  // built-in equivalent, so replicate it manually.
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!position || typeof position.addListener !== 'function') return;
    const id = position.addListener(({ value }: { value: number }) => setDragPosition(value));
    return () => position.removeListener(id);
  }, [position]);

  // Keeps the resting tint correct immediately after a tap-driven switch (or on first mount),
  // without waiting for a drag event.
  useEffect(() => {
    setDragPosition(state.index);
  }, [state.index]);

  if (keyboardVisible) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route: { key: string; name: string }, index: number) => {
        const isFocused = state.index === index;
        const distance = Math.max(0, 1 - Math.abs(dragPosition - index));
        const color = mixColor(tokens.textTertiary, tokens.accent, distance);
        const renderIcon = TAB_ICONS[route.name as TabRouteName];

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityLabel={`${TAB_LABELS[route.name as TabRouteName] ?? route.name} tab`}
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tab}
          >
            {/* Cast needed: this monorepo hoists a second, older @types/react copy to the root
                node_modules (18.3.31) alongside apps/mobile's own 19.2.18 — react-native's
                bundled Pressable types resolve ReactNode from a different copy than this file's
                ambient JSX namespace, producing a spurious structural mismatch (not a real
                type error) unrelated to this feature. */}
            {renderIcon ? (renderIcon(color) as any) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(tokens: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: tokens.canvas,
      borderTopWidth: 1,
      borderTopColor: tokens.dividerSubtle,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 8,
      paddingBottom: 4,
    },
  });
}
