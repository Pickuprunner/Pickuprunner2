import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScrollView,
  Platform,
  StyleSheet,
  Alert,
  View,
  Text,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag } from '@blinkdotnew/mobile-ui';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useOrdersRealtime } from '@/lib/realtime';
import { ordersApi } from '@/apis/orders';
import { blink } from '@/lib/blink';
import { APP_CONFIG } from '@/lib/config';
import { CustomHeader, useToast } from '@/components/core';

import {
  ProfileHeroCard,
  ProfileSection,
  ProfileActionRow,
  ProfileSupportSection,
  ProfileAccountSection,
} from '@/components/profile';

const NAME_KEY = 'customer_display_name';
const SESSION_KEY = 'customer_session_id';
const SUPPORT_EMAIL = APP_CONFIG.STORE_EMAIL;

const BG = '#0F131C';
const BLUE = '#0066FF';
const GOLD = '#FFE399';
const GREEN = '#22C55E';

function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (Platform.OS !== 'web') {
    const feedback =
      style === 'heavy'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : style === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;
    Haptics.impactAsync(feedback).catch(() => { });
  }
}

export default function CustomerProfileScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const {
    user,
    isAuthenticated,
    isLoading,
    logout,
    updateProfile,
    uploadPhoto: authUploadPhoto,
    deletePhoto: authDeletePhoto,
    fetchProfile,
    forgotPassword,
  } = useAuth();
  const [displayName, setDisplayName] = useState('Customer');
  const storeOrders = useOrderStore((state) => state.orders);
  const [orderStats, setOrderStats] = useState({ active: 0, completed: 0 });

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(landing)/role-select');
    }
  }, [isLoading, isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated, fetchProfile]);

  useEffect(() => {
    if (user?.photoUrl) {
      setPhotoUrl(user.photoUrl);
    }
  }, [user?.photoUrl]);

  const calculateAndSetStats = useCallback((ordersList: any[]) => {
    const active = ordersList.filter(
      (o) => o?.status && o.status !== 'delivered' && o.status !== 'cancelled'
    ).length;
    const completed = ordersList.filter((o) => o?.status === 'delivered').length;
    setOrderStats({ active, completed });
  }, []);

  const fetchOrderStats = useCallback(async () => {
    let localOrders: any[] = [];
    try {
      const raw = await AsyncStorage.getItem('customer_local_orders');
      if (raw) localOrders = JSON.parse(raw);
    } catch { }

    const sid = await AsyncStorage.getItem(SESSION_KEY);
    const authUser = await blink.auth.me().catch(() => null);
    const userEmail = authUser?.email || useAuthStore.getState().user?.email || user?.email;
    const token = useAuthStore.getState().token;

    try {
      const [backendMine, sessionOrders1, sessionOrders2, emailOrders] = await Promise.all([
        token ? ordersApi.getMine().catch(() => []) : Promise.resolve([]),
        sid
          ? blink.db.orders
              .list({
                where: { customer_session_id: sid },
                orderBy: { created_at: 'desc' },
                limit: 50,
              })
              .catch(() => [])
          : Promise.resolve([]),
        sid
          ? blink.db.orders
              .list({
                where: { customerSessionId: sid },
                orderBy: { createdAt: 'desc' },
                limit: 50,
              })
              .catch(() => [])
          : Promise.resolve([]),
        userEmail
          ? blink.db.orders
              .list({
                where: { customer_email: userEmail },
                orderBy: { created_at: 'desc' },
                limit: 50,
              })
              .catch(() => [])
          : Promise.resolve([]),
      ]);

      const map = new Map<string, any>();
      (localOrders || []).forEach((o) => o?.id && map.set(o.id, o));
      (sessionOrders1 || []).forEach((o: any) => o?.id && map.set(o.id, o));
      (sessionOrders2 || []).forEach((o: any) => o?.id && map.set(o.id, o));
      (emailOrders || []).forEach((o: any) => o?.id && map.set(o.id, o));
      if (Array.isArray(backendMine)) {
        backendMine.forEach((o: any) => o?.id && map.set(o.id, o));
      }
      (storeOrders || []).forEach((o: any) => o?.id && map.set(o.id, o));

      calculateAndSetStats(Array.from(map.values()));
    } catch {
      const map = new Map<string, any>();
      (localOrders || []).forEach((o) => o?.id && map.set(o.id, o));
      (storeOrders || []).forEach((o: any) => o?.id && map.set(o.id, o));
      calculateAndSetStats(Array.from(map.values()));
    }
  }, [user?.email, storeOrders, calculateAndSetStats]);

  useFocusEffect(
    useCallback(() => {
      fetchOrderStats();
    }, [fetchOrderStats])
  );

  useOrdersRealtime(
    useCallback(() => {
      fetchOrderStats();
    }, [fetchOrderStats])
  );

  useEffect(() => {
    fetchOrderStats();
  }, [fetchOrderStats]);

  const handlePickPhoto = async () => {
    haptic('light');
    if (Platform.OS === 'web') {
      if (webFileInputRef.current) webFileInputRef.current.click();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    await processUpload({
      uri: asset.uri,
      name: asset.fileName || `customer_${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    });
  };

  const processUpload = async (fileInput: any) => {
    setIsUploading(true);
    try {
      const res = await authUploadPhoto(fileInput);
      if (res?.photoUrl) {
        setPhotoUrl(res.photoUrl);
      }
      showToast('Profile photo updated', 'success');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      }
    } catch (err: any) {
      console.warn('[customer profile] photo upload failed:', err);
      showToast(err?.message || 'Could not upload photo. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploading(true);
    try {
      await authDeletePhoto();
      setPhotoUrl(null);
      showToast('Profile photo removed', 'info');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      }
    } catch (err: any) {
      console.warn('[customer profile] photo delete failed:', err);
      showToast(err?.message || 'Could not remove photo. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleWebFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUpload(file);
    if (webFileInputRef.current) webFileInputRef.current.value = '';
  };

  useEffect(() => {
    if (isAuthenticated && user?.displayName) {
      setDisplayName(user.displayName);
      AsyncStorage.setItem(NAME_KEY, user.displayName).catch(() => { });
    } else {
      AsyncStorage.getItem(NAME_KEY).then((n) => {
        if (n) {
          setDisplayName(n);
        } else {
          setDisplayName('Customer');
        }
      });
    }
  }, [isAuthenticated, user?.displayName]);

  const handleSaveDisplayName = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await AsyncStorage.setItem(NAME_KEY, trimmed);
    setDisplayName(trimmed);
    if (isAuthenticated) {
      try {
        await updateProfile({ displayName: trimmed });
        showToast('Name updated successfully', 'success');
      } catch (e) {
        console.warn('Profile sync failed:', e);
        showToast('Name updated locally', 'info');
      }
    } else {
      showToast('Name updated', 'success');
    }
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    }
  };


  const handleResetPassword = async () => {
    if (!user?.email) {
      showToast('No email associated with this account.', 'error');
      return;
    }
    try {
      haptic('medium');
      const res: any = await forgotPassword(user.email, user.role || 'customer');
      if (res?.data?.token) {
        showToast('[DEV] Reset token ready!', 'info');
        router.push({
          pathname: '/(auth)/reset-password',
          params: {
            userId: res.data.userId,
            token: res.data.token,
            role: user.role || 'customer',
          },
        } as any);
      } else {
        showToast(`Password reset link sent to ${user.email}`, 'success');
      }
    } catch (err: any) {
      console.warn('[customer profile] reset password failed:', err);
      showToast(err?.message || 'Could not send reset link. Please try again.', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      haptic('heavy');
      await logout();
      await AsyncStorage.removeItem('app_role');
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace('/(landing)/role-select');
    } catch (err) {
      console.warn('[auth] sign out failed:', err);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <CustomHeader
        title="Customer Profile"
        subtitle="Manage profile & delivery requests"
        subtitleHighlight={`${APP_CONFIG.APP_NAME} •`}
        showAvatar={false}
        borderBottom
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {Platform.OS === 'web' && (
          <input
            ref={webFileInputRef as any}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleWebFileChange as any}
          />
        )}

        <ProfileHeroCard
          displayName={displayName}
          emailText={user?.email || 'Guest Customer Session'}
          photoUrl={user?.photoUrl || photoUrl}
          isUploading={isUploading}
          onPickPhoto={handlePickPhoto}
          onRemovePhoto={handleRemovePhoto}
          onSaveDisplayName={handleSaveDisplayName}
          initialsFallback="CU"
          metrics={[
            {
              label: 'ACTIVE',
              value: orderStats.active,
              color: BLUE,
              onPress: () => router.push('/(customer)/my-orders'),
            },
            {
              label: 'COMPLETED',
              value: orderStats.completed,
              color: GREEN,
              onPress: () => router.push('/(customer)/my-orders'),
            },
            { label: 'SAVED PLACES', value: 'Home, Work', color: GOLD },
          ]}
        />

        <ProfileSection title="MY DELIVERIES">
          <ProfileActionRow
            icon={<ShoppingBag size={18} color={BLUE} />}
            iconBg="rgba(0, 102, 255, 0.15)"
            title="Order New Delivery"
            subtitle="Request item pickup from any local store"
            onPress={() => router.push('/(customer)')}
          />
        </ProfileSection>


        <ProfileSupportSection supportEmail={SUPPORT_EMAIL} isCustomer />

        <ProfileAccountSection
          isAuthenticated={isAuthenticated}
          onSignOut={handleSignOut}
          onResetPassword={handleResetPassword}
        />

        <Text style={styles.versionTag}>
          {APP_CONFIG.APP_NAME} v1.0.0 • Customer Portal
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 18,
  },
  versionTag: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
});