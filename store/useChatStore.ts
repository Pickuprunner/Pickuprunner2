import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  role?: string;
}

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {};

interface ChatStoreState {
  conversations: Record<string, ChatMessage[]>;
  sendMessage: (orderId: string, message: { text: string; senderId: string; senderName: string; role?: string }) => ChatMessage;
  getMessages: (orderId: string) => ChatMessage[];
  clearConversation: (orderId: string) => void;
}

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      conversations: INITIAL_MESSAGES,

      sendMessage: (orderId, messageData) => {
        const newMsg: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          ...messageData,
        };

        set((state) => {
          const current = state.conversations[orderId] || [];
          return {
            conversations: {
              ...state.conversations,
              [orderId]: [...current, newMsg],
            },
          };
        });

        return newMsg;
      },

      getMessages: (orderId) => {
        return get().conversations[orderId] || [];
      },

      clearConversation: (orderId) => {
        set((state) => {
          const copy = { ...state.conversations };
          delete copy[orderId];
          return { conversations: copy };
        });
      },
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
