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
  Shield,
  Wifi,
  WifiOff,
} from '@blinkdotnew/mobile-ui';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSavedDisplayName, saveDisplayName } from '@/lib/chat';
import { useAuth } from '@/hooks/useAuth';
import { useDriverAccreditation } from '@/lib/accreditation';
import { useMyVerification } from '@/lib/verification';
import { useMyBackgroundCheck } from '@/lib/backgroundCheck';
import { blink } from '@/lib/blink';
import { APP_CONFIG } from '@/lib/config';
import { useConnectStatus, useConnectOnboard, openStripeOnboardingSession } from '@/lib/stripeConnect';
import { useDriverId } from '@/hooks/useDriverId';
import { useDriverStore } from '@/store/useDriverStore';
import { CustomHeader, useToast } from '@/components/core';

import {
  ProfileHeroCard,
  ProfileSection,
  ProfileActionRow,
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
  const { user, isAuthenticated, isLoading: authLoading, logout, updateProfile, forgotPassword } = useAuth();
  const driverId = useDriverId();
  const { data: accreditation } = useDriverAccreditation();
  const { data: verification } = useMyVerification(user?.id);
  const { data: bgCheck } = useMyBackgroundCheck(user?.id);
  const { data: connectStatus, isLoading: isConnectStatusLoading, refetch: refetchConnect } = useConnectStatus(driverId);
  const connectOnboard = useConnectOnboard();
  const [connectLoading, setConnectLoading] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [pushEnabled, setPushEnabled] = useState(true);

  const isOnline = useDriverStore((s) => s.isOnline);
  const toggleOnline = useDriverStore((s) => s.toggleOnline);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user)) {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(landing)/role-select');
    }
  }, [authLoading, isAuthenticated, user]);

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
    const trimmed = newName.trim();
    if (!trimmed) return;
    await saveDisplayName(trimmed);
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
      showToast('No email associated with this driver account.', 'error');
      return;
    }
    try {
      haptic('medium');
      const res: any = await forgotPassword(user.email, user.role || 'driver');
      if (res?.data?.token) {
        showToast('[DEV] Reset token ready!', 'info');
        router.push({
          pathname: '/(auth)/reset-password',
          params: {
            userId: res.data.userId,
            token: res.data.token,
            role: user.role || 'driver',
          },
        } as any);
      } else {
        showToast(`Password reset link sent to ${user.email}`, 'success');
      }
    } catch (err: any) {
      console.warn('[driver profile] reset password failed:', err);
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


  const accredProfile = accreditation?.profile;
  const accredSteps = accreditation?.steps;

  const isProfileSubmitted =
    Boolean(accredProfile?.isSubmitted) ||
    accredProfile?.accreditationStatus === 'under_review' ||
    accredProfile?.accreditationStatus === 'approved';

  const hasLicenseData = Boolean(accredProfile?.licenseNumber || accredProfile?.documents?.licenseFront);
  const hasInsuranceData = Boolean(accredProfile?.insurancePolicyNumber || accredProfile?.documents?.insuranceCard);
  const hasConsentData = Boolean(accredProfile?.backgroundConsentAt);

  const licenseStatus: DocStatus =
    accredSteps?.license === 'approved' || verification?.status === 'approved'
      ? 'approved'
      : accredSteps?.license === 'rejected'
        ? 'rejected'
        : hasLicenseData || isProfileSubmitted
          ? 'pending'
          : undefined;

  const insuranceStatus: DocStatus =
    accredSteps?.insurance === 'approved' || verification?.status === 'approved'
      ? 'approved'
      : accredSteps?.insurance === 'rejected'
        ? 'rejected'
        : hasInsuranceData || isProfileSubmitted
          ? 'pending'
          : undefined;

  const bgStatus: DocStatus =
    accredSteps?.backgroundCheck === 'approved' || bgCheck?.status === 'approved'
      ? 'approved'
      : accredSteps?.backgroundCheck === 'rejected' || bgCheck?.status === 'rejected'
        ? 'rejected'
        : hasConsentData || isProfileSubmitted
          ? 'in_review'
          : undefined;

  const isAccredApproved =
    accreditation?.eligibility?.eligible ||
    accredProfile?.accreditationStatus === 'approved' ||
    verification?.status === 'approved';

  const isAccredUnderReview =
    !isAccredApproved &&
    (accredProfile?.accreditationStatus === 'under_review' ||
      (isProfileSubmitted && (licenseStatus === 'pending' || insuranceStatus === 'pending' || bgStatus === 'in_review')));

  const isStatusLoading = isConnectStatusLoading && !connectStatus;
  const hasStripeAccount = Boolean(connectStatus?.stripeAccountId || connectStatus?.connected);
  const isStripeConnected = Boolean(connectStatus?.connected && connectStatus?.payoutsEnabled);
  const isStripePending = hasStripeAccount && !isStripeConnected;

  const handleConnectStripe = async () => {
    if (!driverId) return;
    haptic('medium');
    setConnectLoading(true);
    try {
      const res = await connectOnboard.mutateAsync({
        driverUserId: driverId,
        driverEmail: user?.email,
      });
      if (res?.url) {
        await openStripeOnboardingSession(res.url);
      }
      await refetchConnect();
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
        subtitle="Manage profile, status & verification"
        showBack={false}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
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
            {
              label: 'STATUS',
              value: isOnline ? 'Online' : 'Offline',
              color: isOnline ? GREEN : '#8C90A1',
            },
            {
              label: 'PAYOUTS',
              value: isStatusLoading ? '...' : isStripeConnected ? 'Active' : isStripePending ? 'Pending' : 'Setup',
              color: isStatusLoading ? '#94A3B8' : isStripeConnected ? GREEN : isStripePending ? GOLD_ACCENT : '#94A3B8',
            },
          ]}
        />

        <ProfileSection title="DRIVER AVAILABILITY">
          <ProfileActionRow
            icon={
              isOnline ? (
                <Wifi size={18} color={GREEN} />
              ) : (
                <WifiOff size={18} color="#8C90A1" />
              )
            }
            iconBg={isOnline ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.06)'}
            title={isOnline ? 'Online & Available' : 'Offline'}
            subtitle={
              isOnline
                ? 'You are active and receiving new pickup requests'
                : 'You are paused and will not receive order requests'
            }
            showChevron={false}
            rightControl={
              <Switch
                value={isOnline}
                onValueChange={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                  }
                  toggleOnline();
                }}
                trackColor={{ false: '#262A38', true: 'rgba(0, 226, 151, 0.35)' }}
                thumbColor={isOnline ? '#00E297' : '#8C90A1'}
              />
            }
          />
        </ProfileSection>

        <ProfileSection
          title="DRIVER ACCREDITATION"
          badgeNode={
            <View
              style={[
                styles.overallBadge,
                isAccredApproved ? styles.overallBadgeSuccess : styles.overallBadgeWarning,
              ]}
            >
              <Text
                style={[
                  styles.overallBadgeText,
                  isAccredApproved ? { color: GREEN } : { color: GOLD_ACCENT },
                ]}
              >
                {isAccredApproved ? 'FULLY CLEARED' : isAccredUnderReview ? 'UNDER REVIEW' : 'IN PROGRESS'}
              </Text>
            </View>
          }
        >
          <DocStatusItem
            title="Driver's License"
            subtitle={
              licenseStatus === 'approved'
                ? 'Valid license on file'
                : licenseStatus === 'rejected'
                  ? 'Resubmission required'
                  : licenseStatus === 'pending' || licenseStatus === 'in_review'
                    ? 'Under review'
                    : 'Upload driver license'
            }
            status={licenseStatus}
          />

          <ItemDivider />

          <DocStatusItem
            title="Vehicle Insurance"
            subtitle={
              insuranceStatus === 'approved'
                ? 'Current policy verified'
                : insuranceStatus === 'rejected'
                  ? 'Resubmission required'
                  : insuranceStatus === 'pending' || insuranceStatus === 'in_review'
                    ? 'Under review'
                    : 'Upload insurance policy'
            }
            status={insuranceStatus}
          />

          <ItemDivider />

          <DocStatusItem
            title="Background Check"
            subtitle={
              bgStatus === 'approved'
                ? 'MVR & criminal check cleared'
                : bgStatus === 'rejected'
                  ? 'Check failed — tap details'
                  : bgStatus === 'in_review' || bgStatus === 'pending'
                    ? 'Screening in progress'
                    : 'FCRA authorization needed'
            }
            status={bgStatus}
          />
        </ProfileSection>

        <ProfileSection title="FINANCIALS & PAYOUTS">
          <ProfileActionRow
            icon={<CreditCard size={18} color={isStripeConnected ? GREEN : BLUE} />}
            iconBg={isStripeConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(0, 102, 255, 0.15)'}
            title={
              isStatusLoading
                ? 'Checking Bank Status...'
                : isStripeConnected
                  ? 'Bank Account Connected'
                  : isStripePending
                    ? 'Finish Bank Setup'
                    : 'Connect Bank via Stripe'
            }
            subtitle={
              isStatusLoading
                ? 'Fetching account details'
                : isStripeConnected
                  ? 'Direct deposit enabled for daily payouts'
                  : isStripePending
                    ? 'Information required to enable payouts'
                    : 'Link checking account for automatic transfers'
            }
            onPress={handleConnectStripe}
            disabled={connectLoading || isStatusLoading}
            showChevron={!isStatusLoading}
            rightControl={
              (connectLoading || isStatusLoading) ? (
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


        {user?.role === 'admin' && (
          <ProfileSection title="ADMINISTRATION">
            <ProfileActionRow
              icon={<Shield size={18} color={GOLD} />}
              iconBg="rgba(255, 227, 153, 0.15)"
              title="Admin Review Panel"
              subtitle="Driver license, insurance & background check approvals"
              onPress={() => router.push('/(tabs)/admin')}
            />
          </ProfileSection>
        )}

        <ProfileSupportSection supportEmail={APP_CONFIG.STORE_EMAIL} />

        <ProfileAccountSection
          isAuthenticated={isAuthenticated}
          onSignOut={handleSignOut}
          onResetPassword={handleResetPassword}
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
