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

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import apiClient from '../src/api/client';

// Configure how notifications behave when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.log('Missing EAS projectId in app config -- cannot register for push notifications');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

// Watches auth state and redirects to the correct route group.
function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const tokens = useThemeTokens();

  useEffect(() => {
    if (session) {
      // Sync push token with backend on login
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          apiClient.post('/users/push-token', { expo_push_token: token })
            .catch(err => console.log('Failed to sync push token', err));
        }
      });
    }
  }, [session]);

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
            {/* Alerts/Impulse/News — moved out of the (tabs) swipeable pager entirely
                (spec/ui.md "Tab Navigation — Swipe Gestures": a route registered under a
                swipeable pager can be physically swiped onto, regardless of tab-bar
                visibility, so these 3 must live as sibling Stack routes instead). Each
                screen builds its own complete internal header, same as stock/[symbol]. */}
            <Stack.Screen name="alerts" options={{ headerShown: false }} />
            <Stack.Screen name="impulse" options={{ headerShown: false }} />
            <Stack.Screen name="news" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </AuthProvider>
      </View>
    </GestureHandlerRootView>
  );
}
