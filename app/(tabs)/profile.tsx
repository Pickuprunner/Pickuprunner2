import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  Platform,
  StyleSheet,
  Alert,
  View,
  Text,
  Switch,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  CreditCard,
  DollarSign,
} from '@blinkdotnew/mobile-ui';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSavedDisplayName, saveDisplayName } from '@/lib/chat';
import { useAuth } from '@/hooks/useAuth';
import { useMyVerification } from '@/lib/verification';
import { useMyBackgroundCheck } from '@/lib/backgroundCheck';
import { blink } from '@/lib/blink';
import { APP_CONFIG } from '@/lib/config';
import { useConnectStatus, useConnectOnboard } from '@/lib/stripeConnect';
import { useDriverId } from '@/hooks/useDriverId';
import { CustomHeader, useToast } from '@/components/core';

import {
  ProfileHeroCard,
  ProfileSection,
  ProfileActionRow,
  ProfileSwitchRoleSection,
  ProfileSupportSection,
  ProfileAccountSection,
  DocStatusItem,
  ItemDivider,
  DocStatus,
} from '@/components/profile';

const BG = '#0F131C';
const BLUE = '#0066FF';
const GOLD = '#FFE399';
const GOLD_ACCENT = '#E5A93C';
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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const driverId = useDriverId();
  const { data: verification } = useMyVerification(user?.id);
  const { data: bgCheck } = useMyBackgroundCheck(user?.id);
  const { data: connectStatus, refetch: refetchConnect } = useConnectStatus(driverId);
  const connectOnboard = useConnectOnboard();
  const [connectLoading, setConnectLoading] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [pushEnabled, setPushEnabled] = useState(true);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && user?.displayName) {
      setDisplayName(user.displayName);
      saveDisplayName(user.displayName);
    } else {
      getSavedDisplayName().then((name) => {
        const fallback = name || 'Pickup Driver';
        setDisplayName(fallback);
      });
    }
  }, [isAuthenticated, authLoading, user?.displayName]);

  useEffect(() => {
    AsyncStorage.getItem('driver_photo_url').then((url) => {
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
      const path = `driver-photos/${userId}-${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { publicUrl } = await blink.storage.upload(blob as File, path);
      await AsyncStorage.setItem('driver_photo_url', publicUrl);
      setPhotoUrl(publicUrl);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      }
    } catch (err) {
      console.warn('[profile] photo upload failed:', err);
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

  const handleSaveDisplayName = async (newName: string) => {
    await saveDisplayName(newName);
    setDisplayName(newName);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    }
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

  const handleChooseRole = async () => {
    haptic('medium');
    showToast('Returning to role selection...', { type: 'info' });
    await AsyncStorage.removeItem('app_role');
    router.replace('/(landing)/role-select');
  };

  const docStatus: DocStatus = verification?.status;
  const bgStatus: DocStatus = bgCheck?.status as DocStatus;
  const allApproved = docStatus === 'approved' && bgStatus === 'approved';
  const isStripeConnected = connectStatus?.connected && connectStatus?.payoutsEnabled;
  const isStripePending = connectStatus?.connected && !connectStatus?.payoutsEnabled;

  const handleConnectStripe = async () => {
    if (!driverId) return;
    haptic('medium');
    setConnectLoading(true);
    try {
      const { url } = await connectOnboard.mutateAsync({
        driverUserId: driverId,
        driverEmail: user?.email,
      });
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const { Linking } = require('react-native');
        await Linking.openURL(url);
      }
      setTimeout(() => refetchConnect(), 3000);
    } catch (e: any) {
      const msg = e?.message || 'Could not start bank onboarding';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    } finally {
      setConnectLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <CustomHeader
        title="Driver Profile"
        subtitle="Manage profile & driver status"
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
          emailText={user?.email || 'driver@pickuprunner.com'}
          photoUrl={photoUrl}
          isUploading={isUploading}
          onPickPhoto={handlePickPhoto}
          onSaveDisplayName={handleSaveDisplayName}
          initialsFallback="DR"
          metrics={[
            { label: 'STATUS', value: 'Ready', color: GREEN },
            { label: 'RATING', value: '4.9 ★', color: GOLD },
            { label: 'PAYOUTS', value: isStripeConnected ? 'Active' : 'Setup', color: isStripeConnected ? GREEN : '#94A3B8' },
          ]}
        />

        <ProfileSection
          title="DRIVER ACCREDITATION"
          badgeNode={
            <View
              style={[
                styles.overallBadge,
                allApproved ? styles.overallBadgeSuccess : styles.overallBadgeWarning,
              ]}
            >
              <Text
                style={[
                  styles.overallBadgeText,
                  allApproved ? { color: GREEN } : { color: GOLD_ACCENT },
                ]}
              >
                {allApproved ? '✓ FULLY CLEARED' : '● IN PROGRESS'}
              </Text>
            </View>
          }
        >
          <DocStatusItem
            title="Driver's License"
            subtitle={
              docStatus === 'approved'
                ? 'Valid license on file'
                : docStatus === 'rejected'
                  ? 'Resubmission required'
                  : docStatus === 'pending'
                    ? 'Under review'
                    : 'Upload driver license'
            }
            status={docStatus}
            onPress={() => router.push('/driver-verification')}
          />

          <ItemDivider />

          <DocStatusItem
            title="Vehicle Insurance"
            subtitle={
              docStatus === 'approved'
                ? 'Current policy verified'
                : docStatus === 'rejected'
                  ? 'Resubmission required'
                  : docStatus === 'pending'
                    ? 'Under review'
                    : 'Upload insurance policy'
            }
            status={docStatus}
            onPress={() => router.push('/driver-verification')}
          />

          <ItemDivider />

          <DocStatusItem
            title="Background Check"
            subtitle={
              bgStatus === 'approved'
                ? 'MVR & criminal check cleared'
                : bgStatus === 'rejected'
                  ? 'Check failed — tap details'
                  : bgStatus === 'in_review'
                    ? 'Screening in progress'
                    : 'FCRA authorization needed'
            }
            status={bgStatus}
            onPress={() => router.push('/background-check')}
          />
        </ProfileSection>

        <ProfileSection title="FINANCIALS & PAYOUTS">
          <ProfileActionRow
            icon={<CreditCard size={18} color={isStripeConnected ? GREEN : BLUE} />}
            iconBg={isStripeConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(0, 102, 255, 0.15)'}
            title={isStripeConnected ? 'Bank Account Connected' : isStripePending ? 'Finish Bank Setup' : 'Connect Bank via Stripe'}
            subtitle={
              isStripeConnected
                ? 'Direct deposit enabled for daily payouts'
                : 'Link checking account for automatic transfers'
            }
            onPress={isStripeConnected ? undefined : handleConnectStripe}
            disabled={connectLoading || !!isStripeConnected}
            showChevron={!isStripeConnected}
            rightControl={
              !isStripeConnected && connectLoading ? (
                <ActivityIndicator size="small" color={BLUE} />
              ) : undefined
            }
          />

          <ItemDivider />

          <ProfileActionRow
            icon={<DollarSign size={18} color={GOLD} />}
            iconBg="rgba(255, 227, 153, 0.15)"
            title="Earnings & Instant Payout"
            subtitle="View ledger, weekly stats, and cashout"
            onPress={() => router.push('/(tabs)/earnings')}
          />
        </ProfileSection>

        {/* ── 4. Preferences ── */}
        <ProfileSection title="PREFERENCES">
          <ProfileActionRow
            icon={<Bell size={18} color="#FFFFFF" />}
            iconBg="rgba(255, 255, 255, 0.06)"
            title="Push Notifications"
            subtitle="Get instant alerts for nearby orders"
            showChevron={false}
            rightControl={
              <Switch
                value={pushEnabled}
                onValueChange={(val) => {
                  haptic('light');
                  setPushEnabled(val);
                }}
                trackColor={{ false: '#262A38', true: BLUE }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </ProfileSection>

        <ProfileSwitchRoleSection
          currentRole="driver"
          onChooseRoleAgain={handleChooseRole}
        />

        <ProfileSupportSection supportEmail={APP_CONFIG.STORE_EMAIL} />

        <ProfileAccountSection
          isAuthenticated={isAuthenticated}
          onSignOut={handleSignOut}
          isDriver
        />

        <Text style={styles.versionTag}>
          Pickup Runner v1.0.0 • Driver Portal
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
  overallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  overallBadgeSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  overallBadgeWarning: {
    backgroundColor: 'rgba(229, 169, 60, 0.1)',
    borderColor: 'rgba(229, 169, 60, 0.3)',
  },
  overallBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  versionTag: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
});
