import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACTIVE = '#FFE399';
const INACTIVE = '#C2C6D8';
const TAB_BG = '#0F131C';
const TAB_BORDER = 'rgba(255, 255, 255, 0.05)';

export default function CustomerTabLayout() {
  const insets = useSafeAreaInsets();
  const androidBottomPad = Platform.OS === 'web' ? 10 : Math.max(insets.bottom, 12);
  const hasHomeBar = insets.bottom > 0;

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
            <MaterialIcons name="chat-bubble-outline" size={size || 22} color={color} />
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

