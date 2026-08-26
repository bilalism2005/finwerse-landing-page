import { create } from 'zustand';
import apiClient from '../api/client';

// Exported so the chat screen can detect this exact error response (to apply
// Negative-tinted error styling) without hardcoding a second copy of this
// string that could silently drift out of sync with this one.
export const CHAT_ERROR_MESSAGE = 'Sorry, I encountered an error. Please try again.';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  addMessage: (message: ChatMessage) => void;
  sendMessage: (query: string) => Promise<void>;
  clearHistory: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  clearHistory: () => set({ messages: [] }),

  sendMessage: async (query: string) => {
    const { messages, addMessage } = get();
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
    };
    addMessage(userMessage);

    // Add empty assistant message that will be streamed into
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
    };
    addMessage(assistantMessage);
    
    set({ isStreaming: true });

    try {
      const historyPayload = messages.map(m => ({ role: m.role, content: m.content }));
      
      const response = await apiClient.post('/chatbot/ask', {
        query,
        history: historyPayload
      }, {
        responseType: 'text' 
      });

      // Update the assistant message with the response
      set((state) => ({
        messages: state.messages.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: response.data }
            : msg
        ),
        isStreaming: false
      }));

    } catch (error) {
      console.error('Chat error:', error);
      set((state) => ({
        messages: state.messages.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: CHAT_ERROR_MESSAGE }
            : msg
        ),
        isStreaming: false
      }));
    }
  },
}));
