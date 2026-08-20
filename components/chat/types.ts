import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

export type AvatarVariant = 'amber' | 'mint' | 'cobalt' | 'gray';

export type StatusVariant = 'amber' | 'emerald' | 'gray';

export type ChatRole = 'driver' | 'customer';

export interface ChatConversationItem {
  id: string;
  name: string;
  orderNumber?: string;
  orderMetaText?: string;
  address?: string;
  time?: string;
  unreadCount?: number;
  status?: string;
  statusLabel?: string;
  statusVariant?: StatusVariant;
  avatarVariant?: AvatarVariant;
  avatarInitials?: string;
  distanceMiles?: number;
}

export interface ConversationCardProps {
  item: ChatConversationItem;
  role?: ChatRole;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}
