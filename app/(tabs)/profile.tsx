import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  TextInput,
  Platform,
  StyleSheet,
  Pressable,
  Alert,
  View,
  Text,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Avatar,
  SafeArea,
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
  ShoppingBag,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  Clock,
  FileText,
  AlertTriangle,
  DollarSign,
  Trash2,
  Camera,
  CreditCard,
  Zap,
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
import { APP_CONFIG } from '@/lib/config';
import { useConnectStatus, useConnectOnboard } from '@/lib/stripeConnect';
import { useDriverId } from '@/hooks/useDriverId';
import { useToast } from '@/components/core';

const BLUE = '#0066FF';
const GOLD = '#F5C400';
const GREEN = '#00E676';
const RED = '#EF4444';
const BG = '#000000';
const CARD_BG = '#0F121C';

function haptic() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'DR';
}

type DocStatus = 'approved' | 'rejected' | 'pending' | 'in_review' | undefined;

interface StatusCfg {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}

function getStatusCfg(s: DocStatus): StatusCfg {
  switch (s) {
    case 'approved':
      return {
        label: 'Approved',
        color: GREEN,
        bg: 'rgba(0, 230, 118, 0.12)',
        border: 'rgba(0, 230, 118, 0.3)',
        icon: <CheckCircle size={16} color={GREEN} />,
      };
    case 'rejected':
      return {
        label: 'Rejected',
        color: RED,
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.3)',
        icon: <X size={16} color={RED} />,
      };
    case 'in_review':
    case 'pending':
      return {
        label: 'In Review',
        color: GOLD,
        bg: 'rgba(245, 196, 0, 0.12)',
        border: 'rgba(245, 196, 0, 0.3)',
        icon: <Clock size={16} color={GOLD} />,
      };
    default:
      return {
        label: 'Required',
        color: '#94A3B8',
        bg: 'rgba(148, 163, 184, 0.1)',
        border: 'rgba(148, 163, 184, 0.25)',
        icon: <AlertTriangle size={16} color="#94A3B8" />,
      };
  }
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { showToast } = useToast();
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
  const [pushEnabled, setPushEnabled] = useState(true);

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

  useEffect(() => {
    AsyncStorage.getItem('driver_photo_url').then((url) => {
      if (url) setPhotoUrl(url);
    });
  }, []);

  const handlePickPhoto = async () => {
    haptic();
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
    if (webFileInputRef.current) webFileInputRef.current.value = '';
  };

  const startEdit = () => {
    haptic();
    setEditValue(displayName);
    setEditing(true);
  };

  const cancelEdit = () => {
    haptic();
    setEditValue(displayName);
    setEditing(false);
  };

  const confirmEdit = async () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    haptic();
    await saveDisplayName(trimmed);
    setDisplayName(trimmed);
    setEditing(false);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  const handleSignOut = async () => {
    try {
      haptic();
      await blink.auth.signOut();
      router.replace('/sign-in');
    } catch (err) {
      console.warn('[auth] sign out failed:', err);
    }
  };

  const handleSwitchToCustomer = async () => {
    haptic();
    showToast('Switched to Customer mode', { type: 'info' });
    await saveRole('customer');
    router.replace('/(customer)');
  };

  const handleChooseRole = async () => {
    haptic();
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
    haptic();
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
    <SafeArea>
      <View style={styles.root}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarInitialWrap}>
              <Text style={styles.avatarInitial}>{initials(displayName)}</Text>
            </View>
            <View>
              <Text style={styles.headerBrand}>Pickup Runner</Text>
              <Text style={styles.headerTitle}>Driver Profile</Text>
            </View>
          </View>

          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>ACTIVE</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hidden Web File Input */}
          {Platform.OS === 'web' && (
            <input
              ref={webFileInputRef as any}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleWebFileChange as any}
            />
          )}

          {/* ── 1. Hero Driver Card ── */}
          <View style={styles.heroCard}>
            <LinearGradient
              colors={['#181C28', '#121520', '#0C0E16']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroTopRow}>
                {/* Avatar with Photo Picker */}
                <View style={styles.avatarWrap}>
                  <Pressable onPress={handlePickPhoto} disabled={isUploading}>
                    <Avatar size="$7" borderRadius="$full" backgroundColor="#1E2433">
                      {photoUrl ? (
                        <Avatar.Image source={{ uri: photoUrl }} />
                      ) : (
                        <Text style={styles.avatarText}>{initials(displayName)}</Text>
                      )}
                    </Avatar>
                    {isUploading && (
                      <View style={styles.avatarOverlay}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </View>
                    )}
                  </Pressable>

                  {/* Camera Icon Overlay */}
                  <Pressable onPress={handlePickPhoto} style={styles.cameraBadge}>
                    <Camera size={11} color="#FFFFFF" />
                  </Pressable>
                </View>

                {/* Driver Info */}
                <View style={styles.driverInfoCol}>
                  {editing ? (
                    <View style={styles.editingWrap}>
                      <TextInput
                        value={editValue}
                        onChangeText={setEditValue}
                        placeholder="Your Name"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        autoFocus
                        style={[styles.nameEditInput, webNoOutline]}
                      />
                      <View style={styles.editActionRow}>
                        <Pressable onPress={cancelEdit} style={styles.editCancelBtn}>
                          <X size={14} color="#94A3B8" />
                        </Pressable>
                        <Pressable onPress={confirmEdit} style={styles.editSaveBtn}>
                          <Check size={14} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.nameRow}>
                      <Text style={styles.driverNameText}>{displayName}</Text>
                      <Pressable onPress={startEdit} hitSlop={8} style={styles.editIconBtn}>
                        <Edit3 size={14} color={GOLD} />
                      </Pressable>
                    </View>
                  )}

                  <Text style={styles.driverEmailText}>
                    {user?.email || 'driver@pickuprunner.com'}
                  </Text>

                  <View style={styles.statusRow}>
                    <View style={styles.accountVerifiedPill}>
                      <View style={styles.verifiedDot} />
                      <Text style={styles.accountVerifiedText}>
                        {isAuthenticated ? 'Account Verified' : 'Guest Driver'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 3 Metrics Row */}
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>STATUS</Text>
                  <Text style={[styles.metricValue, { color: GREEN }]}>Ready</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>RATING</Text>
                  <Text style={[styles.metricValue, { color: GOLD }]}>4.9 ★</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>PAYOUTS</Text>
                  <Text style={[styles.metricValue, { color: isStripeConnected ? GREEN : '#94A3B8' }]}>
                    {isStripeConnected ? 'Active' : 'Setup'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* ── 2. Driver Accreditation Section ── */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>DRIVER ACCREDITATION</Text>
              <View
                style={[
                  styles.overallBadge,
                  allApproved ? styles.overallBadgeSuccess : styles.overallBadgeWarning,
                ]}
              >
                <Text
                  style={[
                    styles.overallBadgeText,
                    allApproved ? { color: GREEN } : { color: GOLD },
                  ]}
                >
                  {allApproved ? '✓ FULLY CLEARED' : '● IN PROGRESS'}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <LinearGradient
                colors={['#181C28', '#121520', '#0C0E16']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.cardGradientNoPad}
              >
                {/* License Row */}
                <DocItem
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

                <View style={styles.itemDivider} />

                {/* Insurance Row */}
                <DocItem
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

                <View style={styles.itemDivider} />

                {/* Background Check Row */}
                <DocItem
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
              </LinearGradient>
            </View>
          </View>

          {/* ── 3. Stripe Bank & Financials ── */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>FINANCIALS & PAYOUTS</Text>

            <View style={styles.card}>
              <LinearGradient
                colors={['#181C28', '#121520', '#0C0E16']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.cardGradientNoPad}
              >
                {/* Bank Account Row */}
                <Pressable
                  onPress={isStripeConnected ? undefined : handleConnectStripe}
                  disabled={connectLoading || !!isStripeConnected}
                  style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.8 }]}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: isStripeConnected ? 'rgba(0,230,118,0.15)' : 'rgba(0,102,255,0.15)' }]}>
                    <CreditCard size={18} color={isStripeConnected ? GREEN : BLUE} />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>
                      {isStripeConnected ? 'Bank Account Connected' : isStripePending ? 'Finish Bank Setup' : 'Connect Bank via Stripe'}
                    </Text>
                    <Text style={styles.actionSubtitle}>
                      {isStripeConnected
                        ? 'Direct deposit enabled for daily payouts'
                        : 'Link checking account for automatic transfers'}
                    </Text>
                  </View>
                  {!isStripeConnected && (
                    connectLoading ? (
                      <ActivityIndicator size="small" color={BLUE} />
                    ) : (
                      <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
                    )
                  )}
                </Pressable>

                <View style={styles.itemDivider} />

                {/* Earnings Shortcut */}
                <Pressable
                  onPress={() => {
                    haptic();
                    router.push('/(tabs)/earnings');
                  }}
                  style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.8 }]}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(245,196,0,0.15)' }]}>
                    <DollarSign size={18} color={GOLD} />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Earnings & Instant Payout</Text>
                    <Text style={styles.actionSubtitle}>View ledger, weekly stats, and cashout</Text>
                  </View>
                  <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
                </Pressable>
              </LinearGradient>
            </View>
          </View>

          {/* ── 4. App Preferences ── */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>PREFERENCES</Text>

            <View style={styles.card}>
              <LinearGradient
                colors={['#181C28', '#121520', '#0C0E16']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.cardGradientNoPad}
              >
                <View style={styles.actionRow}>
                  <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                    <Bell size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Push Notifications</Text>
                    <Text style={styles.actionSubtitle}>Get alert for nearby orders</Text>
                  </View>
                  <Switch
                    value={pushEnabled}
                    onValueChange={(val) => {
                      haptic();
                      setPushEnabled(val);
                    }}
                    trackColor={{ false: '#262A38', true: BLUE }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* ── 5. Switch Mode & Roles ── */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>SWITCH MODE</Text>

            <View style={styles.card}>
              <LinearGradient
                colors={['#181C28', '#121520', '#0C0E16']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.cardGradientNoPad}
              >
                <Pressable
                  onPress={handleSwitchToCustomer}
                  style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.8 }]}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(244,195,0,0.15)' }]}>
                    <ShoppingBag size={18} color={GOLD} />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Switch to Customer Mode</Text>
                    <Text style={styles.actionSubtitle}>Order items and request deliveries</Text>
                  </View>
                  <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
                </Pressable>

                <View style={styles.itemDivider} />

                <Pressable
                  onPress={handleChooseRole}
                  style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.8 }]}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(244,195,0,0.12)' }]}>
                    <RefreshCw size={18} color={GOLD} />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Choose Role Again</Text>
                    <Text style={styles.actionSubtitle}>Switch between Driver and Customer</Text>
                  </View>
                  <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
                </Pressable>
              </LinearGradient>
            </View>
          </View>

          {/* ── 6. Support & Legal ── */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>SUPPORT & LEGAL</Text>

            <View style={styles.card}>
              <LinearGradient
                colors={['#181C28', '#121520', '#0C0E16']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.cardGradientNoPad}
              >
                <Pressable
                  onPress={() => {
                    const { Linking } = require('react-native');
                    Linking.openURL('mailto:PickupRunner@gmail.com');
                  }}
                  style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.8 }]}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                    <HelpCircle size={18} color="rgba(255,255,255,0.8)" />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Help & Support</Text>
                    <Text style={styles.actionSubtitle}>Contact Pickup Runner support</Text>
                  </View>
                  <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
                </Pressable>

                <View style={styles.itemDivider} />

                <Pressable
                  onPress={() => router.push('/privacy-policy')}
                  style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.8 }]}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                    <Shield size={18} color="rgba(255,255,255,0.8)" />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Privacy Policy</Text>
                  </View>
                  <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
                </Pressable>

                <View style={styles.itemDivider} />

                <Pressable
                  onPress={() => router.push('/terms')}
                  style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.8 }]}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                    <FileText size={18} color="rgba(255,255,255,0.8)" />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Terms of Service</Text>
                  </View>
                  <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
                </Pressable>
              </LinearGradient>
            </View>
          </View>

          {/* ── 7. Account Session & Danger Zone ── */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>ACCOUNT</Text>

            <View style={styles.card}>
              <LinearGradient
                colors={['#181C28', '#121520', '#0C0E16']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.cardGradientNoPad}
              >
                {isAuthenticated ? (
                  <>
                    <Pressable
                      onPress={handleSignOut}
                      style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.8 }]}
                    >
                      <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                        <LogOut size={18} color={RED} />
                      </View>
                      <View style={styles.actionTextCol}>
                        <Text style={[styles.actionTitle, { color: RED }]}>Sign Out</Text>
                        <Text style={styles.actionSubtitle}>End current driver session</Text>
                      </View>
                    </Pressable>

                    <View style={styles.itemDivider} />

                    <Pressable
                      onPress={() => router.push('/delete-account')}
                      style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.8 }]}
                    >
                      <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(239,68,68,0.08)' }]}>
                        <Trash2 size={18} color="#F87171" />
                      </View>
                      <View style={styles.actionTextCol}>
                        <Text style={[styles.actionTitle, { color: '#F87171' }]}>Delete Account</Text>
                        <Text style={styles.actionSubtitle}>Permanently remove driver data</Text>
                      </View>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={() => router.push('/sign-in')}
                    style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.8 }]}
                  >
                    <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(0,230,118,0.15)' }]}>
                      <LogIn size={18} color={GREEN} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={[styles.actionTitle, { color: GREEN }]}>Sign In / Create Account</Text>
                      <Text style={styles.actionSubtitle}>Unlock full syncing and driver features</Text>
                    </View>
                    <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
                  </Pressable>
                )}
              </LinearGradient>
            </View>
          </View>

          {/* Version tag */}
          <Text style={styles.versionTag}>
            Pickup Runner v1.0.0 • Driver Portal
          </Text>
        </ScrollView>
      </View>
    </SafeArea>
  );
}

// ── Doc Row Component ──────────────────────────────────────────────────────────

function DocItem({
  title,
  subtitle,
  status,
  onPress,
}: {
  title: string;
  subtitle: string;
  status: DocStatus;
  onPress: () => void;
}) {
  const cfg = getStatusCfg(status);

  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress();
      }}
      style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.82 }]}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: cfg.bg, borderColor: cfg.border, borderWidth: 1 }]}>
        {cfg.icon}
      </View>
      <View style={styles.actionTextCol}>
        <View style={styles.docTitleRow}>
          <Text style={styles.actionTitle}>{title}</Text>
          <View style={[styles.docStatusPill, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Text style={[styles.docStatusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
    </Pressable>
  );
}

const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none', outline: 'none' } as any) : {};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarInitialWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E2230',
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '800',
  },
  headerBrand: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
  },
  onlineText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 18,
  },

  /* Hero Driver Card */
  heroCard: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  heroGradient: {
    padding: 18,
    width: '100%',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  driverInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverNameText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  editIconBtn: {
    padding: 4,
  },
  driverEmailText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12.5,
    marginTop: 2,
  },
  statusRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: GREEN,
  },
  accountVerifiedText: {
    color: GREEN,
    fontSize: 10.5,
    fontWeight: '800',
  },

  /* Editing */
  editingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameEditInput: {
    flex: 1,
    height: 36,
    backgroundColor: '#121520',
    borderWidth: 1.2,
    borderColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 10,
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  editActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editCancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1E2230',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSaveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Metrics */
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.07)',
    marginTop: 16,
    paddingTop: 14,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15.5,
    fontWeight: '900',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  /* Section Groups */
  sectionWrap: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  overallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  overallBadgeSuccess: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  overallBadgeWarning: {
    backgroundColor: 'rgba(245, 196, 0, 0.1)',
    borderColor: 'rgba(245, 196, 0, 0.3)',
  },
  overallBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* Cards & Action Rows */
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  cardGradientNoPad: {
    width: '100%',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  actionSubtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    marginTop: 2,
  },
  itemDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 66,
  },

  /* Doc Item Status */
  docTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  docStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
  },

  versionTag: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
});

