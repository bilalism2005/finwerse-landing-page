import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeTokens } from '../src/store/themeStore';
import type { ThemeTokens } from '../src/theme/tokens';

export default function NotFoundScreen() {
  const tokens = useThemeTokens();
  const styles = createStyles(tokens);

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

function createStyles(tokens: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor: tokens.canvas,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: tokens.textPrimary,
    },
    link: {
      marginTop: 15,
      paddingVertical: 15,
    },
    linkText: {
      fontSize: 15,
      color: tokens.accent,
    },
  });
}
