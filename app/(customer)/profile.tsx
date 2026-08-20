import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  Platform,
  StyleSheet,
<<<<<<< Updated upstream
  Alert,
=======
  Pressable,
  Linking,
>>>>>>> Stashed changes
  View,
  Text,
  StatusBar,
} from 'react-native';
<<<<<<< Updated upstream
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag } from '@blinkdotnew/mobile-ui';
=======
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Truck,
  Edit3,
  Check,
  X,
  RefreshCw,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  LogIn,
  LogOut,
  Trash2,
  ChevronRight,
  ShoppingBag,
  ShieldCheck,
} from '@blinkdotnew/mobile-ui';
>>>>>>> Stashed changes
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { saveRole } from '@/hooks/useRole';
import { useAuth } from '@/hooks/useAuth';
import { blink } from '@/lib/blink';
import { APP_CONFIG } from '@/lib/config';
<<<<<<< Updated upstream
import { CustomHeader, useToast } from '@/components/core';

import {
  ProfileHeroCard,
  ProfileSection,
  ProfileActionRow,
  ProfileSwitchRoleSection,
  ProfileSupportSection,
  ProfileAccountSection,
} from '@/components/profile';
=======
import { useToast, CustomConfirmModal } from '@/components/core';
>>>>>>> Stashed changes

const BLUE = '#0066FF';
const GOLD = '#F5C400';
const GREEN = '#00E676';
const RED = '#EF4444';
const CARD_BG = '#0F121C';

const NAME_KEY = 'customer_display_name';
const SESSION_KEY = 'customer_session_id';
const SUPPORT_EMAIL = APP_CONFIG.STORE_EMAIL;

<<<<<<< Updated upstream
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
=======
function haptic() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

function initials(name: string) {
  return (
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CU'
  );
>>>>>>> Stashed changes
}

export default function CustomerProfileScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [displayName, setDisplayName] = useState('Customer');
  const [orderStats, setOrderStats] = useState({ pending: 0, delivered: 0 });
  const [showDriverSwitchModal, setShowDriverSwitchModal] = useState(false);

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

<<<<<<< Updated upstream
  const handleSaveDisplayName = async (newName: string) => {
    await AsyncStorage.setItem(NAME_KEY, newName);
    setDisplayName(newName);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    }
  };

  const handleChooseRole = async () => {
    haptic('medium');
=======
  const confirmEdit = async () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    await AsyncStorage.setItem(NAME_KEY, trimmed);
    setDisplayName(trimmed);
    setEditing(false);
    haptic();
    showToast('Profile name updated!', {
      type: 'success',
      description: `Saved display name as "${trimmed}"`,
    });
  };

  const handleConfirmDriverSwitch = async () => {
    setShowDriverSwitchModal(false);
    showToast('Switching to Driver mode...', { type: 'info' });
    await saveRole('driver');
    haptic();
    router.replace('/(tabs)');
  };

  const switchToDriver = () => {
    haptic();
    setShowDriverSwitchModal(true);
  };

  const chooseRole = async () => {
    haptic();
>>>>>>> Stashed changes
    showToast('Returning to role selection...', { type: 'info' });
    await AsyncStorage.removeItem('app_role');
    router.replace('/(landing)/role-select');
  };

<<<<<<< Updated upstream
=======
  const emailSupport = () => {
    haptic();
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

>>>>>>> Stashed changes
  const handleSignOut = async () => {
    try {
      haptic('heavy');
      await blink.auth.signOut();
<<<<<<< Updated upstream
      router.replace('/sign-in');
=======
      haptic();
      showToast('Signed out successfully', { type: 'info' });
>>>>>>> Stashed changes
    } catch (err) {
      console.warn('[auth] sign out failed:', err);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

<<<<<<< Updated upstream
      <CustomHeader
        title="Customer Profile"
        subtitle="Manage profile & delivery requests"
        subtitleHighlight={`${APP_CONFIG.APP_NAME} •`}
        showAvatar={false}
        borderBottom
      />
=======
      {/* Top Header matching Driver Profile */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarInitialWrap}>
            <Text style={styles.avatarInitial}>{initials(displayName)}</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Customer Profile</Text>
          </View>
        </View>

        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>ACTIVE</Text>
        </View>
      </View>
>>>>>>> Stashed changes

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
<<<<<<< Updated upstream
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
=======
        {/* ── 1. Hero Customer Card with Midnight Tech Gradient ── */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['#181C28', '#121520', '#0C0E16']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroTopRow}>
              {/* Avatar with Gold Halo & Edit Badge */}
              <View style={styles.avatarWrap}>
                <View style={styles.avatarHalo}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarLetters}>{initials(displayName)}</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    setEditValue(displayName);
                    setEditing((v) => !v);
                    haptic();
                  }}
                  style={styles.cameraBadge}
                >
                  <Edit3 size={11} color="#0F131C" />
                </Pressable>
              </View>

              {/* Customer Info */}
              <View style={styles.customerInfoCol}>
                {editing ? (
                  <View style={styles.editingWrap}>
                    <TextInput
                      value={editValue}
                      onChangeText={setEditValue}
                      placeholder="Your Name"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={confirmEdit}
                      style={styles.nameEditInput}
                    />
                    <View style={styles.editActionRow}>
                      <Pressable onPress={() => setEditing(false)} style={styles.editCancelBtn}>
                        <X size={14} color="#94A3B8" />
                      </Pressable>
                      <Pressable onPress={confirmEdit} style={styles.editSaveBtn}>
                        <Check size={14} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.nameRow}>
                    <Text style={styles.customerNameText} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setEditValue(displayName);
                        setEditing(true);
                        haptic();
                      }}
                      hitSlop={8}
                      style={styles.editIconBtn}
                    >
                      <Edit3 size={14} color={GOLD} />
                    </Pressable>
                  </View>
                )}

                <Text style={styles.customerEmailText}>
                  {isAuthenticated && user?.email ? user.email : 'Guest Session'}
                </Text>

                <View style={styles.statusRow}>
                  <View style={styles.accountVerifiedPill}>
                    <View style={styles.verifiedDot} />
                    <Text style={styles.accountVerifiedText}>
                      {isAuthenticated ? 'Account Verified' : 'Guest Customer'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 3 Metrics Row */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>ACTIVE ORDERS</Text>
                <Text style={[styles.metricValue, { color: GOLD }]}>{orderStats.pending}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>DELIVERED</Text>
                <Text style={[styles.metricValue, { color: GREEN }]}>{orderStats.delivered}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>MEMBERSHIP</Text>
                <Text style={[styles.metricValue, { color: BLUE }]}>Customer</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── 2. Account Section ── */}
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
                  <View style={styles.actionRow}>
                    <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(0, 230, 118, 0.12)' }]}>
                      <ShieldCheck size={18} color={GREEN} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>Verified Account</Text>
                      <Text style={styles.actionSubtitle}>{user?.email}</Text>
                    </View>
                  </View>
                  <View style={styles.itemDivider} />
                  <Pressable
                    onPress={handleSignOut}
                    style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
                  >
                    <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                      <LogOut size={18} color={RED} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={[styles.actionTitle, { color: RED }]}>Sign Out</Text>
                      <Text style={styles.actionSubtitle}>You can still place orders as guest</Text>
                    </View>
                    <ChevronRight size={18} color="rgba(255, 255, 255, 0.3)" />
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() => {
                    haptic();
                    router.push('/(auth)/customer-auth');
                  }}
                  style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(245, 196, 0, 0.15)' }]}>
                    <LogIn size={18} color={GOLD} />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Sign In / Create Account</Text>
                    <Text style={styles.actionSubtitle}>
                      Save your addresses & order history across devices
                    </Text>
                  </View>
                  <ChevronRight size={18} color={GOLD} />
                </Pressable>
              )}
            </LinearGradient>
          </View>
        </View>

        {/* ── 3. Help & Support Section ── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>HELP & SUPPORT</Text>
          <View style={styles.card}>
            <LinearGradient
              colors={['#181C28', '#121520', '#0C0E16']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.cardGradientNoPad}
            >
              <Pressable
                onPress={emailSupport}
                style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(0, 102, 255, 0.12)' }]}>
                  <Mail size={18} color={BLUE} />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>Email {APP_CONFIG.STORE_NAME}</Text>
                  <Text style={styles.actionSubtitle}>{SUPPORT_EMAIL || 'support@pickuprunner.com'}</Text>
                </View>
                <ChevronRight size={18} color="rgba(255, 255, 255, 0.3)" />
              </Pressable>

              {APP_CONFIG.STORE_PHONE ? (
                <>
                  <View style={styles.itemDivider} />
                  <Pressable
                    onPress={() => {
                      haptic();
                      Linking.openURL(`tel:${APP_CONFIG.STORE_PHONE}`);
                    }}
                    style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
                  >
                    <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(0, 230, 118, 0.12)' }]}>
                      <Phone size={18} color={GREEN} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>Call Store Support</Text>
                      <Text style={styles.actionSubtitle}>{APP_CONFIG.STORE_PHONE}</Text>
                    </View>
                    <ChevronRight size={18} color="rgba(255, 255, 255, 0.3)" />
                  </Pressable>
                </>
              ) : null}
            </LinearGradient>
          </View>
        </View>

        {/* ── 4. Switch Mode Section ── */}
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
                onPress={switchToDriver}
                style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(0, 102, 255, 0.12)' }]}>
                  <Truck size={18} color={BLUE} />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>Sign In as Driver</Text>
                  <Text style={styles.actionSubtitle}>Accept and deliver pickup orders</Text>
                </View>
                <ChevronRight size={18} color="rgba(255, 255, 255, 0.3)" />
              </Pressable>

              <View style={styles.itemDivider} />

              <Pressable
                onPress={chooseRole}
                style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(245, 196, 0, 0.12)' }]}>
                  <RefreshCw size={18} color={GOLD} />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>Choose Role Again</Text>
                  <Text style={styles.actionSubtitle}>Return to the landing role selection</Text>
                </View>
                <ChevronRight size={18} color="rgba(255, 255, 255, 0.3)" />
              </Pressable>
            </LinearGradient>
          </View>
        </View>

        {/* ── 5. Data & Privacy Section ── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>DATA & PRIVACY</Text>
          <View style={styles.card}>
            <LinearGradient
              colors={['#181C28', '#121520', '#0C0E16']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.cardGradientNoPad}
            >
              <Pressable
                onPress={() => {
                  haptic();
                  router.push('/delete-account');
                }}
                style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                  <Trash2 size={18} color={RED} />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={[styles.actionTitle, { color: RED }]}>Delete Account</Text>
                  <Text style={styles.actionSubtitle}>Permanently remove your account and data</Text>
                </View>
                <ChevronRight size={18} color={RED} />
              </Pressable>
            </LinearGradient>
          </View>
        </View>

        {/* Version Footer */}
        <Text style={styles.versionTag}>
          {APP_CONFIG.STORE_NAME} · Customer Profile v1.0.0
        </Text>
      </ScrollView>

      {/* Mode Switch Confirmation Modal */}
      <CustomConfirmModal
        visible={showDriverSwitchModal}
        variant="info"
        iconName="local-shipping"
        title="Switch to Driver Mode?"
        message="You will be redirected to the Driver portal to accept and deliver pickup orders."
        confirmText="Switch to Driver"
        cancelText="Cancel"
        onClose={() => setShowDriverSwitchModal(false)}
        onConfirm={handleConfirmDriverSwitch}
      />
>>>>>>> Stashed changes
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
<<<<<<< Updated upstream
    backgroundColor: BG,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 18,
  },
=======
    backgroundColor: '#000000',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarInitialWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 196, 0, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 196, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '900',
  },
  headerBrand: {
    color: '#8C90A1',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
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
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
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
    letterSpacing: 0.5,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
    gap: 16,
  },

  /* Hero Card */
  heroCard: {
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
  heroGradient: {
    padding: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarHalo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(245, 196, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 196, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetters: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F131C',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: '#0C0E16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerNameText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  editIconBtn: {
    padding: 4,
  },
  customerEmailText: {
    color: 'rgba(255, 255, 255, 0.45)',
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
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 4,
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
  actionRowPressed: {
    opacity: 0.8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
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

>>>>>>> Stashed changes
  versionTag: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
});
