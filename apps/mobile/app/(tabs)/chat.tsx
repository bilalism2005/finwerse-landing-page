import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatStore } from '../../src/store/chatStore';
import { IconSymbol } from '../../components/ui/IconSymbol';

const SUGGESTIONS = [
  "How is my portfolio doing?",
  "When was the last time ZOMATO was at this score?",
  "What is Twitter saying about RELIANCE?",
];

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const { messages, isStreaming, sendMessage, clearHistory } = useChatStore();

  const handleSend = () => {
    if (inputText.trim() && !isStreaming) {
      const query = inputText;
      setInputText('');
      sendMessage(query);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
          {item.content || (isStreaming && !isUser ? "Thinking..." : "")}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ask AI</Text>
        <TouchableOpacity onPress={clearHistory} style={styles.clearButton}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="sparkles" size={48} color="#007AFF" />
          <Text style={styles.emptyTitle}>How can I help you today?</Text>
          <Text style={styles.emptySubtitle}>Ask about your portfolio, a specific stock, or recent filings.</Text>
          
          <View style={styles.suggestionsContainer}>
            {SUGGESTIONS.map((suggestion, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.suggestionBadge}
                onPress={() => {
                  sendMessage(suggestion);
                }}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatList}
          inverted={false}
        />
      )}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask about a stock or your portfolio..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isStreaming}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!inputText.trim() || isStreaming) && styles.sendButtonDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim() || isStreaming}
          >
            <IconSymbol name="arrow.up.circle.fill" size={32} color={inputText.trim() && !isStreaming ? "#007AFF" : "#A0A0A0"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  clearButton: {
    padding: 8,
  },
  clearText: {
    color: '#007AFF',
    fontSize: 16,
  },
  chatList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#000000',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#000000',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
  },
  suggestionsContainer: {
    width: '100%',
    alignItems: 'flex-start',
  },
  suggestionBadge: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 12,
  },
  suggestionText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 12,
    marginBottom: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
