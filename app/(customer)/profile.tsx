import React, { useState, useEffect } from 'react';
import { ScrollView, TextInput, Platform, StyleSheet, Pressable, Alert, Linking } from 'react-native';
import {
  YStack,
  XStack,
  SizableText,
  Avatar,
  AppHeader,
  SafeArea,
  User,
  Truck,
  Edit3,
  Check,
  X,
  RefreshCw,
  Phone,
  Mail,
  Package,
  CheckCircle,
  Clock,
  LogIn,
  LogOut,
  Trash2,
} from '@blinkdotnew/mobile-ui';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { saveRole } from '@/hooks/useRole';
import { useAuth } from '@/hooks/useAuth';
import { blink } from '@/lib/blink';
import { colors, spacing, borderRadius } from '@/constants/design';
import { APP_CONFIG } from '@/lib/config';

const NAME_KEY = 'customer_display_name';
const SESSION_KEY = 'customer_session_id';
const SUPPORT_EMAIL = APP_CONFIG.STORE_EMAIL;

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function CustomerProfileScreen() {
  const { user, isAuthenticated } = useAuth();
  const [displayName, setDisplayName] = useState('Customer');
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [orderStats, setOrderStats] = useState({ pending: 0, delivered: 0 });

  useEffect(() => {
    // If authenticated, prefer auth display name
    if (isAuthenticated && user?.displayName) {
      setDisplayName(user.displayName);
      setEditValue(user.displayName);
      AsyncStorage.setItem(NAME_KEY, user.displayName).catch(() => {});
    } else {
      AsyncStorage.getItem(NAME_KEY).then((n) => {
        if (n) { setDisplayName(n); setEditValue(n); }
        else { setEditValue('Customer'); }
      });
    }

    // Load order stats for this customer session
    AsyncStorage.getItem(SESSION_KEY).then(async (sid) => {
      if (!sid) return;
      try {
        const orders = await blink.db.orders.list({
          where: { customer_session_id: sid },
        }) as any[];
        const pending = orders.filter((o) => o.status === 'pending').length;
        const delivered = orders.filter((o) => o.status === 'delivered').length;
        setOrderStats({ pending, delivered });
      } catch {}
    });
  }, [isAuthenticated, user?.displayName]);

  const confirmEdit = async () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    await AsyncStorage.setItem(NAME_KEY, trimmed);
    setDisplayName(trimmed);
    setEditing(false);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  const switchToDriver = async () => {
    const doSwitch = async () => {
      await saveRole('driver');
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      // Tab layout will check auth and redirect to sign-in if needed
      router.replace('/(tabs)');
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Switch to Driver mode? You'll need to sign in.")) doSwitch();
    } else {
      Alert.alert('Switch to Driver Mode?', 'You\'ll need to sign in with your driver account.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', onPress: doSwitch },
      ]);
    }
  };

  const chooseRole = async () => {
    await AsyncStorage.removeItem('app_role');
    router.replace('/role-select');
  };

  const emailSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  const handleSignOut = async () => {
    try {
      await blink.auth.signOut();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } catch (err) {
      console.warn('[customer-profile] sign out failed:', err);
    }
  };

  return (
    <SafeArea>
      <AppHeader title="My Profile" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack padding="$4" gap="$6">

          {/* Avatar + name */}
          <YStack alignItems="center" gap="$3">
            <Avatar size="$8" borderRadius="$full" backgroundColor="$color4">
              <SizableText size="$7" fontWeight="800" color="$color12">
                {initials(displayName)}
              </SizableText>
            </Avatar>

            {editing ? (
              <YStack gap="$2" width="100%" alignItems="center">
                <TextInput
                  value={editValue}
                  onChangeText={setEditValue}
                  placeholder="Your name"
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={confirmEdit}
                  style={[
                    styles.nameInput,
                    Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
                  ]}
                />
                <XStack gap="$2">
                  <Pressable onPress={() => setEditing(false)} style={styles.editBtn}>
                    <X size={16} color="$color10" />
                    <SizableText size="$3" color="$color10"> Cancel</SizableText>
                  </Pressable>
                  <Pressable onPress={confirmEdit} style={[styles.editBtn, styles.editBtnPrimary]}>
                    <Check size={16} color="white" />
                    <SizableText size="$3" color="white" fontWeight="700"> Save</SizableText>
                  </Pressable>
                </XStack>
              </YStack>
            ) : (
              <YStack alignItems="center" gap="$1">
                <XStack gap="$2" alignItems="center">
                  <SizableText size="$6" fontWeight="700" color="$color12">{displayName}</SizableText>
                  <Pressable onPress={() => { setEditValue(displayName); setEditing(true); }} hitSlop={8}>
                    <Edit3 size={16} color="$color9" />
                  </Pressable>
                </XStack>
                <SizableText size="$2" color="$color9">Customer</SizableText>
              </YStack>
            )}
          </YStack>

          {/* Order stats */}
          <XStack gap="$3">
            <YStack
              flex={1} padding="$4" borderRadius="$4"
              backgroundColor="$amber2" borderWidth={1} borderColor="$amber4"
              alignItems="center" gap="$1"
            >
              <Clock size={18} color="$amber9" />
              <SizableText size="$6" fontWeight="800" color="$amber9">{orderStats.pending}</SizableText>
              <SizableText size="$2" fontWeight="600" color="$amber10">PENDING</SizableText>
            </YStack>
            <YStack
              flex={1} padding="$4" borderRadius="$4"
              backgroundColor="$green2" borderWidth={1} borderColor="$green4"
              alignItems="center" gap="$1"
            >
              <CheckCircle size={18} color="$green9" />
              <SizableText size="$6" fontWeight="800" color="$green9">{orderStats.delivered}</SizableText>
              <SizableText size="$2" fontWeight="600" color="$green10">DELIVERED</SizableText>
            </YStack>
          </XStack>

          {/* Account — sign in/out */}
          <YStack gap="$3">
            <SizableText size="$2" fontWeight="700" color="$color10" paddingLeft="$1">ACCOUNT</SizableText>
            {isAuthenticated ? (
              <>
                <YStack
                  backgroundColor="$green2" borderRadius="$4" padding="$4"
                  borderWidth={1} borderColor="$green5" gap="$1"
                >
                  <SizableText size="$3" fontWeight="700" color="$green10">Signed in</SizableText>
                  <SizableText size="$2" color="$green9">{user?.email}</SizableText>
                </YStack>
                <Pressable onPress={handleSignOut} style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}>
                  <XStack alignItems="center" gap="$3">
                    <YStack width={44} height={44} borderRadius={22} backgroundColor="$red3" alignItems="center" justifyContent="center">
                      <LogOut size={22} color="$red9" />
                    </YStack>
                    <YStack flex={1}>
                      <SizableText size="$4" fontWeight="700" color="$red10">Sign Out</SizableText>
                      <SizableText size="$2" color="$color10">You can still browse without an account</SizableText>
                    </YStack>
                  </XStack>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={() => router.push('/customer-auth')} style={({ pressed }) => [styles.signInCard, pressed && styles.actionCardPressed]}>
                <XStack alignItems="center" gap="$3">
                  <YStack width={44} height={44} borderRadius={22} backgroundColor="rgba(245,196,0,0.15)" alignItems="center" justifyContent="center" borderWidth={1} borderColor="rgba(245,196,0,0.35)">
                    <LogIn size={22} color="$yellow9" />
                  </YStack>
                  <YStack flex={1}>
                    <SizableText size="$4" fontWeight="700" color="$color12">Sign In / Create Account</SizableText>
                    <SizableText size="$2" color="$color10">Save your order history across devices</SizableText>
                  </YStack>
                </XStack>
              </Pressable>
            )}
          </YStack>

          {/* Support */}
          <YStack gap="$3">
            <SizableText size="$2" fontWeight="700" color="$color10" paddingLeft="$1">SUPPORT</SizableText>
            <Pressable onPress={emailSupport} style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}>
              <XStack alignItems="center" gap="$3">
                <YStack width={44} height={44} borderRadius={22} backgroundColor="$color4" alignItems="center" justifyContent="center">
                  <Mail size={22} color="$color10" />
                </YStack>
                <YStack flex={1}>
                  <SizableText size="$4" fontWeight="700" color="$color12">Email {APP_CONFIG.STORE_NAME}</SizableText>
                  <SizableText size="$2" color="$color10">{SUPPORT_EMAIL}</SizableText>
                </YStack>
              </XStack>
            </Pressable>
          </YStack>

          {/* Switch / role */}
          <YStack gap="$3">
            <SizableText size="$2" fontWeight="700" color="$color10" paddingLeft="$1">SWITCH MODE</SizableText>

            <Pressable onPress={switchToDriver} style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}>
              <XStack alignItems="center" gap="$3">
                <YStack width={44} height={44} borderRadius={22} backgroundColor="$color4" alignItems="center" justifyContent="center">
                  <Truck size={22} color="$color10" />
                </YStack>
                <YStack flex={1}>
                  <SizableText size="$4" fontWeight="700" color="$color12">Sign In as Driver</SizableText>
                  <SizableText size="$2" color="$color10">View and manage pickup orders</SizableText>
                </YStack>
                <LogIn size={16} color="$color9" />
              </XStack>
            </Pressable>

            <Pressable onPress={chooseRole} style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}>
              <XStack alignItems="center" gap="$3">
                <YStack width={44} height={44} borderRadius={22} backgroundColor="$color4" alignItems="center" justifyContent="center">
                  <RefreshCw size={22} color="$color10" />
                </YStack>
                <YStack flex={1}>
                  <SizableText size="$4" fontWeight="700" color="$color12">Choose Role Again</SizableText>
                  <SizableText size="$2" color="$color10">Go back to the role selection screen</SizableText>
                </YStack>
              </XStack>
            </Pressable>
          </YStack>

          {/* Delete Account */}
          <YStack gap="$3">
            <SizableText size="$2" fontWeight="700" color="$color10" paddingLeft="$1">DANGER ZONE</SizableText>
            <Pressable onPress={() => router.push('/delete-account')} style={({ pressed }) => [styles.deleteCard, pressed && styles.actionCardPressed]}>
              <XStack alignItems="center" gap="$3">
                <YStack width={44} height={44} borderRadius={22} backgroundColor="rgba(220,38,38,0.1)" alignItems="center" justifyContent="center">
                  <Trash2 size={22} color="$red9" />
                </YStack>
                <YStack flex={1}>
                  <SizableText size="$4" fontWeight="700" color="$red10">Delete Account</SizableText>
                  <SizableText size="$2" color="$color10">Permanently remove your account and data</SizableText>
                </YStack>
              </XStack>
            </Pressable>
          </YStack>

        </YStack>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  nameInput: {
    width: '80%', height: 48,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    fontSize: 16, fontWeight: '600',
    color: colors.text, borderWidth: 1,
    borderColor: colors.border, textAlign: 'center',
  },
  editBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1, borderColor: colors.border,
  },
  editBtnPrimary: {
    backgroundColor: APP_CONFIG.PRIMARY_COLOR,
    borderColor: APP_CONFIG.PRIMARY_COLOR,
  },
  actionCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionCardPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  signInCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteCard: {
    backgroundColor: 'rgba(220,38,38,0.04)',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
  },
});
