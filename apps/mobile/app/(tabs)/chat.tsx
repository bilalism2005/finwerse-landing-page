import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatStore, CHAT_ERROR_MESSAGE } from '../../src/store/chatStore';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { useThemeTokens, useThemeStore } from '../../src/store/themeStore';
import type { ThemeTokens } from '../../src/theme/tokens';

const SUGGESTIONS = [
  "Why is my portfolio weak?",
  "Explain RELIANCE",
  "What changed in ZOMATO?",
  "Which holdings need attention?",
];

// Dot-pulse typing indicator (spec/ui.md → "Screen: Ask AI", item 4). Spec confirms neither
// Home nor Stock Detail has a shipped dot-pulse pattern to reuse today — this is a fresh
// application of the Design System's micro-interaction motion token (120-250ms per-dot stagger)
// for this screen, replacing the previous spinner + "Analyzing data..." treatment.
function DotPulse({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (value: Animated.Value, staggerDelay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(staggerDelay),
          Animated.timing(value, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0.3, duration: 250, useNativeDriver: true }),
          Animated.delay(250 - staggerDelay),
        ])
      );

    const animations = [pulse(dot1, 0), pulse(dot2, 120), pulse(dot3, 240)];
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dotPulseRow} accessibilityLabel="Finwerse is thinking">
      {[dot1, dot2, dot3].map((value, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              opacity: value,
              transform: [
                {
                  scale: value.interpolate({
                    inputRange: [0.3, 1],
                    outputRange: [0.85, 1.15],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function ChatScreen() {
  const tokens = useThemeTokens();
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const [inputText, setInputText] = useState('');
  const { messages, isStreaming, sendMessage, clearHistory } = useChatStore();
  const flatListRef = useRef<FlatList>(null);

  const handleClearHistory = () => {
    Alert.alert(
      'Clear chat history?',
      "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearHistory },
      ]
    );
  };

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (text.trim() && !isStreaming) {
      if (!textToSend) setInputText('');
      sendMessage(text.trim());
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isStreaming]);

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    const isAssistant = item.role === 'assistant';
    const isLoading = isStreaming && isAssistant && !item.content;
    const isErrorMessage = isAssistant && !isLoading && item.content === CHAT_ERROR_MESSAGE;

    if (isUser) {
      return (
        <View style={[styles.messageRow, styles.userRow]}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, styles.botRow]}>
        {isLoading ? (
          <DotPulse styles={styles} />
        ) : (
          <Text style={[styles.botText, isErrorMessage && styles.botTextError]}>
            {item.content}
          </Text>
        )}
      </View>
    );
  };

  const containerProps = Platform.OS === 'ios'
    ? { behavior: 'padding' as const, keyboardVerticalOffset: 90, style: styles.keyboardContainer }
    : { behavior: 'height' as const, style: styles.keyboardContainer };

  return (
    <KeyboardAvoidingView {...containerProps}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Ask AI</Text>
            <Text style={styles.headerSubtitle}>Your Finwerse intelligence layer</Text>
          </View>
          {messages.length > 0 && (
            <Pressable
              onPress={handleClearHistory}
              style={({ pressed }) => [styles.clearButton, pressed && styles.clearButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Clear chat history"
            >
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          )}
        </View>

        {/* Chat List / Empty State */}
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>What would you like to understand?</Text>

            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsHeader}>SUGGESTED</Text>
              {SUGGESTIONS.map((suggestion, index) => (
                <Pressable
                  key={index}
                  style={({ pressed }) => [styles.suggestionRow, pressed && styles.suggestionRowPressed]}
                  onPress={() => handleSend(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                  <IconSymbol name="chevron.right" size={16} color={tokens.textTertiary} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatList}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Composer */}
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Ask about a stock or your portfolio..."
            placeholderTextColor={tokens.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isStreaming}
            keyboardAppearance={mode === 'light' ? 'light' : 'dark'}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!inputText.trim() || isStreaming) && styles.sendButtonDisabled,
              pressed && !!inputText.trim() && !isStreaming && styles.sendButtonPressed,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isStreaming}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <IconSymbol
              name="arrow.up"
              size={18}
              color={inputText.trim() && !isStreaming ? tokens.onAccent : tokens.textTertiary}
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function createStyles(tokens: ThemeTokens) {
  return StyleSheet.create({
    keyboardContainer: {
      flex: 1,
      backgroundColor: tokens.canvas,
    },
    safeArea: {
      flex: 1,
      backgroundColor: tokens.canvas,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: tokens.canvas,
      borderBottomWidth: 1,
      borderBottomColor: tokens.dividerSubtle,
    },
    headerTitle: {
      fontSize: 19,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    headerSubtitle: {
      fontSize: 13,
      color: tokens.textTertiary,
      marginTop: 2,
    },
    clearButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: tokens.secondarySurface,
    },
    clearButtonPressed: {
      opacity: 0.7,
    },
    clearText: {
      color: tokens.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    chatList: {
      padding: 16,
      paddingBottom: 24,
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
      backgroundColor: 'transparent',
    },
    userRow: {
      justifyContent: 'flex-end',
    },
    botRow: {
      justifyContent: 'flex-start',
    },
    userBubble: {
      maxWidth: '78%',
      backgroundColor: tokens.dividerSubtle,
      borderRadius: 16,
      borderBottomRightRadius: 4,
      paddingHorizontal: 15,
      paddingVertical: 11,
    },
    userText: {
      color: tokens.textPrimary,
      fontWeight: '600',
      fontSize: 14.5,
      lineHeight: 21,
    },
    botText: {
      color: tokens.textPrimary,
      fontSize: 15,
      lineHeight: 22,
      flexShrink: 1,
    },
    botTextError: {
      color: tokens.negative,
    },
    dotPulseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
      backgroundColor: 'transparent',
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: tokens.textTertiary,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: 'transparent',
    },
    emptyTitle: {
      fontSize: 25,
      fontWeight: '600',
      letterSpacing: -0.4,
      lineHeight: 31,
      maxWidth: 280,
      color: tokens.textPrimary,
      textAlign: 'center',
    },
    suggestionsContainer: {
      width: '100%',
      backgroundColor: 'transparent',
    },
    suggestionsHeader: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.textTertiary,
      letterSpacing: 1,
      marginTop: 32,
      marginBottom: 4,
    },
    suggestionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'transparent',
      paddingVertical: 15,
      paddingHorizontal: 2,
      borderBottomWidth: 1,
      borderBottomColor: tokens.dividerSubtle,
    },
    suggestionRowPressed: {
      opacity: 0.8,
    },
    suggestionText: {
      color: tokens.textPrimary,
      fontSize: 14.5,
      flex: 1,
      marginRight: 8,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: tokens.canvas,
      borderWidth: 1,
      borderColor: tokens.dividerStrong,
    },
    input: {
      flex: 1,
      backgroundColor: tokens.elevatedSurface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      color: tokens.textPrimary,
      fontSize: 15,
      maxHeight: 100,
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: tokens.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonPressed: {
      opacity: 0.85,
    },
    sendButtonDisabled: {
      backgroundColor: tokens.elevatedSurface,
    },
  });
}
