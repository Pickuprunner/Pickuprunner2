import { Tabs } from 'expo-router';
import { ShoppingBag, ClipboardList, User } from '@blinkdotnew/mobile-ui';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/design';

const ACTIVE = colors.secondaryContainer; // Gold #F4C300
const INACTIVE = '#8C90A1';
const TAB_BG = '#0F131C';
const TAB_BORDER = 'rgba(255, 255, 255, 0.08)';

export default function CustomerTabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 10 : Math.max(insets.bottom, 12);

  return (
    <Tabs
      initialRouteName="my-orders"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: TAB_BG,
          borderTopColor: TAB_BORDER,
          borderTopWidth: 1,
          height: 60 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 8,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
      }}
    >
     
      <Tabs.Screen
        name="my-orders"
        options={{
          title: 'My Orders',
          tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />

      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Request',
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} />,
        }}
      />

      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
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
