import { SymbolView } from 'expo-symbols';
import { Link, Tabs } from 'expo-router';
import { Platform, Pressable } from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#B7FF00',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: { backgroundColor: '#0D0D0D', borderTopColor: '#1a1a1a' },
        tabBarHideOnKeyboard: true,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="chart.bar.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null, // Hides this tab from the bar
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
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bubble.left.and.bubble.right.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bell.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="impulse"
        options={{
          title: 'Impulse',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.line.down.right" color={color} />,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: 'News',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="newspaper.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
