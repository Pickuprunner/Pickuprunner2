import { Tabs, router } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { chatApi } from '@/apis/chat';

const ACTIVE = '#FFE399';
const INACTIVE = '#C2C6D8';
const TAB_BG = '#0F131C';
const TAB_BORDER = 'rgba(255, 255, 255, 0.05)';

function ChatTabIcon({ color, size }: { color: string; size: number }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await chatApi.getChats();
        if (!isMounted) return;
        const count = res.totalUnread ?? res.chats?.reduce((sum, c) => sum + (c.unread || 0), 0) ?? 0;
        setUnreadCount(count);
      } catch {
        // quiet catch
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <View style={styles.iconWrapper}>
      <MaterialIcons name="chat-bubble-outline" size={size || 22} color={color} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: '#FFE399' }]}>
          <Text style={[styles.badgeText, { color: '#000' }]}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function CustomerTabLayout() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, token, isLoading } = useAuth();
  const androidBottomPad = Platform.OS === 'web' ? 10 : Math.max(insets.bottom, 12);
  const hasHomeBar = insets.bottom > 0;

  // Guard: if unauthenticated, token not found, or user deleted, redirect to role-select
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user || !token)) {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(landing)/role-select');
      return;
    }

    if (user?.role === 'driver') {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(tabs)');
    }
  }, [isLoading, isAuthenticated, user, token, user?.role]);

  return (
    <Tabs
      initialRouteName="my-orders"
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
      <Tabs.Screen
        name="my-orders"
        options={{
          title: 'My Orders',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="inventory-2" size={size || 24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: 'New Order',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="add-circle-outline" size={size || 24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <ChatTabIcon color={color} size={size || 22} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person-outline" size={size || 24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="track/[id]"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
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
    backgroundColor: '#0066FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#0F131C',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
});
