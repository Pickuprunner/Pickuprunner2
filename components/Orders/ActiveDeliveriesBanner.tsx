import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Order } from '@/lib/orders';

interface Props {
  queueCount: number;
  orders?: Order[];
  onPress?: () => void;
}

export function ActiveDeliveriesBanner({ queueCount, orders = [], onPress }: Props) {
  if (queueCount <= 0 && orders.length <= 0) return null;

  const count = orders.length > 0 ? orders.length : queueCount;

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    if (onPress) {
      onPress();
    } else {
      router.push('/(tabs)/my-orders');
    }
  };

  return (
    <View style={styles.floatingWrapper} pointerEvents="box-none">
      <Pressable
        onPress={handlePress}
        accessibilityLabel="Active Deliveries"
        style={({ pressed }) => [
          styles.floatingPanel,
          pressed && { transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={styles.floatingTextCol}>
          <Text style={styles.floatingTitle}>Active Deliveries</Text>
          <Text style={styles.floatingSubtitle}>
            {count} order{count > 1 ? 's' : ''} in progress · Tap to view
          </Text>
        </View>

        <View style={styles.floatingRightRow}>
          <View style={styles.floatingCountBadge}>
            <Text style={styles.floatingCountText}>{count}</Text>
          </View>
          <MaterialIcons name="arrow-forward" size={18} color="#FFE399" />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 40,
  },
  floatingPanel: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 34, 45, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255, 227, 153, 0.25)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  floatingTextCol: {
    flex: 1,
  },
  floatingTitle: {
    color: '#DFE2EF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  floatingSubtitle: {
    color: '#C2C6D8',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  floatingRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingCountBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 227, 153, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 227, 153, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCountText: {
    color: '#FFE399',
    fontSize: 13,
    fontWeight: '700',
  },
});
