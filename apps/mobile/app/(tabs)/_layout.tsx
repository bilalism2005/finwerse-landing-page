import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { IconSymbol } from '../../components/ui/IconSymbol';

// Design System — Mobile Redesign tokens (spec/ui.md)
const COLOR_ACCENT_LIME = '#C7FF3D';
const COLOR_TEXT_TERTIARY = '#6F766F';
const COLOR_CANVAS = '#090B0A';
const COLOR_DIVIDER = '#1A1E1A';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLOR_ACCENT_LIME,
        tabBarInactiveTintColor: COLOR_TEXT_TERTIARY,
        tabBarStyle: { backgroundColor: COLOR_CANVAS, borderTopColor: COLOR_DIVIDER, elevation: 0 },
        tabBarHideOnKeyboard: true,
        sceneContainerStyle: { backgroundColor: COLOR_CANVAS },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'briefcase.fill',
                android: 'account_balance_wallet',
                web: 'account_balance_wallet',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="heart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Ask AI',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="bubble.left.and.bubble.right.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="ellipsis" color={color} />,
        }}
      />
      {/* Reached via the More screen, not directly tabbed — kept registered with href: null
          so the tab bar doesn't surface them (same href: null pattern the old "Tab Two"
          scaffold used before it was removed). */}
      <Tabs.Screen name="alerts" options={{ href: null }} />
      <Tabs.Screen name="impulse" options={{ href: null }} />
      <Tabs.Screen name="news" options={{ href: null }} />
    </Tabs>
  );
}
