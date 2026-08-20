import React, { useState, useEffect, useRef } from 'react';
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
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { saveRole } from '@/hooks/useRole';
import { useAuth } from '@/hooks/useAuth';
import { blink } from '@/lib/blink';
import { APP_CONFIG } from '@/lib/config';
import { CustomHeader, useToast } from '@/components/core';

import {
  ProfileHeroCard,
  ProfileSection,
  ProfileActionRow,
  ProfileSwitchRoleSection,
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
  const { user, isAuthenticated } = useAuth();
  const [displayName, setDisplayName] = useState('Customer');
  const [orderStats, setOrderStats] = useState({ pending: 0, delivered: 0 });

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('customer_photo_url').then((url) => {
      if (url) setPhotoUrl(url);
    });
  }, []);

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
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    await uploadPhoto(result.assets[0].uri);
  };

  const uploadPhoto = async (uri: string) => {
    setIsUploading(true);
    try {
      const userId = user?.id || 'anon';
      const path = `customer-photos/${userId}-${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { publicUrl } = await blink.storage.upload(blob as File, path);
      await AsyncStorage.setItem('customer_photo_url', publicUrl);
      setPhotoUrl(publicUrl);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      }
    } catch (err) {
      console.warn('[customer profile] photo upload failed:', err);
      if (Platform.OS === 'web') {
        window.alert('Photo upload failed. Please try again.');
      } else {
        Alert.alert('Upload Failed', 'Could not upload photo. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleWebFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uri = URL.createObjectURL(file);
    await uploadPhoto(uri);
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

    AsyncStorage.getItem(SESSION_KEY).then(async (sid) => {
      if (!sid) return;
      try {
        const orders = (await blink.db.orders.list({
          where: { customer_session_id: sid },
        })) as any[];
        const pending = orders.filter((o) => o.status !== 'delivered').length;
        const delivered = orders.filter((o) => o.status === 'delivered').length;
        setOrderStats({ pending, delivered });
      } catch { }
    });
  }, [isAuthenticated, user?.displayName]);

  const handleSaveDisplayName = async (newName: string) => {
    await AsyncStorage.setItem(NAME_KEY, newName);
    setDisplayName(newName);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    }
  };

  const handleChooseRole = async () => {
    haptic('medium');
    showToast('Returning to role selection...', { type: 'info' });
    await AsyncStorage.removeItem('app_role');
    router.replace('/(landing)/role-select');
  };

  const handleSignOut = async () => {
    try {
      haptic('heavy');
      await blink.auth.signOut();
      router.replace('/sign-in');
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
          photoUrl={photoUrl}
          isUploading={isUploading}
          onPickPhoto={handlePickPhoto}
          onSaveDisplayName={handleSaveDisplayName}
          initialsFallback="CU"
          metrics={[
            { label: 'ACTIVE', value: orderStats.pending, color: BLUE },
            { label: 'COMPLETED', value: orderStats.delivered, color: GREEN },
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

        <ProfileSwitchRoleSection
          currentRole="customer"
          onChooseRoleAgain={handleChooseRole}
        />

        <ProfileSupportSection supportEmail={SUPPORT_EMAIL} isCustomer />

        <ProfileAccountSection isAuthenticated={isAuthenticated} onSignOut={handleSignOut} />

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