import { useFonts } from 'expo-font';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { initSupabase, AuthProvider, useAuth } from '@finwerse/shared';
import { useThemeTokens, useThemeStore } from '../src/store/themeStore';
import { secureStorage } from '../src/secureStorage';

// Initialise the Supabase client once at app boot. Session storage uses the
// iOS Keychain / Android Keystore (via expo-secure-store) instead of
// AsyncStorage, since the session contains the access + refresh token pair
// and AsyncStorage is unencrypted on-disk storage.
initSupabase(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // must be false on native
    },
  }
);

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// Registers the notification handler at module load. The actual permission
// request (registerAndSyncPushToken) is triggered contextually from Alerts'
// first-alert-creation flow instead of here -- see src/notifications.ts.
import '../src/notifications';

// Watches auth state and redirects to the correct route group.
function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const tokens = useThemeTokens();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // No session → send to login screen
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Session exists → send to main app
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          backgroundColor: tokens.canvas,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={tokens.accent} />
      </View>
    );
  }

  return null;
}

import * as Updates from 'expo-updates';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const tokens = useThemeTokens();
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    async function checkUpdates() {
      if (__DEV__ || !Updates.isEnabled) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.warn('OTA update check failed', e);
      }
    }
    checkUpdates();
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    // Required by react-native-gesture-handler (which react-native-tab-view's swipeable
    // pager depends on, per spec/ui.md "Tab Navigation — Swipe Gestures") — must wrap the
    // whole app at the root for gestures to work correctly anywhere below it.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: tokens.canvas }}>
        <StatusBar style={mode === 'light' ? 'dark' : 'light'} backgroundColor={tokens.canvas} />
        <AuthProvider>
          <AuthGate />
          <Stack screenOptions={{ contentStyle: { backgroundColor: tokens.canvas } }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="stock/[symbol]" options={{ headerShown: false }} />
            <Stack.Screen name="article/[id]" options={{ headerShown: false }} />
            {/* Alerts/Impulse/News — moved out of the (tabs) swipeable pager entirely
                (spec/ui.md "Tab Navigation — Swipe Gestures": a route registered under a
                swipeable pager can be physically swiped onto, regardless of tab-bar
                visibility, so these 3 must live as sibling Stack routes instead). Each
                screen builds its own complete internal header, same as stock/[symbol]. */}
            <Stack.Screen name="alerts" options={{ headerShown: false }} />
            <Stack.Screen name="impulse" options={{ headerShown: false }} />
            <Stack.Screen name="news" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </AuthProvider>
      </View>
    </GestureHandlerRootView>
  );
}
