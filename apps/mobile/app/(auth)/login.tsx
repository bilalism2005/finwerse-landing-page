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
import { useState } from 'react';
import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuth } from '@finwerse/shared';

// Design System — Mobile Redesign tokens (spec/ui.md → "Design System — Mobile Redesign")
// Duplicated locally (same values as app/(tabs)/index.tsx, alerts.tsx, chat.tsx, etc.) rather
// than importing from those screens, to keep this a self-contained single-file redesign per
// the build instructions.
const COLOR_CANVAS = '#090B0A';
const COLOR_SURFACE_ELEVATED = '#131613';
const COLOR_SURFACE_SECONDARY = '#191D19';
const COLOR_DIVIDER = '#1A1E1A';
const COLOR_TEXT_PRIMARY = '#F5F7F2';
const COLOR_TEXT_SECONDARY = '#A4AAA3';
const COLOR_TEXT_TERTIARY = '#6F766F';
const COLOR_ACCENT_LIME = '#C7FF3D';
const COLOR_NEGATIVE = '#FF6B67';
// Low-opacity tint of Negative, for the inline-error callout fill (spec/ui.md Login §5).
const COLOR_NEGATIVE_TINT_BG = 'rgba(255, 107, 103, 0.12)';
// Google's real brand blue for the "G" glyph — exempt from the single-accent-color rule,
// same as sector-identity colors elsewhere (spec/ui.md Login §8).
const COLOR_GOOGLE_BLUE = '#4285F4';

// Configure Google Sign-In with your Web Client ID
GoogleSignin.configure({
  webClientId: '1088172410518-k9rrcaml6k3qfdoebtac96ljtn4cdrsh.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
});

export default function LoginScreen() {
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
            placeholderTextColor={COLOR_TEXT_TERTIARY}
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
            placeholderTextColor={COLOR_TEXT_TERTIARY}
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
              ? <ActivityIndicator color={COLOR_CANVAS} />
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
              <ActivityIndicator color={COLOR_TEXT_PRIMARY} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR_CANVAS,
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
    color: COLOR_TEXT_PRIMARY,
    letterSpacing: 2,
    marginBottom: 32,
    textAlign: 'center',
  },
  // Card — Elevated surface, hero-surface radius, no border: surface-color contrast over
  // borders, same reasoning as Home's search field (spec/ui.md Login §2).
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderRadius: 22,
    padding: 24,
    gap: 14,
  },
  // Tab toggle — segmented control nested inside the Elevated card, so its track uses
  // Secondary surface (not Elevated) for contrast against the parent card (spec/ui.md Login §3).
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLOR_SURFACE_SECONDARY,
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
    backgroundColor: COLOR_ACCENT_LIME,
  },
  tabText: {
    color: COLOR_TEXT_SECONDARY,
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: COLOR_CANVAS,
  },
  // Inputs — same nested-surface adaptation as the tab toggle, Home's search-field treatment
  // otherwise (spec/ui.md Login §4).
  input: {
    backgroundColor: COLOR_SURFACE_SECONDARY,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLOR_TEXT_PRIMARY,
    fontSize: 15,
  },
  // Inline error — contained, tokenized callout: low-opacity Negative-tinted fill holding
  // Negative-colored text. No retry action (spec/ui.md Login §5).
  errorBox: {
    backgroundColor: COLOR_NEGATIVE_TINT_BG,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: {
    color: COLOR_NEGATIVE,
    fontSize: 13,
    textAlign: 'center',
  },
  // Submit — standard primary-CTA treatment (spec/ui.md Login §6).
  btn: {
    backgroundColor: COLOR_ACCENT_LIME,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: COLOR_CANVAS,
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
    backgroundColor: COLOR_DIVIDER,
  },
  dividerText: {
    color: COLOR_TEXT_TERTIARY,
    fontSize: 12,
  },
  // Google — neutral secondary-action treatment, same nested-surface adaptation as the tab
  // toggle/inputs above (spec/ui.md Login §8).
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR_SURFACE_SECONDARY,
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
    color: COLOR_TEXT_PRIMARY,
    fontWeight: '600',
    fontSize: 14,
  },
});
