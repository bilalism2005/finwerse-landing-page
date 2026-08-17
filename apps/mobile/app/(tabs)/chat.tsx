import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatStore } from '../../src/store/chatStore';
import { IconSymbol } from '../../components/ui/IconSymbol';

const SUGGESTIONS = [
  "How is my portfolio doing?",
  "Tell me about RELIANCE",
  "When was the last time ZOMATO was at this score?",
  "What is Twitter saying about TCS?",
];

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

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <IconSymbol name="sparkles" size={16} color="#B7FF00" />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
          {isLoading ? (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color="#B7FF00" />
              <Text style={styles.thinkingText}>Analyzing data...</Text>
            </View>
          ) : (
            <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
              {item.content}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Ask AI</Text>
            <Text style={styles.headerSubtitle}>Finwerse Intelligence & Analysis</Text>
          </View>
          {messages.length > 0 && (
            <TouchableOpacity onPress={clearHistory} style={styles.clearButton}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Chat List / Empty State */}
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.sparkleCircle}>
              <IconSymbol name="sparkles" size={36} color="#B7FF00" />
            </View>
            <Text style={styles.emptyTitle}>What would you like to analyze?</Text>
            <Text style={styles.emptySubtitle}>
              Ask about your portfolio, stock scores, technical indicators, or corporate filings.
            </Text>

            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsHeader}>Suggested Questions</Text>
              {SUGGESTIONS.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionBadge}
                  onPress={() => handleSend(suggestion)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                  <IconSymbol name="arrow.right" size={14} color="#666" />
                </TouchableOpacity>
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

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask about a stock or your portfolio..."
            placeholderTextColor="#666"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isStreaming}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isStreaming) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isStreaming}
            activeOpacity={0.8}
          >
            {isStreaming ? (
              <ActivityIndicator size="small" color="#0D0D0D" />
            ) : (
              <IconSymbol
                name="arrow.up"
                size={20}
                color={inputText.trim() ? "#0D0D0D" : "#555"}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  clearText: {
    color: '#888',
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
    backgroundColor: '#1E2A1E',
    borderWidth: 1,
    borderColor: '#2E4A2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#10B981',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#282828',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#0D0D0D',
    fontWeight: '600',
  },
  botText: {
    color: '#E8E8E8',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  thinkingText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
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
    backgroundColor: '#182418',
    borderWidth: 1,
    borderColor: '#2A402A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#777',
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
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  suggestionBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#141414',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242424',
    marginBottom: 10,
  },
  suggestionText: {
    color: '#CCC',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    color: '#FFF',
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#B7FF00',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#262626',
  },
});
