import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { CheckCircle, Wifi, WifiOff } from '@blinkdotnew/mobile-ui';
import { MaterialIcons } from '@expo/vector-icons';
import { Order } from '@/lib/orders';
import { APP_CONFIG, calcDriverEarnings } from '@/lib/config';
import { haptic, GOLD, CYAN, GREEN } from './mapTypes';

export function MapStopsCarousel({
  pendingOrders,
  activeOrders,
  selectedId,
  isConnected,
  onSelectId,
}: {
  pendingOrders: Order[];
  activeOrders: Order[];
  selectedId: string | null;
  isConnected: boolean;
  onSelectId: (id: string) => void;
}) {
  return (
    <View style={styles.pendingStopsContainer}>
      <View style={styles.bottomHeaderRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          <View style={styles.filterRow}>
            <View style={styles.filterPillPending}>
              <View style={[styles.statusDot, { backgroundColor: GOLD }]} />
              <Text style={styles.filterPillTextPending}>Pending ({pendingOrders.length})</Text>
            </View>

            {activeOrders.length > 0 && (
              <View style={styles.filterPillActive}>
                <View style={[styles.statusDot, { backgroundColor: CYAN }]} />
                <Text style={styles.filterPillTextActive}>Active ({activeOrders.length})</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={[styles.liveBadge, isConnected ? styles.liveBadgeOn : styles.liveBadgeOff]}>
          {isConnected ? <Wifi size={11} color={GREEN} /> : <WifiOff size={11} color="#777" />}
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
        {pendingOrders.map((order) => {
          const isSelected = order.id === selectedId;
          const shortId = order.id ? order.id.slice(-6).toUpperCase() : '------';
          const initial = (order.customerName?.trim() || 'C').charAt(0).toUpperCase();
          const miles = Number(order.distanceMiles ?? 0);
          const tipAmount = Number(order.tipAmount ?? 0);
          const earnings = calcDriverEarnings(miles, tipAmount);

          return (
            <Pressable
              key={order.id}
              onPress={() => {
                haptic('light');
                onSelectId(order.id);
              }}
              style={({ pressed }) => [
                styles.stopCard,
                isSelected && styles.stopCardSelected,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.stopCardHeader}>
                <View style={styles.avatarCircleSmall}>
                  <Text style={styles.avatarTextSmall}>{initial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stopCustomerName} numberOfLines={1}>
                    {order.customerName || 'Customer'}
                  </Text>
                  <Text style={styles.stopOrderId}>#{shortId}</Text>
                </View>
              </View>

              <View style={styles.stopRoutesContainer}>
                <View style={styles.stopConnectingLine} />
                <View style={styles.stopRouteItem}>
                  <View style={[styles.stopRouteIcon, { borderColor: '#b3c5ff' }]}>
                    <MaterialIcons name="inventory-2" size={10} color="#b3c5ff" />
                  </View>
                  <Text style={styles.stopRouteText} numberOfLines={1}>
                    {order.pickupAddress || APP_CONFIG.STORE_ADDRESS}
                  </Text>
                </View>

                <View style={styles.stopRouteItem}>
                  <View style={[styles.stopRouteIcon, { borderColor: '#00e297' }]}>
                    <MaterialIcons name="location-on" size={10} color="#00e297" />
                  </View>
                  <Text style={styles.stopRouteText} numberOfLines={1}>
                    {order.deliveryAddress || '—'}
                  </Text>
                </View>
              </View>

              <View style={styles.stopCardFooter}>
                <View style={styles.stopPriceCol}>
                  <Text style={styles.stopPriceText}>${earnings.totalDisplay}</Text>
                  <Text style={styles.stopDistanceText}>
                    {order.distanceMiles ? `${order.distanceMiles} mi` : '5.2 mi'}
                  </Text>
                </View>
                <View style={styles.tapDetailsBtn}>
                  <Text style={styles.tapDetailsBtnText}>Tap details</Text>
                </View>
              </View>
            </Pressable>
          );
        })}

        {pendingOrders.length === 0 && (
          <View style={styles.emptyStopsBox}>
            <CheckCircle size={20} color={GREEN} />
            <Text style={styles.emptyStopsText}>All pending deliveries complete!</Text>
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
    marginBottom: 10,
    gap: 8,
  },
  filterScrollView: {
    flexDirection: 'row',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  filterPillPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(229,169,60,0.12)',
    borderColor: 'rgba(229,169,60,0.3)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  filterPillTextPending: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
  },
  filterPillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,178,255,0.12)',
    borderColor: 'rgba(0,178,255,0.3)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  filterPillTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: CYAN,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  liveBadgeOn: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  liveBadgeOff: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  liveTextOn: {
    color: GREEN,
  },
  liveTextOff: {
    color: '#888888',
  },
  cardsScrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  stopCard: {
    width: 270,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 10,
  },
  stopCardSelected: {
    borderColor: '#0066FF',
    backgroundColor: 'rgba(0, 102, 255, 0.08)',
  },
  stopCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircleSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F131C',
    borderWidth: 1.5,
    borderColor: '#FFE399',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextSmall: {
    color: '#FFE399',
    fontSize: 14,
    fontWeight: '700',
  },
  stopCustomerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dfe2ef',
  },
  stopOrderId: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(194, 198, 216, 0.7)',
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
    backgroundColor: 'rgba(66, 70, 86, 0.3)',
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
    backgroundColor: '#0f131c',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopRouteText: {
    fontSize: 12,
    color: '#C2C6D8',
    flex: 1,
  },
  stopCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  stopPriceCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  stopPriceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffe399',
  },
  stopDistanceText: {
    fontSize: 11,
    color: 'rgba(194, 198, 216, 0.7)',
  },
  tapDetailsBtn: {
    backgroundColor: '#0066FF',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    shadowColor: 'rgba(0, 102, 255, 0.35)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 3,
  },
  tapDetailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8F7FF',
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
