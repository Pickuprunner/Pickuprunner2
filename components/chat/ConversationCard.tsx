import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, MapPin } from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import {
  ChatConversationItem,
  ConversationCardProps,
  AvatarVariant,
  StatusVariant,
} from './types';

export type { ConversationCardProps };

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function resolveAvatarVariant(item: ChatConversationItem): AvatarVariant {
  if (item.avatarVariant) return item.avatarVariant;
  const s = (item.status || '').toLowerCase();
  if (s === 'delivered') return 'gray';
  if (s === 'active' || s === 'active_order' || s === 'pending') return 'mint';
  if (s === 'heading_to_pickup' || s === 'accepted') return 'amber';
  return 'cobalt';
}

function resolveStatusVariant(item: ChatConversationItem): StatusVariant {
  if (item.statusVariant) return item.statusVariant;
  const s = (item.status || '').toLowerCase();
  if (s === 'delivered') return 'gray';
  if (s === 'active' || s === 'active_order' || s === 'pending') return 'emerald';
  return 'amber';
}

function resolveStatusLabel(item: ChatConversationItem): string {
  if (item.statusLabel) return item.statusLabel;
  const s = (item.status || '').toLowerCase();
  if (s === 'accepted' || s === 'heading_to_pickup') return 'Heading to pickup';
  if (s === 'picked_up' || s === 'delivering') return 'Delivering';
  if (s === 'active' || s === 'active_order') return 'Active order';
  if (s === 'delivered') return 'Delivered';
  if (s === 'pending') return 'Active order';
  return item.status ? item.status.replace(/_/g, ' ') : 'Active';
}

export function ConversationCard({ item, role = 'driver', onPress, style }: ConversationCardProps) {
  const avatarVar = resolveAvatarVariant(item);
  const statusVar = resolveStatusVariant(item);
  const statusLabel = resolveStatusLabel(item);
  const initials = item.avatarInitials || getInitials(item.name);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
    onPress();
  };

  const getAvatarGradient = (): [string, string] => {
    switch (avatarVar) {
      case 'amber':
        return ['#F4C300', '#C79900'];
      case 'mint':
        return ['#008255', '#00623F'];
      case 'cobalt':
        return ['#0066FF', '#0054D6'];
      case 'gray':
      default:
        return ['#31353F', '#262A34'];
    }
  };

  const getAvatarTextColor = () => {
    switch (avatarVar) {
      case 'amber':
        return '#0F131C';
      case 'mint':
        return '#E0FFEA';
      case 'cobalt':
        return '#F8F7FF';
      case 'gray':
      default:
        return '#C2C6D8';
    }
  };

  const getAvatarRingColor = () => {
    switch (avatarVar) {
      case 'amber':
        return 'rgba(244, 195, 0, 0.6)';
      case 'mint':
        return 'rgba(0, 226, 151, 0.6)';
      case 'cobalt':
        return 'rgba(0, 102, 255, 0.6)';
      case 'gray':
      default:
        return 'rgba(255, 255, 255, 0.08)';
    }
  };

  const isDelivered = (item.status || '').toLowerCase() === 'delivered';

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        isDelivered && styles.cardDelivered,
        pressed && styles.cardPressed,
        style,
      ]}
    >
      <View style={styles.avatarWrap}>
        <View style={[styles.statusRing, { borderColor: getAvatarRingColor() }]} />
        <LinearGradient
          colors={getAvatarGradient()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarGradient}
        >
          <Text style={[styles.avatarText, { color: getAvatarTextColor() }]}>
            {initials}
          </Text>
        </LinearGradient>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            {!!item.unreadCount && item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
          {item.time && <Text style={styles.timeText}>{item.time}</Text>}
        </View>

        {(item.orderNumber || item.orderMetaText) && (
          <View style={styles.orderMetaRow}>
            {item.orderNumber && (
              <Text
                style={[
                  styles.orderId,
                  isDelivered && { color: 'rgba(194, 198, 216, 0.7)' },
                ]}
              >
                {item.orderNumber.startsWith('#') ? item.orderNumber : `#${item.orderNumber}`}
              </Text>
            )}
            {item.orderNumber && item.orderMetaText && <View style={styles.metaDot} />}
            {item.orderMetaText && (
              <Text style={styles.orderMetaText}>{item.orderMetaText}</Text>
            )}
          </View>
        )}

        {item.address && (
          <View style={styles.addressRow}>
            <MapPin size={12} color="rgba(194, 198, 216, 0.6)" />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <View
            style={[
              styles.statusBadge,
              statusVar === 'amber' && styles.statusAmber,
              statusVar === 'emerald' && styles.statusEmerald,
              statusVar === 'gray' && styles.statusGray,
            ]}
          >
            <View
              style={[
                styles.dot,
                statusVar === 'amber' && styles.dotAmber,
                statusVar === 'emerald' && styles.dotEmerald,
                statusVar === 'gray' && styles.dotGray,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                statusVar === 'amber' && styles.statusTextAmber,
                statusVar === 'emerald' && styles.statusTextEmerald,
                statusVar === 'gray' && styles.statusTextGray,
              ]}
            >
              {statusLabel}
            </Text>
          </View>

          <ChevronRight size={16} color="rgba(194, 198, 216, 0.4)" />
        </View>
      </View>
    </Pressable>
  );
}

export default ConversationCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 8,
  },
  cardDelivered: {
    opacity: 0.8,
  },
  cardPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    transform: [{ scale: 0.985 }],
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  statusRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DFE2EF',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  unreadBadge: {
    backgroundColor: '#0066FF',
    minWidth: 16,
    height: 16,
    paddingHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#F8F7FF',
    fontSize: 10,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(194, 198, 216, 0.55)',
    flexShrink: 0,
  },
  orderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    marginBottom: 6,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B3C5FF',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(194, 198, 216, 0.5)',
  },
  orderMetaText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(194, 198, 216, 0.7)',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  addressText: {
    fontSize: 13,
    color: 'rgba(194, 198, 216, 0.78)',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 9999,
  },
  statusAmber: {
    backgroundColor: 'rgba(244, 195, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 195, 0, 0.3)',
  },
  statusEmerald: {
    backgroundColor: 'rgba(0, 226, 151, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 226, 151, 0.3)',
  },
  statusGray: {
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotAmber: {
    backgroundColor: '#FFE399',
    shadowColor: '#F4C300',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
    elevation: 2,
  },
  dotEmerald: {
    backgroundColor: '#00E297',
    shadowColor: '#00E297',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
    elevation: 2,
  },
  dotGray: {
    backgroundColor: '#C2C6D8',
    opacity: 0.7,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statusTextAmber: {
    color: '#FFE399',
  },
  statusTextEmerald: {
    color: '#00E297',
  },
  statusTextGray: {
    color: '#C2C6D8',
  },
});
