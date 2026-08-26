import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState, useMemo } from 'react';
import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuth } from '@finwerse/shared';
import { useThemeTokens } from '../../src/store/themeStore';
import type { ThemeTokens } from '../../src/theme/tokens';
import { withAlphaFraction as withAlpha } from '../../src/theme/color';

// Google's real brand blue for the "G" glyph — exempt from the theme-token system,
// same as sector-identity colors elsewhere (spec/ui.md Login §8).
const COLOR_GOOGLE_BLUE = '#4285F4';

// Configure Google Sign-In with your Web Client ID
GoogleSignin.configure({
  webClientId: '1088172410518-k9rrcaml6k3qfdoebtac96ljtn4cdrsh.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
});

export default function LoginScreen() {
  const tokens = useThemeTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { signIn, signUp, signInWithGoogleNative } = useAuth();

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setError(null);
    setLoading(true);
    const fn = tab === 'signin' ? signIn : signUp;
    const { error } = await fn(email, password);
    setLoading(false);
    if (error) setError(error);
    // On success, AuthGate in _layout.tsx automatically redirects to /(tabs)/
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        if (!response.data.idToken) {
          throw new Error('No ID token present!');
        }
        const { error } = await signInWithGoogleNative(response.data.idToken);
        if (error) {
          setError(error);
        }
      } else {
        setError('Sign in was cancelled');
      }
    } catch (error: any) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setError('Android play services not available or outdated.');
            break;
          default:
            setError(error.message ?? 'Some other error happened');
        }
      } else {
        setError(error?.message ?? 'Google sign-in failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Wordmark */}
        <Text style={styles.logo}>Finwerse</Text>

        <View style={styles.card}>
          {/* Tab toggle */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, tab === 'signin' && styles.tabActive]}
              onPress={() => { setTab('signin'); setError(null); }}
            >
              <Text style={[styles.tabText, tab === 'signin' && styles.tabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'signup' && styles.tabActive]}
              onPress={() => { setTab('signup'); setError(null); }}
            >
              <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={tokens.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          {/* Password */}
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={tokens.textTertiary}
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />

          {/* Error — inline, tokenized callout. No retry action: this is a form-validation/
              auth error the user resolves by editing fields and resubmitting, not a fetch
              failure (spec/ui.md Login §5). */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={tokens.onAccent} />
              : <Text style={styles.btnText}>
                  {tab === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          {/* Google */}
          <TouchableOpacity
            style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
            onPress={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color={tokens.textPrimary} />
            ) : (
              <>
                {/* Google G icon — real brand blue, exempt from the single-accent-color rule */}
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(tokens: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tokens.canvas,
    },
    scroll: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    // Wordmark — reuses the Screen-title type token (top of the 28-34pt range), centered and
    // standalone since this screen has no adjacent nav chrome (spec/ui.md Login §1). 650 weight
    // rounded to RN's nearest supported fontWeight string ('700'), same workaround used for
    // Stock Detail's ticker (spec/ui.md Stock Detail §1).
    logo: {
      fontSize: 34,
      fontWeight: '700',
      color: tokens.textPrimary,
      letterSpacing: 2,
      marginBottom: 32,
      textAlign: 'center',
    },
    // Card — Elevated surface, hero-surface radius, no border: surface-color contrast over
    // borders, same reasoning as Home's search field (spec/ui.md Login §2).
    card: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 22,
      padding: 24,
      gap: 14,
    },
    // Tab toggle — segmented control nested inside the Elevated card, so its track uses
    // Secondary surface (not Elevated) for contrast against the parent card (spec/ui.md Login §3).
    tabRow: {
      flexDirection: 'row',
      backgroundColor: tokens.secondarySurface,
      borderRadius: 10,
      padding: 4,
      marginBottom: 8,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
    },
    tabActive: {
      backgroundColor: tokens.accent,
    },
    tabText: {
      color: tokens.textSecondary,
      fontWeight: '600',
      fontSize: 14,
    },
    tabTextActive: {
      color: tokens.onAccent,
    },
    // Inputs — same nested-surface adaptation as the tab toggle, Home's search-field treatment
    // otherwise (spec/ui.md Login §4).
    input: {
      backgroundColor: tokens.secondarySurface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: tokens.textPrimary,
      fontSize: 15,
    },
    // Inline error — contained, tokenized callout: low-opacity Negative-tinted fill holding
    // Negative-colored text. No retry action (spec/ui.md Login §5).
    errorBox: {
      backgroundColor: withAlpha(tokens.negative, 0.12),
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    errorText: {
      color: tokens.negative,
      fontSize: 13,
      textAlign: 'center',
    },
    // Submit — standard primary-CTA treatment (spec/ui.md Login §6).
    btn: {
      backgroundColor: tokens.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    btnText: {
      color: tokens.onAccent,
      fontWeight: '700',
      fontSize: 15,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginVertical: 4,
    },
    divider: {
      flex: 1,
      height: 1,
      backgroundColor: tokens.dividerSubtle,
    },
    dividerText: {
      color: tokens.textTertiary,
      fontSize: 12,
    },
    // Google — neutral secondary-action treatment, same nested-surface adaptation as the tab
    // toggle/inputs above (spec/ui.md Login §8).
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.secondarySurface,
      borderRadius: 12,
      paddingVertical: 14,
      gap: 10,
    },
    googleIcon: {
      color: COLOR_GOOGLE_BLUE,
      fontWeight: '800',
      fontSize: 16,
    },
    googleText: {
      color: tokens.textPrimary,
      fontWeight: '600',
      fontSize: 14,
    },
  });
}
