import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { useThemeTokens } from '../../src/store/themeStore';

export default function TabLayout() {
  const tokens = useThemeTokens();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tokens.accent,
        tabBarInactiveTintColor: tokens.textTertiary,
        tabBarStyle: { backgroundColor: tokens.canvas, borderTopColor: tokens.dividerSubtle, elevation: 0 },
        tabBarHideOnKeyboard: true,
        sceneContainerStyle: { backgroundColor: tokens.canvas },
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
