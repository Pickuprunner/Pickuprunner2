import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrders } from '@/lib/orders';
import { useDriverId } from '@/hooks/useDriverId';

const ACTIVE = '#FFE399';
const INACTIVE = '#C2C6D8';
const TAB_BG = '#0F131C';
const TAB_BORDER = 'rgba(255, 255, 255, 0.05)';

/* ─── Material-styled Tab Icons (using library) ─── */

function InventoryTabIcon({ color, size }: { color: string; size: number }) {
  const { data: orders = [] } = useOrders();
  const driverId = useDriverId();
  const count = orders.filter(
    (o) => o.driverUserId === driverId && (o.status === 'accepted' || o.status === 'picked_up')
  ).length;

  return (
    <View style={styles.iconWrapper}>
      <MaterialIcons name="inventory-2" size={size} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const androidBottomPad = Platform.OS === 'web' ? 10 : Math.max(insets.bottom, 12);
  const hasHomeBar = insets.bottom > 0;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: TAB_BG,
          borderTopWidth: 1,
          borderTopColor: TAB_BORDER,
          height: Platform.OS === 'ios' ? (hasHomeBar ? 52 + insets.bottom - 10 : 58) : 60 + androidBottomPad,
          paddingBottom: Platform.OS === 'ios' ? (hasHomeBar ? insets.bottom - 14 : 8) : androidBottomPad,
          paddingTop: Platform.OS === 'ios' ? 6 : 8,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 0.2,
        },
      }}
    >
      {/* 1. Orders Tab (Home) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size || 24} color={color} />
          ),
        }}
      />

      {/* 2. My Orders Tab (Queue / Inventory) */}
      <Tabs.Screen
        name="my-orders"
        options={{
          title: 'My Orders',
          tabBarIcon: ({ color, size }) => (
            <InventoryTabIcon color={color} size={size || 24} />
          ),
        }}
      />

      {/* 3. New Order Tab */}
      <Tabs.Screen
        name="new-order"
        options={{
          title: 'New Order',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="add-circle-outline" size={size || 24} color={color} />
          ),
        }}
      />

      {/* 4. Chat Tab */}
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="chat-bubble-outline" size={size || 22} color={color} />
          ),
        }}
      />

      {/* 5. Map Tab */}
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="map" size={size || 24} color={color} />
          ),
        }}
      />

      {/* Hidden Utility Routes */}
      <Tabs.Screen
        name="earnings"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -7,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#FFE399',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#0F131C',
  },
  badgeText: {
    color: '#0F131C',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
});
