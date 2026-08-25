import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatStore } from '../../src/store/chatStore';
import { IconSymbol } from '../../components/ui/IconSymbol';

// Design System — Mobile Redesign tokens (spec/ui.md → "Design System — Mobile Redesign")
const COLOR_CANVAS = '#090B0A';
const COLOR_SURFACE_ELEVATED = '#131613';
const COLOR_SURFACE_SECONDARY = '#191D19';
const COLOR_DIVIDER = '#1A1E1A';
const COLOR_TEXT_PRIMARY = '#F5F7F2';
const COLOR_TEXT_SECONDARY = '#A4AAA3';
const COLOR_TEXT_TERTIARY = '#6F766F';
const COLOR_ACCENT_LIME = '#C7FF3D';
const COLOR_NEGATIVE = '#FF6B67';

const SUGGESTIONS = [
  "How is my portfolio doing?",
  "Tell me about RELIANCE",
  "When was the last time ZOMATO was at this score?",
  "What is Twitter saying about TCS?",
];

// Matches useChatStore.sendMessage's catch-block copy exactly (src/store/chatStore.ts) —
// used only to detect an in-thread error response for the Negative-tinted bubble border
// (spec/ui.md → "Screen: Ask AI", item 7). No store changes; presentation-only.
const ERROR_MESSAGE_COPY = 'Sorry, I encountered an error. Please try again.';

// Dot-pulse typing indicator (spec/ui.md → "Screen: Ask AI", item 4). Spec confirms neither
// Home nor Stock Detail has a shipped dot-pulse pattern to reuse today — this is a fresh
// application of the Design System's micro-interaction motion token (120-250ms per-dot stagger)
// for this screen, replacing the previous spinner + "Analyzing data..." treatment.
function DotPulse() {
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
  const [inputText, setInputText] = useState('');
  const { messages, isStreaming, sendMessage, clearHistory } = useChatStore();
  const flatListRef = useRef<FlatList>(null);

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
    const isErrorMessage = isAssistant && !isLoading && item.content === ERROR_MESSAGE_COPY;

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <IconSymbol name="sparkles" size={16} color={COLOR_ACCENT_LIME} />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.botBubble,
            isErrorMessage && styles.botBubbleError,
          ]}
        >
          {isLoading ? (
            <DotPulse />
          ) : (
            <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
              {item.content}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const ContainerComponent = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
  const containerProps = Platform.OS === 'ios'
    ? { behavior: 'padding' as const, keyboardVerticalOffset: 90, style: styles.keyboardContainer }
    : { style: styles.keyboardContainer };

  return (
    <ContainerComponent {...containerProps}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Ask AI</Text>
            <Text style={styles.headerSubtitle}>Finwerse Intelligence & Analysis</Text>
          </View>
          {messages.length > 0 && (
            <Pressable
              onPress={clearHistory}
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
            <View style={styles.sparkleCircle}>
              <IconSymbol name="sparkles" size={32} color={COLOR_ACCENT_LIME} />
            </View>
            <Text style={styles.emptyTitle}>What would you like to analyze?</Text>
            <Text style={styles.emptySubtitle}>
              Ask about your portfolio, stock scores, technical indicators, or corporate filings.
            </Text>

            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsHeader}>Suggested Questions</Text>
              {SUGGESTIONS.map((suggestion, index) => (
                <Pressable
                  key={index}
                  style={({ pressed }) => [styles.suggestionRow, pressed && styles.suggestionRowPressed]}
                  onPress={() => handleSend(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                  <IconSymbol name="chevron.right" size={16} color={COLOR_TEXT_TERTIARY} />
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
            placeholderTextColor={COLOR_TEXT_TERTIARY}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isStreaming}
            keyboardAppearance="dark"
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
              name="paperplane.fill"
              size={18}
              color={inputText.trim() && !isStreaming ? COLOR_CANVAS : COLOR_TEXT_TERTIARY}
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </ContainerComponent>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: COLOR_CANVAS,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLOR_CANVAS,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLOR_CANVAS,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_DIVIDER,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLOR_TEXT_PRIMARY,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLOR_TEXT_TERTIARY,
    marginTop: 2,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLOR_SURFACE_SECONDARY,
  },
  clearButtonPressed: {
    opacity: 0.7,
  },
  clearText: {
    color: COLOR_TEXT_SECONDARY,
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
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLOR_SURFACE_SECONDARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: COLOR_SURFACE_SECONDARY,
    borderWidth: 1,
    borderColor: 'transparent',
    borderBottomLeftRadius: 4,
  },
  botBubbleError: {
    borderColor: COLOR_NEGATIVE,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: COLOR_TEXT_PRIMARY,
    fontWeight: '600',
  },
  botText: {
    color: COLOR_TEXT_PRIMARY,
  },
  dotPulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLOR_TEXT_SECONDARY,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'transparent',
  },
  sparkleCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLOR_SURFACE_ELEVATED,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR_TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLOR_TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  suggestionsContainer: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  suggestionsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: COLOR_TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  suggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLOR_SURFACE_ELEVATED,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  suggestionRowPressed: {
    opacity: 0.8,
  },
  suggestionText: {
    color: COLOR_TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLOR_CANVAS,
    borderTopWidth: 1,
    borderTopColor: COLOR_DIVIDER,
  },
  input: {
    flex: 1,
    backgroundColor: COLOR_SURFACE_ELEVATED,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: COLOR_TEXT_PRIMARY,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLOR_ACCENT_LIME,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonPressed: {
    opacity: 0.85,
  },
  sendButtonDisabled: {
    backgroundColor: COLOR_SURFACE_ELEVATED,
  },
});
