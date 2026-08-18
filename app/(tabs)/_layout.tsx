import { Tabs } from 'expo-router';
import { Home, PlusCircle, User, Map, MessageCircle, DollarSign, Truck } from '@blinkdotnew/mobile-ui';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_CONFIG } from '@/lib/config';
import { useOrders } from '@/lib/orders';
import { useDriverId } from '@/hooks/useDriverId';

const ACTIVE = APP_CONFIG.PRIMARY_COLOR;
const INACTIVE = 'rgba(255,255,255,0.4)';
const TAB_BG = '#0A0A0F';
const TAB_BORDER = `${APP_CONFIG.PRIMARY_COLOR}40`;

function ActiveTabIcon({ color, size }: { color: string; size: number }) {
  const { data: orders = [] } = useOrders();
  const driverId = useDriverId();
  const count = orders.filter(
    (o) => o.driverUserId === driverId && (o.status === 'accepted' || o.status === 'picked_up')
  ).length;

  return (
    <View>
      <Truck color={color} size={size} />
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: '#F97316' }]}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 10 : Math.max(insets.bottom, 12);

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
          height: 64 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 8,
          shadowColor: APP_CONFIG.PRIMARY_COLOR,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          title: 'My Orders',
          tabBarIcon: ({ color, size }) => <ActiveTabIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="new-order"
        options={{
          title: 'New Order',
          tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, size }) => <DollarSign color={color} size={size} />,
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
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F5C400',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
  },
});
