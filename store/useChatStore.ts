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
  mine?: boolean;
  readAt?: string | null;
}

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {};

interface ChatStoreState {
  conversations: Record<string, ChatMessage[]>;
  unreadCounts: Record<string, number>;
  totalUnread: number;
  activeThreadOrderId: string | null;
  setActiveThreadOrderId: (orderId: string | null) => void;
  setTotalUnread: (count: number) => void;
  incrementUnread: (orderId: string) => void;
  clearUnread: (orderId: string) => void;
  sendMessage: (
    orderId: string,
    messageData: {
      id?: string;
      text: string;
      senderId: string;
      senderName: string;
      role?: string;
      mine?: boolean;
      readAt?: string | null;
      timestamp?: number;
    }
  ) => ChatMessage;
  setMessages: (orderId: string, messages: ChatMessage[]) => void;
  getMessages: (orderId: string) => ChatMessage[];
  clearConversation: (orderId: string) => void;
}

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      conversations: INITIAL_MESSAGES,
      unreadCounts: {},
      totalUnread: 0,
      activeThreadOrderId: null,

      setActiveThreadOrderId: (orderId) => {
        set((state) => {
          if (!orderId) return { activeThreadOrderId: null };
          const unreadForThis = state.unreadCounts[orderId] || 0;
          const newCounts = { ...state.unreadCounts, [orderId]: 0 };
          const newTotal = Math.max(0, state.totalUnread - unreadForThis);
          return {
            activeThreadOrderId: orderId,
            unreadCounts: newCounts,
            totalUnread: newTotal,
          };
        });
      },

      setTotalUnread: (count) => set({ totalUnread: Math.max(0, count) }),

      incrementUnread: (orderId) => {
        set((state) => {
          if (state.activeThreadOrderId === orderId) {
            return state;
          }
          const prevOrderUnread = state.unreadCounts[orderId] || 0;
          const nextOrderUnread = prevOrderUnread + 1;
          const nextCounts = { ...state.unreadCounts, [orderId]: nextOrderUnread };
          const nextTotal = Object.values(nextCounts).reduce((sum, v) => sum + v, 0);
          return {
            unreadCounts: nextCounts,
            totalUnread: nextTotal,
          };
        });
      },

      clearUnread: (orderId) => {
        set((state) => {
          const unreadForThis = state.unreadCounts[orderId] || 0;
          const nextCounts = { ...state.unreadCounts, [orderId]: 0 };
          const nextTotal = Math.max(0, state.totalUnread - unreadForThis);
          return {
            unreadCounts: nextCounts,
            totalUnread: nextTotal,
          };
        });
      },

      sendMessage: (orderId, messageData) => {
        const newMsg: ChatMessage = {
          id: messageData.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: messageData.timestamp || Date.now(),
          ...messageData,
        };

        set((state) => {
          const current = state.conversations[orderId] || [];
          const filtered = current.filter((m) => m.id !== newMsg.id);
          return {
            conversations: {
              ...state.conversations,
              [orderId]: [...filtered, newMsg],
            },
          };
        });

        return newMsg;
      },

      setMessages: (orderId, messages) => {
        set((state) => ({
          conversations: {
            ...state.conversations,
            [orderId]: messages,
          },
        }));
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
