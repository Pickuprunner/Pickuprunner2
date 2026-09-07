import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions, Animated } from 'react-native';
import { CheckCircle, Wifi, WifiOff } from '@blinkdotnew/mobile-ui';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Order } from '@/lib/orders';
import { APP_CONFIG, calcDriverEarnings } from '@/lib/config';
import { colors, shadows, borderRadius } from '@/constants/design';
import { haptic, GOLD, GOLD_LIGHT, GREEN, COBALT } from './mapTypes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BLUE = '#00A8FF';
const TAB_WIDTH = 92;

export function MapStopsCarousel({
  pendingOrders,
  activeOrders,
  selectedId,
  isConnected,
  onSelectId,
  currentTab: controlledTab,
  onTabChange,
}: {
  pendingOrders: Order[];
  activeOrders: Order[];
  selectedId: string | null;
  isConnected: boolean;
  onSelectId: (id: string) => void;
  currentTab?: 'active' | 'pending';
  onTabChange?: (tab: 'active' | 'pending') => void;
}) {
  const [internalTab, setInternalTab] = useState<'active' | 'pending'>('pending');
  const currentTab = controlledTab ?? internalTab;
  const setCurrentTab = onTabChange ?? setInternalTab;

  const slideAnim = useRef(new Animated.Value(currentTab === 'pending' ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: currentTab === 'pending' ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 50,
    }).start();
  }, [currentTab]);

  useEffect(() => {
    if (activeOrders.length === 0 && pendingOrders.length > 0 && currentTab === 'active') {
      setCurrentTab('pending');
    }
  }, [activeOrders.length, pendingOrders.length, currentTab]);

  const displayOrders = currentTab === 'active' ? activeOrders : pendingOrders;

  return (
    <View style={styles.pendingStopsContainer}>
      <View style={styles.bottomHeaderRow}>
        <View style={styles.segmentedControl}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.slidingPill,
              {
                left: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [3, 3 + TAB_WIDTH],
                }),
                borderColor:
                  currentTab === 'active'
                    ? 'rgba(0, 168, 255, 0.45)'
                    : 'rgba(255, 227, 153, 0.45)',
              },
            ]}
          >
            <LinearGradient
              colors={
                currentTab === 'active'
                  ? ['rgba(0, 168, 255, 0.22)', 'rgba(0, 168, 255, 0.06)']
                  : ['rgba(255, 227, 153, 0.20)', 'rgba(255, 227, 153, 0.05)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.slidingGradient}
            />
          </Animated.View>

          <Pressable
            onPress={() => {
              haptic('light');
              setCurrentTab('active');
            }}
            style={({ pressed }) => [
              styles.segmentTab,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                currentTab === 'active' && styles.segmentTextActiveBlue,
              ]}
            >
              Active {activeOrders.length}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              haptic('light');
              setCurrentTab('pending');
            }}
            style={({ pressed }) => [
              styles.segmentTab,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                currentTab === 'pending' && styles.segmentTextActiveGold,
              ]}
            >
              Pending {pendingOrders.length}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.liveBadge, isConnected ? styles.liveBadgeOn : styles.liveBadgeOff]}>
          {isConnected ? <Wifi size={10} color={GREEN} /> : <WifiOff size={10} color="#666" />}
          <Text style={[styles.liveText, isConnected ? styles.liveTextOn : styles.liveTextOff]}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsScrollContent}
      >
        {displayOrders.map((order) => {
          const isSelected = order.id === selectedId;
          const shortId = order.id ? order.id.slice(-6).toUpperCase() : '------';
          const initial = (order.customerName?.trim() || 'C').charAt(0).toUpperCase();
          const miles = Number(order.distanceMiles ?? 0);
          const tipAmount = Number(order.tipAmount ?? 0);
          const earnings = calcDriverEarnings(miles, tipAmount);
          const isActive = order.status === 'accepted' || order.status === 'picked_up';

          return (
            <Pressable
              key={order.id}
              onPress={() => {
                haptic('light');
                onSelectId(order.id);
              }}
              style={({ pressed }) => [
                styles.stopCard,
                displayOrders.length === 1 && styles.stopCardSingle,
                isSelected && (isActive ? styles.stopCardSelectedActive : styles.stopCardSelectedPending),
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.stopCardHeader}>
                <View
                  style={[
                    styles.avatarCircleSmall,
                    isActive && { borderColor: colors.primary, backgroundColor: colors.surfaceContainerLowest },
                  ]}
                >
                  <Text style={[styles.avatarTextSmall, isActive && { color: colors.primary }]}>
                    {initial}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.stopCustomerName} numberOfLines={1}>
                      {order.customerName || 'Customer'}
                    </Text>
                    {isActive && (
                      <View style={styles.activeTag}>
                        <Text style={styles.activeTagText}>
                          {order.status === 'picked_up' ? 'IN TRANSIT' : 'ACCEPTED'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.stopOrderId}>#{shortId}</Text>
                </View>
              </View>

              <View style={styles.stopRoutesContainer}>
                <View style={styles.stopConnectingLine} />
                <View style={styles.stopRouteItem}>
                  <View style={[styles.stopRouteIcon, { borderColor: colors.primary }]}>
                    <MaterialIcons name="inventory-2" size={10} color={colors.primary} />
                  </View>
                  <Text style={styles.stopRouteText} numberOfLines={1}>
                    {order.pickupAddress || APP_CONFIG.STORE_ADDRESS}
                  </Text>
                </View>

                <View style={styles.stopRouteItem}>
                  <View style={[styles.stopRouteIcon, { borderColor: colors.tertiary }]}>
                    <MaterialIcons name="location-on" size={10} color={colors.tertiary} />
                  </View>
                  <Text style={styles.stopRouteText} numberOfLines={1}>
                    {order.deliveryAddress || '—'}
                  </Text>
                </View>
              </View>

              <View style={styles.stopCardFooter}>
                <View style={styles.stopPriceCol}>
                  <Text style={[styles.stopPriceText, isActive && { color: colors.onSurface }]}>
                    ${earnings.totalDisplay}
                  </Text>
                  <Text style={styles.stopDistanceText}>
                    {order.distanceMiles ? `${order.distanceMiles} mi` : '5.2 mi'}
                  </Text>
                </View>
                <View style={[styles.tapDetailsBtn, isActive && styles.tapDetailsBtnActive]}>
                  <Text style={styles.tapDetailsBtnText}>
                    {isActive ? 'View Route' : 'Tap details'}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}

        {displayOrders.length === 0 && (
          <View style={styles.emptyStopsBox}>
            <CheckCircle size={20} color={GREEN} />
            <Text style={styles.emptyStopsText}>
              {currentTab === 'active'
                ? 'No active deliveries. Check pending tab.'
                : 'All pending deliveries complete!'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pendingStopsContainer: {
    paddingHorizontal: 16,
  },
  bottomHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    padding: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  slidingPill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: TAB_WIDTH,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    overflow: 'hidden',
  },
  slidingGradient: {
    flex: 1,
  },
  segmentTab: {
    width: TAB_WIDTH,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8C90A1',
    letterSpacing: 0.2,
  },
  segmentTextActiveBlue: {
    fontWeight: '800',
    color: BLUE,
  },
  segmentTextActiveGold: {
    fontWeight: '800',
    color: GOLD_LIGHT,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  liveBadgeOn: {
    backgroundColor: colors.greenAlpha15,
    borderColor: colors.greenAlpha30,
  },
  liveBadgeOff: {
    backgroundColor: colors.glassLevel2Bg,
    borderColor: colors.glassLevel2Border,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  liveTextOn: {
    color: GREEN,
  },
  liveTextOff: {
    color: colors.outline,
  },
  cardsScrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  stopCard: {
    width: Math.min(SCREEN_WIDTH * 0.82, 300),
    backgroundColor: colors.glassLevel2Bg,
    borderColor: colors.glassLevel2Border,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: 16,
    gap: 10,
  },
  stopCardSingle: {
    width: SCREEN_WIDTH - 32,
  },
  stopCardSelectedPending: {
    borderColor: GOLD,
    backgroundColor: colors.accentAlpha12,
  },
  stopCardSelectedActive: {
    borderColor: COBALT,
    backgroundColor: colors.primaryAlpha12,
  },
  stopCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  activeTag: {
    backgroundColor: colors.primaryAlpha20,
    borderColor: colors.primaryAlpha40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  activeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  avatarCircleSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextSmall: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '700',
  },
  stopCustomerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
    flex: 1,
  },
  stopOrderId: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  stopRoutesContainer: {
    flexDirection: 'column',
    gap: 6,
    position: 'relative',
    paddingVertical: 2,
  },
  stopConnectingLine: {
    position: 'absolute',
    left: 8,
    top: 12,
    bottom: 12,
    width: 1,
    backgroundColor: colors.outlineVariant,
  },
  stopRouteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
  },
  stopRouteIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopRouteText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  stopCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.glassLevel2Border,
  },
  stopPriceCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  stopPriceText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
  },
  stopDistanceText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  tapDetailsBtn: {
    backgroundColor: COBALT,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    ...shadows.cobaltGlow,
  },
  tapDetailsBtnActive: {
    backgroundColor: COBALT,
  },
  tapDetailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onPrimaryContainer,
    letterSpacing: 0.2,
  },
  emptyStopsBox: {
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  emptyStopsText: {
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
  },
});

