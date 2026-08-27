import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { TopTabs } from 'expo-router/js-top-tabs';
import { CustomTabBar } from '../../components/navigation/CustomTabBar';
import { useThemeTokens } from '../../src/store/themeStore';

// Swipeable tab navigation (spec/ui.md → "Tab Navigation — Swipe Gestures"). Only the 5 real
// tab screens are children of this navigator, in the documented swipe order (Home → Portfolio
// → Health → Ask AI → More). Alerts/Impulse Analyzer/Market News are deliberately NOT declared
// here — a route registered under this pager is a route the pager can physically land on
// mid-swipe regardless of tab-bar visibility, so they live as sibling Stack routes
// (apps/mobile/app/alerts.tsx, impulse.tsx, news.tsx — see apps/mobile/app/_layout.tsx),
// reachable only via router.push from the More screen.
export default function TabLayout() {
  const tokens = useThemeTokens();
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  // Respect the OS-level reduce-motion setting (harness/patterns/ui-ux.md's accessibility bar,
  // spec/ui.md's motion requirement) — fall back to a non-tracking, quicker (tap-only, no
  // animation) transition rather than the finger-tracking swipe.
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotionEnabled(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotionEnabled(enabled);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return (
    <TopTabs
      tabBar={(props: any) => <CustomTabBar {...props} />}
      // react-native-tab-view's <TabView> (which expo-router's TopTabs/MaterialTopTabView
      // renders under the hood) defaults tabBarPosition to 'top'. Neither MaterialTopTabNavigator
      // nor MaterialTopTabView consume/destructure this prop — both spread it through untouched
      // via `...rest` — so it reaches TabView as-is. Force it to 'bottom' so CustomTabBar renders
      // at the bottom of the screen instead of overlapping the status bar.
      tabBarPosition="bottom"
      screenOptions={{
        // Reduce Motion (design audit, 2026-08-27) suppresses autoplaying/parallax-style
        // animation -- it isn't meant to remove a direct-manipulation gesture the user's
        // own finger is driving 1:1, which is closer to a slider thumb than an animation.
        // Only animationEnabled (the momentum/snap transition) is tied to the setting;
        // swipeEnabled stays on unconditionally so Reduce Motion users keep the gesture.
        swipeEnabled: true,
        animationEnabled: !reduceMotionEnabled,
        // All 5 scenes stay mounted (default — not opting into `lazy`) so an adjacent tab is
        // never a blank/loading frame mid-drag (spec/ui.md's "No blank mid-swipe frames").
        lazy: false,
        // Replaces the old bottom-tabs `sceneContainerStyle` (Behavior-parity requirement 2,
        // spec/ui.md) — keeps every scene's background at canvas so a mid-drag frame never
        // flashes a default background between screens.
        sceneStyle: { backgroundColor: tokens.canvas },
      }}
    >
      <TopTabs.Screen name="index" options={{ title: 'Home' }} />
      <TopTabs.Screen name="portfolio" options={{ title: 'Portfolio' }} />
      <TopTabs.Screen name="health" options={{ title: 'Health' }} />
      <TopTabs.Screen name="chat" options={{ title: 'Ask AI' }} />
      <TopTabs.Screen name="more" options={{ title: 'More' }} />
    </TopTabs>
  );
}
