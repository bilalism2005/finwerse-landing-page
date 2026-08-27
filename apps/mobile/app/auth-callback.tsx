import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getSupabase } from '@finwerse/shared';
import { useThemeTokens } from '../src/store/themeStore';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const tokens = useThemeTokens();

  useEffect(() => {
    async function exchangeCode() {
      // The authorization code is passed as `code` in the URL
      const code = params.code as string | undefined;

      if (!code) {
        // If there's no code (e.g., user cancelled), redirect back to login
        router.replace('/(auth)/login');
        return;
      }

      try {
        const supabase = getSupabase();
        // Exchange the code for a persistent session
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error('Session exchange error:', error.message);
          router.replace('/(auth)/login');
        } else {
          // Successfully logged in! AuthGate will pick this up, but we can also manually push to tabs
          router.replace('/(tabs)');
        }
      } catch (e) {
        console.error('Unexpected error exchanging code:', e);
        router.replace('/(auth)/login');
      }
    }

    exchangeCode();
  }, [params.code, router]);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.canvas, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
      <ActivityIndicator size="large" color={tokens.accent} />
      <Text style={{ color: tokens.textPrimary, fontSize: 16, fontWeight: '600' }}>Securely logging you in...</Text>
    </View>
  );
}
