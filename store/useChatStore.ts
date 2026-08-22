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

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  ord_sample_101: [
    {
      id: 'msg_1',
      text: 'Hi John, I will be picking up your lumber and screws shortly!',
      senderId: 'usr_static_driver_101',
      senderName: 'Alex Driver',
      timestamp: Date.now() - 1000 * 60 * 10,
      role: 'driver',
    },
    {
      id: 'msg_2',
      text: 'Sounds great Alex! Please leave it near the side gate.',
      senderId: 'usr_customer_101',
      senderName: 'John Doe',
      timestamp: Date.now() - 1000 * 60 * 8,
      role: 'customer',
    },
  ],
  ord_sample_102: [
    {
      id: 'msg_3',
      text: 'Order accepted! Heading to the pickup location now.',
      senderId: 'usr_static_driver_101',
      senderName: 'Alex Driver',
      timestamp: Date.now() - 1000 * 60 * 30,
      role: 'driver',
    },
  ],
};

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
