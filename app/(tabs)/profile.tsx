import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, TextInput, Platform, StyleSheet, Pressable, Alert, View } from 'react-native';
import {
  YStack,
  XStack,
  SizableText,
  Avatar,
  AppHeader,
  SafeArea,
  SettingsScreen,
  Spinner,
  type SettingsSection,
  User,
  HelpCircle,
  LogOut,
  LogIn,
  Bell,
  Shield,
  Edit3,
  Check,
  X,
  CheckCircle,
  MessageCircle,
  ShoppingBag,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Car,
  FileText,
  AlertTriangle,
  DollarSign,
  Trash2,
  Camera,
  CreditCard,
} from '@blinkdotnew/mobile-ui';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSavedDisplayName, saveDisplayName } from '@/lib/chat';
import { useAuth } from '@/hooks/useAuth';
import { useMyVerification, type DriverVerification } from '@/lib/verification';
import { useMyBackgroundCheck, type BackgroundCheck } from '@/lib/backgroundCheck';
import { saveRole } from '@/hooks/useRole';
import { blink } from '@/lib/blink';
import { colors, spacing, borderRadius } from '@/constants/design';
import { APP_CONFIG } from '@/lib/config';
import { useConnectStatus, useConnectOnboard } from '@/lib/stripeConnect';
import { useDriverId } from '@/hooks/useDriverId';

// ── Small helpers ──────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Accreditation section ──────────────────────────────────────────────────────

type DocStatus = 'approved' | 'rejected' | 'pending' | 'in_review' | undefined;

interface StatusCfg {
  label: string;
  pillBg: string; pillBorder: string; pillText: string;
  iconBg: string; cardBg: string; cardBorder: string;
  icon: React.ReactNode;
}

function getStatusCfg(s: DocStatus): StatusCfg {
  switch (s) {
    case 'approved':
      return {
        label: 'Approved',
        pillBg: 'rgba(22,163,74,0.15)', pillBorder: 'rgba(22,163,74,0.45)', pillText: '#16a34a',
        iconBg: 'rgba(22,163,74,0.12)', cardBg: 'rgba(22,163,74,0.04)', cardBorder: 'rgba(22,163,74,0.22)',
        icon: <CheckCircle size={18} color="$green9" />,
      };
    case 'rejected':
      return {
        label: 'Rejected',
        pillBg: 'rgba(220,38,38,0.15)', pillBorder: 'rgba(220,38,38,0.45)', pillText: '#dc2626',
        iconBg: 'rgba(220,38,38,0.12)', cardBg: 'rgba(220,38,38,0.04)', cardBorder: 'rgba(220,38,38,0.22)',
        icon: <ShieldAlert size={18} color="$red9" />,
      };
    case 'in_review':
      return {
        label: 'In Review',
        pillBg: 'rgba(59,130,246,0.15)', pillBorder: 'rgba(59,130,246,0.45)', pillText: '#2563eb',
        iconBg: 'rgba(59,130,246,0.12)', cardBg: 'rgba(59,130,246,0.04)', cardBorder: 'rgba(59,130,246,0.22)',
        icon: <Clock size={18} color="$blue9" />,
      };
    case 'pending':
      return {
        label: 'Under Review',
        pillBg: 'rgba(217,119,6,0.15)', pillBorder: 'rgba(217,119,6,0.45)', pillText: '#d97706',
        iconBg: 'rgba(217,119,6,0.12)', cardBg: 'rgba(217,119,6,0.04)', cardBorder: 'rgba(217,119,6,0.22)',
        icon: <Clock size={18} color="$amber9" />,
      };
    default:
      return {
        label: 'Not Submitted',
        pillBg: 'rgba(120,120,130,0.10)', pillBorder: 'rgba(120,120,130,0.22)', pillText: '#888',
        iconBg: 'rgba(120,120,130,0.07)', cardBg: 'rgba(120,120,130,0.03)', cardBorder: 'rgba(120,120,130,0.15)',
        icon: <AlertTriangle size={18} color="$color8" />,
      };
  }
}

function StatusPill({ status }: { status: DocStatus }) {
  const cfg = getStatusCfg(status);
  return (
    <YStack
      paddingHorizontal={7} paddingVertical={2}
      borderRadius={999} backgroundColor={cfg.pillBg}
      borderWidth={1} borderColor={cfg.pillBorder}
    >
      <SizableText size="$1" fontWeight="800" style={{ color: cfg.pillText, letterSpacing: 0.3 }}>
        {cfg.label.toUpperCase()}
      </SizableText>
    </YStack>
  );
}

function DocRow({
  label,
  subtitle,
  detail,
  status,
  onPress,
}: {
  label: string;
  subtitle: string;
  detail?: string;
  status: DocStatus;
  onPress: () => void;
}) {
  const cfg = getStatusCfg(status);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.docRow,
        { backgroundColor: cfg.cardBg },
        pressed && { opacity: 0.82, transform: [{ scale: 0.988 }] },
      ]}
    >
      <XStack space="$3" alignItems="center" padding="$4">
        {/* Status icon circle */}
        <YStack
          width={44} height={44} borderRadius={22}
          backgroundColor={cfg.iconBg}
          borderWidth={1.5} borderColor={cfg.pillBorder}
          alignItems="center" justifyContent="center" flexShrink={0}
        >
          {cfg.icon}
        </YStack>

        {/* Label + pill + subtitle */}
        <YStack flex={1}>
          <XStack alignItems="center" space="$2" flexWrap="wrap" marginBottom={2}>
            <SizableText size="$3" fontWeight="700" color="$color12">{label}</SizableText>
            <StatusPill status={status} />
          </XStack>
          <SizableText size="$2" color="$color9">{subtitle}</SizableText>
          {!!detail && (
            <SizableText size="$1" color="$color8" numberOfLines={1} marginTop={2}>{detail}</SizableText>
          )}
        </YStack>

        <ChevronRight size={16} color="$color8" flexShrink={0} />
      </XStack>
    </Pressable>
  );
}

function AccreditationSection({
  verification,
  bgCheck,
}: {
  verification: DriverVerification | null | undefined;
  bgCheck: BackgroundCheck | null | undefined;
}) {
  const docStatus: DocStatus = verification?.status;
  const bgStatus: DocStatus = bgCheck?.status as DocStatus;

  const allApproved = docStatus === 'approved' && bgStatus === 'approved';
  const anyRejected = docStatus === 'rejected' || bgStatus === 'rejected';
  const anyAction = !allApproved;

  const overallBg   = allApproved ? 'rgba(22,163,74,0.13)'  : anyRejected ? 'rgba(220,38,38,0.13)'  : 'rgba(217,119,6,0.13)';
  const overallBord = allApproved ? 'rgba(22,163,74,0.35)'  : anyRejected ? 'rgba(220,38,38,0.35)'  : 'rgba(217,119,6,0.35)';
  const overallText = allApproved ? '#16a34a' : anyRejected ? '#dc2626' : '#d97706';
  const overallLabel = allApproved ? '✓  FULLY CLEARED' : anyRejected ? '⚠  ACTION NEEDED' : '●  IN PROGRESS';

  return (
    <YStack space="$3">
      {/* Header */}
      <XStack alignItems="center" justifyContent="space-between">
        <SizableText size="$2" fontWeight="700" color="$color10" letterSpacing={0.5}>
          DRIVER ACCREDITATION
        </SizableText>
        <YStack
          paddingHorizontal={10} paddingVertical={4} borderRadius={999}
          backgroundColor={overallBg} borderWidth={1} borderColor={overallBord}
        >
          <SizableText size="$1" fontWeight="800" style={{ color: overallText }}>
            {overallLabel}
          </SizableText>
        </YStack>
      </XStack>

      {/* Three-row card */}
      <YStack
        backgroundColor="$color2"
        borderRadius={16}
        borderWidth={1}
        borderColor="$borderColor"
        overflow="hidden"
      >
        {/* Driver's License */}
        <DocRow
          label="Driver's License"
          subtitle={
            docStatus === 'approved' ? 'Valid license on file' :
            docStatus === 'rejected' ? 'Resubmit document required' :
            docStatus === 'pending'  ? 'Awaiting admin review' :
                                       'Upload front of license'
          }
          detail={verification?.license_filename}
          status={docStatus}
          onPress={() => router.push('/driver-verification')}
        />

        <YStack height={1} backgroundColor="$borderColor" />

        {/* Vehicle Insurance */}
        <DocRow
          label="Vehicle Insurance"
          subtitle={
            docStatus === 'approved' ? 'Current insurance policy on file' :
            docStatus === 'rejected' ? 'Resubmit document required' :
            docStatus === 'pending'  ? 'Awaiting admin review' :
                                       'Upload insurance card or declaration'
          }
          detail={verification?.insurance_filename}
          status={docStatus}
          onPress={() => router.push('/driver-verification')}
        />

        <YStack height={1} backgroundColor="$borderColor" />

        {/* Background Check */}
        <DocRow
          label="Background Check"
          subtitle={
            bgStatus === 'approved'  ? 'Criminal history & MVR cleared' :
            bgStatus === 'rejected'  ? 'Check failed — tap for details' :
            bgStatus === 'in_review' ? 'Check in progress — 1–3 business days' :
            bgStatus === 'pending'   ? 'Authorization submitted, awaiting review' :
                                       'FCRA authorization required'
          }
          detail={bgCheck?.external_ref ? `Screening ref: ${bgCheck.external_ref}` : undefined}
          status={bgStatus}
          onPress={() => router.push('/background-check')}
        />
      </YStack>

      {/* Rejection note shown inline */}
      {anyRejected && (verification?.admin_note || bgCheck?.admin_note) && (
        <XStack
          backgroundColor="rgba(220,38,38,0.06)"
          borderRadius={12} borderWidth={1} borderColor="rgba(220,38,38,0.2)"
          padding="$3" space="$2" alignItems="flex-start"
        >
          <AlertTriangle size={14} color="$red9" />
          <SizableText size="$2" color="$red10" flex={1} lineHeight={20}>
            {verification?.admin_note || bgCheck?.admin_note}
          </SizableText>
        </XStack>
      )}
    </YStack>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const driverId = useDriverId();
  const { data: verification } = useMyVerification(user?.id);
  const { data: bgCheck } = useMyBackgroundCheck(user?.id);
  const { data: connectStatus, refetch: refetchConnect } = useConnectStatus(driverId);
  const connectOnboard = useConnectOnboard();
  const [connectLoading, setConnectLoading] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // Photo upload state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && user?.displayName) {
      setDisplayName(user.displayName);
      setEditValue(user.displayName);
      saveDisplayName(user.displayName);
    } else {
      getSavedDisplayName().then((name) => {
        const fallback = name || 'Pickup Driver';
        setDisplayName(fallback);
        setEditValue(fallback);
      });
    }
  }, [isAuthenticated, authLoading, user?.displayName]);

  // Load saved photo URL from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem('driver_photo_url').then((url) => {
      if (url) setPhotoUrl(url);
    });
  }, []);

  const handlePickPhoto = async () => {
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
    // Reset so same file can be re-selected
    if (webFileInputRef.current) webFileInputRef.current.value = '';
  };

  const startEdit = () => { setEditValue(displayName); setEditing(true); };
  const cancelEdit = () => { setEditValue(displayName); setEditing(false); };

  const confirmEdit = async () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    await saveDisplayName(trimmed);
    setDisplayName(trimmed);
    setEditing(false);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  const handleSignOut = async () => {
    try {
      await blink.auth.signOut();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      router.replace('/sign-in');
    } catch (err) {
      console.warn('[auth] sign out failed:', err);
    }
  };

  const handleDeleteAccount = () => {
    router.push('/delete-account');
  };

  const handleSwitchToCustomer = async () => {
    await saveRole('customer');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    router.replace('/(customer)');
  };

  const handleChooseRole = async () => {
    router.replace('/role-select');
  };

  const sections: SettingsSection[] = [
    {
      title: 'Notifications',
      items: [
        {
          id: 'push',
          title: 'Push Notifications',
          icon: <Bell size={18} color="$color9" />,
          type: 'toggle',
          value: true,
          onValueChange: () => {},
        },
      ],
    },
    {
      title: 'Support',
      items: [
        { id: 'help', title: 'Help & Support', icon: <HelpCircle size={18} color="$color9" />, onPress: () => { const { Linking } = require('react-native'); Linking.openURL('mailto:PickupRunner@gmail.com'); } },
        { id: 'privacy', title: 'Privacy Policy', icon: <Shield size={18} color="$color9" />, onPress: () => router.push('/privacy-policy') },
        { id: 'terms', title: 'Terms of Use', icon: <FileText size={18} color="$color9" />, onPress: () => router.push('/terms') },
      ],
    },
    {
      title: 'Switch Mode',
      items: [
        {
          id: 'switch-customer',
          title: 'Switch to Customer',
          icon: <ShoppingBag size={18} color="$blue9" />,
          onPress: handleSwitchToCustomer,
        },
        {
          id: 'choose-role',
          title: 'Choose Role Again',
          icon: <RefreshCw size={18} color="$color9" />,
          onPress: handleChooseRole,
        },
      ],
    },
    {
      title: 'Account',
      items: isAuthenticated
        ? [
            {
              id: 'logout',
              title: 'Sign Out',
              icon: <LogOut size={18} color="$red9" />,
              onPress: handleSignOut,
            },
            {
              id: 'delete-account',
              title: 'Delete Account',
              icon: <Trash2 size={18} color="$red9" />,
              onPress: handleDeleteAccount,
            },
          ]
        : [
            {
              id: 'signin',
              title: 'Sign In / Create Account',
              icon: <LogIn size={18} color="$green9" />,
              onPress: () => router.push('/sign-in'),
            },
          ],
    },
  ];

  return (
    <SafeArea>
      <AppHeader title="Profile" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack padding="$4" space="$6">

          {/* ── Avatar + Name ── */}
          <YStack alignItems="center" space="$3">
            {/* Hidden web file input */}
            {Platform.OS === 'web' && (
              <input
                ref={webFileInputRef as any}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleWebFileChange as any}
              />
            )}
            <YStack position="relative">
              <Pressable onPress={handlePickPhoto} disabled={isUploading}>
                <Avatar size="$8" borderRadius="$full" backgroundColor="$color4">
                  {photoUrl ? (
                    <Avatar.Image source={{ uri: photoUrl }} />
                  ) : displayName ? (
                    <SizableText size="$7" fontWeight="800" color="$color12">
                      {initials(displayName)}
                    </SizableText>
                  ) : (
                    <User size={48} color="$color10" />
                  )}
                </Avatar>
                {/* Upload spinner overlay */}
                {isUploading && (
                  <View style={styles.avatarOverlay}>
                    <Spinner size="small" color="$color1" />
                  </View>
                )}
              </Pressable>

              {/* Camera button — bottom-left */}
              <Pressable
                onPress={handlePickPhoto}
                disabled={isUploading}
                style={styles.cameraBtn}
              >
                <Camera size={14} color="white" />
              </Pressable>

              {/* Green verified badge when signed in — bottom-right */}
              {isAuthenticated && (
                <YStack
                  position="absolute" bottom={-2} right={-2}
                  width={22} height={22} borderRadius={11}
                  backgroundColor="$green9"
                  alignItems="center" justifyContent="center"
                  borderWidth={2} borderColor="$background"
                >
                  <CheckCircle size={12} color="white" />
                </YStack>
              )}
            </YStack>

            {editing ? (
              <YStack space="$2" width="100%" alignItems="center">
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
                <XStack space="$2">
                  <Pressable onPress={cancelEdit} style={styles.editActionBtn}>
                    <X size={16} color="$color10" />
                    <SizableText size="$3" color="$color10">Cancel</SizableText>
                  </Pressable>
                  <Pressable onPress={confirmEdit} style={[styles.editActionBtn, styles.editActionBtnPrimary]}>
                    <Check size={16} color="white" />
                    <SizableText size="$3" color="white" fontWeight="700">Save</SizableText>
                  </Pressable>
                </XStack>
              </YStack>
            ) : (
              <YStack alignItems="center" space="$1">
                <XStack space="$2" alignItems="center">
                  <SizableText size="$6" fontWeight="700" color="$color12">
                    {displayName}
                  </SizableText>
                  {!isAuthenticated && (
                    <Pressable onPress={startEdit} hitSlop={8}>
                      <Edit3 size={16} color="$color9" />
                    </Pressable>
                  )}
                </XStack>
                {isAuthenticated && user?.email ? (
                  <SizableText size="$2" color="$color9">{user.email}</SizableText>
                ) : (
                  <SizableText size="$2" color="$color9">
                    Tap the pencil to change your chat name
                  </SizableText>
                )}
              </YStack>
            )}
          </YStack>

          {/* ── Sign-in nudge (unauthenticated) ── */}
          {!isAuthenticated && !authLoading && (
            <Pressable onPress={() => router.push('/sign-in')}>
              <YStack
                backgroundColor="$green2" borderRadius="$4" padding="$4"
                borderWidth={1} borderColor="$green5" space="$3"
              >
                <XStack space="$3" alignItems="flex-start">
                  <YStack
                    width={40} height={40} borderRadius={20}
                    backgroundColor="$green4" alignItems="center"
                    justifyContent="center" flexShrink={0}
                  >
                    <LogIn size={20} color="$green9" />
                  </YStack>
                  <YStack flex={1} space="$1">
                    <SizableText size="$4" fontWeight="800" color="$green10">
                      Sign in to unlock more features
                    </SizableText>
                    <YStack space="$1" marginTop="$1">
                      <XStack space="$2" alignItems="center">
                        <CheckCircle size={13} color="$green8" />
                        <SizableText size="$2" color="$green9">Full chat history (last 60 messages)</SizableText>
                      </XStack>
                      <XStack space="$2" alignItems="center">
                        <CheckCircle size={13} color="$green8" />
                        <SizableText size="$2" color="$green9">Delivery notification emails to customers</SizableText>
                      </XStack>
                      <XStack space="$2" alignItems="center">
                        <CheckCircle size={13} color="$green8" />
                        <SizableText size="$2" color="$green9">Your account synced across devices</SizableText>
                      </XStack>
                    </YStack>
                  </YStack>
                </XStack>
                <YStack backgroundColor="$green9" borderRadius={10} paddingVertical="$2" alignItems="center">
                  <SizableText size="$3" fontWeight="700" color="white">
                    Sign In / Create Account →
                  </SizableText>
                </YStack>
              </YStack>
            </Pressable>
          )}

          {/* ── Driver Accreditation ── */}
          <AccreditationSection verification={verification} bgCheck={bgCheck} />

          {/* ── Stripe Connect — Bank Account ── */}
          {driverId && (() => {
            const isConnected = connectStatus?.connected && connectStatus?.payoutsEnabled;
            const isPending   = connectStatus?.connected && !connectStatus?.payoutsEnabled;

            const handleConnect = async () => {
              if (!driverId) return;
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
              <Pressable onPress={isConnected ? undefined : handleConnect} disabled={connectLoading || !!isConnected}>
                <XStack
                  backgroundColor={isConnected ? 'rgba(21,128,61,0.08)' : 'rgba(99,102,241,0.08)'}
                  borderRadius="$4"
                  borderWidth={1}
                  borderColor={isConnected ? 'rgba(21,128,61,0.25)' : 'rgba(99,102,241,0.25)'}
                  padding="$4"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <XStack space="$3" alignItems="center" flex={1}>
                    <YStack
                      width={40} height={40} borderRadius={20}
                      backgroundColor={isConnected ? 'rgba(21,128,61,0.15)' : 'rgba(99,102,241,0.15)'}
                      alignItems="center" justifyContent="center"
                    >
                      {isConnected
                        ? <CheckCircle size={20} color="#15803d" />
                        : <CreditCard size={20} color="#6366f1" />
                      }
                    </YStack>
                    <YStack flex={1}>
                      <SizableText size="$4" fontWeight="700" color="$color12">
                        {isConnected ? 'Bank Account Connected' : isPending ? 'Finish Bank Setup' : 'Connect Bank Account'}
                      </SizableText>
                      <SizableText size="$2" color="$color9">
                        {isConnected
                          ? 'Stripe payouts enabled — daily transfers'
                          : isPending
                          ? 'Stripe needs more info to enable payouts'
                          : 'Get paid directly to your bank via Stripe'}
                      </SizableText>
                    </YStack>
                  </XStack>
                  {!isConnected && (
                    connectLoading
                      ? <Spinner size="small" color="$color9" />
                      : <ChevronRight size={18} color="$color9" />
                  )}
                </XStack>
              </Pressable>
            );
          })()}

          {/* ── Earnings shortcut ── */}
          <Pressable onPress={() => router.push('/(tabs)/earnings')}>
            <XStack
              backgroundColor="rgba(204,0,0,0.08)" borderRadius="$4"
              borderWidth={1} borderColor="rgba(204,0,0,0.25)"
              padding="$4" alignItems="center" justifyContent="space-between"
            >
              <XStack space="$3" alignItems="center">
                <YStack
                  width={40} height={40} borderRadius={20}
                  backgroundColor="rgba(204,0,0,0.15)"
                  alignItems="center" justifyContent="center"
                >
                  <DollarSign size={20} color={APP_CONFIG.PRIMARY_COLOR} />
                </YStack>
                <YStack>
                  <SizableText size="$4" fontWeight="700" color="$color12">Earnings & Payouts</SizableText>
                  <SizableText size="$2" color="$color9">View earnings, request payout</SizableText>
                </YStack>
              </XStack>
              <ChevronRight size={18} color="$color9" />
            </XStack>
          </Pressable>

          <SettingsScreen sections={sections} />
        </YStack>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  nameInput: {
    width: '80%',
    height: 48,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
  },
  editActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editActionBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  docRow: {
    // backgroundColor set inline per-status
  },
  cameraBtn: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
