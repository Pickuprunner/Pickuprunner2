import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  TextInput,
  Platform,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
  View,
  Text,
  StatusBar,
} from 'react-native';
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
  MapPin,
  ShieldCheck,
} from '@blinkdotnew/mobile-ui';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { saveRole } from '@/hooks/useRole';
import { useAuth } from '@/hooks/useAuth';
import { blink } from '@/lib/blink';
import { colors, gradients, spacing, borderRadius } from '@/constants/design';
import { APP_CONFIG } from '@/lib/config';
import CustomInput from '@/components/core/CustomInput';

const NAME_KEY = 'customer_display_name';
const SESSION_KEY = 'customer_session_id';
const SUPPORT_EMAIL = APP_CONFIG.STORE_EMAIL;

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CU';
}

export default function CustomerProfileScreen() {
  const { user, isAuthenticated } = useAuth();
  const [displayName, setDisplayName] = useState('Customer');
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [orderStats, setOrderStats] = useState({ pending: 0, delivered: 0 });

  useEffect(() => {
    if (isAuthenticated && user?.displayName) {
      setDisplayName(user.displayName);
      setEditValue(user.displayName);
      AsyncStorage.setItem(NAME_KEY, user.displayName).catch(() => {});
    } else {
      AsyncStorage.getItem(NAME_KEY).then((n) => {
        if (n) {
          setDisplayName(n);
          setEditValue(n);
        } else {
          setEditValue('Customer');
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
      router.replace('/(tabs)');
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Switch to Driver mode? You'll need to sign in.")) doSwitch();
    } else {
      Alert.alert('Switch to Driver Mode?', "You'll need to sign in with your driver account.", [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', onPress: doSwitch },
      ]);
    }
  };

  const chooseRole = async () => {
    await AsyncStorage.removeItem('app_role');
    router.replace('/(landing)/role-select');
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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      
      <LinearGradient
        colors={gradients.heroGlow}
        locations={gradients.heroGlowLocations}
        style={styles.heroGlow}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
       
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>My Profile</Text>
          <Text style={styles.screenSubtitle}>Manage your account, preferences & support</Text>
        </View>

       
        <View style={styles.profileHeroCard}>
          <View style={styles.avatarHalo}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetters}>{initials(displayName)}</Text>
            </View>
            <Pressable
              onPress={() => {
                setEditValue(displayName);
                setEditing((v) => !v);
                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync().catch(() => {});
                }
              }}
              style={styles.avatarEditBadge}
            >
              <Edit3 size={13} color={colors.secondaryContainer} />
            </Pressable>
          </View>

          {editing ? (
            <View style={styles.editSection}>
              <CustomInput
                value={editValue}
                onChangeText={setEditValue}
                placeholder="Enter your name"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={confirmEdit}
                status={editValue.trim().length >= 2 ? 'success' : 'default'}
              />
              <View style={styles.editButtonsRow}>
                <Pressable onPress={() => setEditing(false)} style={styles.editCancelBtn}>
                  <X size={15} color="#8C90A1" />
                  <Text style={styles.editCancelText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={confirmEdit} style={styles.editSaveBtn}>
                  <Check size={15} color="#0F131C" />
                  <Text style={styles.editSaveText}>Save Name</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.profileTextContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{displayName}</Text>
                <View style={styles.customerRoleTag}>
                  <ShoppingBag size={11} color={colors.secondaryContainer} />
                  <Text style={styles.customerRoleTagText}>Customer</Text>
                </View>
              </View>
              <Text style={styles.displayEmail}>
                {isAuthenticated && user?.email ? user.email : 'Guest Session'}
              </Text>
            </View>
          )}
        </View>

       
        <View style={styles.statsGrid}>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: 'rgba(244, 195, 0, 0.15)' }]}>
              <Clock size={18} color={colors.secondaryContainer} />
            </View>
            <Text style={styles.statNumberGold}>{orderStats.pending}</Text>
            <Text style={styles.statLabel}>ACTIVE ORDERS</Text>
          </View>

          
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: 'rgba(0, 226, 151, 0.15)' }]}>
              <CheckCircle size={18} color={colors.tertiary} />
            </View>
            <Text style={styles.statNumberGreen}>{orderStats.delivered}</Text>
            <Text style={styles.statLabel}>DELIVERED</Text>
          </View>
        </View>

        
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          {isAuthenticated ? (
            <>
              <View style={styles.signedInCard}>
                <View style={styles.signedInLeft}>
                  <View style={styles.verifiedDot} />
                  <View>
                    <Text style={styles.signedInLabel}>Verified Account</Text>
                    <Text style={styles.signedInEmail}>{user?.email}</Text>
                  </View>
                </View>
                <ShieldCheck size={18} color={colors.tertiary} />
              </View>

              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              >
                <View style={[styles.actionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                  <LogOut size={18} color="#FF6B6B" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitleDanger}>Sign Out</Text>
                  <Text style={styles.actionSubtitle}>You can still place orders as guest</Text>
                </View>
                <ChevronRight size={18} color={colors.outline} />
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => router.push('/(auth)/customer-auth')}
              style={({ pressed }) => [
                styles.signInCtaCard,
                pressed && styles.actionCardPressed,
              ]}
            >
              <View
                style={[
                  styles.actionIconBox,
                  {
                    backgroundColor: 'rgba(244, 195, 0, 0.15)',
                    borderColor: 'rgba(244, 195, 0, 0.35)',
                    borderWidth: 1,
                  },
                ]}
              >
                <LogIn size={20} color={colors.secondaryContainer} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Sign In / Create Account</Text>
                <Text style={styles.actionSubtitle}>
                  Save your addresses & order history across devices
                </Text>
              </View>
              <ChevronRight size={18} color={colors.secondaryContainer} />
            </Pressable>
          )}
        </View>

       
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>HELP & SUPPORT</Text>
          <Pressable
            onPress={emailSupport}
            style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
          >
            <View style={styles.actionIconBox}>
              <Mail size={18} color={colors.primary} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Email {APP_CONFIG.STORE_NAME}</Text>
              <Text style={styles.actionSubtitle}>{SUPPORT_EMAIL || 'support@pickuprunner.com'}</Text>
            </View>
            <ChevronRight size={18} color={colors.outline} />
          </Pressable>

          {APP_CONFIG.STORE_PHONE ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${APP_CONFIG.STORE_PHONE}`)}
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
            >
              <View style={styles.actionIconBox}>
                <Phone size={18} color={colors.tertiary} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Call Store Support</Text>
                <Text style={styles.actionSubtitle}>{APP_CONFIG.STORE_PHONE}</Text>
              </View>
              <ChevronRight size={18} color={colors.outline} />
            </Pressable>
          ) : null}
        </View>

       
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>SWITCH MODE</Text>

          <Pressable
            onPress={switchToDriver}
            style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(0, 102, 255, 0.15)' }]}>
              <Truck size={18} color={colors.primary} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Sign In as Driver</Text>
              <Text style={styles.actionSubtitle}>Accept and deliver pickup orders</Text>
            </View>
            <ChevronRight size={18} color={colors.outline} />
          </Pressable>

          <Pressable
            onPress={chooseRole}
            style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(244, 195, 0, 0.12)' }]}>
              <RefreshCw size={18} color={colors.secondaryContainer} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Choose Role Again</Text>
              <Text style={styles.actionSubtitle}>Return to the landing role selection</Text>
            </View>
            <ChevronRight size={18} color={colors.outline} />
          </Pressable>
        </View>

       
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>DATA & PRIVACY</Text>
          <Pressable
            onPress={() => router.push('/delete-account')}
            style={({ pressed }) => [styles.dangerCard, pressed && styles.actionCardPressed]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Trash2 size={18} color="#FF6B6B" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitleDanger}>Delete Account</Text>
              <Text style={styles.actionSubtitle}>Permanently remove your account and data</Text>
            </View>
            <ChevronRight size={18} color="#FF6B6B" />
          </Pressable>
        </View>

       
        <View style={styles.footerContainer}>
          <Text style={styles.footerBrand}>{APP_CONFIG.STORE_NAME}</Text>
          <Text style={styles.footerVersion}>Version 1.0.0 · Midnight Tech Noir</Text>
        </View>
      </ScrollView>
    </View>
  );
}



const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    width: '100%',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 110,
    gap: 20,
  },
  screenHeader: {
    gap: 4,
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#8C90A1',
    fontWeight: '500',
  },

  
  profileHeroCard: {
    backgroundColor: '#151821',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarHalo: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(244, 195, 0, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(244, 195, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: colors.secondaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondaryContainer,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.secondaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarLetters: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F131C',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0F131C',
    borderWidth: 2,
    borderColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTextContainer: {
    alignItems: 'center',
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  customerRoleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(244, 195, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244, 195, 0, 0.3)',
  },
  customerRoleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryContainer,
  },
  displayEmail: {
    fontSize: 13,
    color: '#8C90A1',
  },
  editSection: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  editButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8C90A1',
  },
  editSaveBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editSaveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F131C',
  },

 
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#151821',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumberGold: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.secondaryContainer,
  },
  statNumberGreen: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.tertiary,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#8C90A1',
    letterSpacing: 0.8,
  },

 
  sectionBlock: {
    gap: 10,
  },
  sectionHeader: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8C90A1',
    letterSpacing: 1.2,
    marginLeft: 4,
  },
  signedInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 226, 151, 0.08)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 226, 151, 0.25)',
    padding: 14,
  },
  signedInLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  verifiedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.tertiary,
  },
  signedInLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.tertiary,
  },
  signedInEmail: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 1,
  },
  signInCtaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#151821',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(244, 195, 0, 0.35)',
    padding: 14,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#151821',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
  },
  actionCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    padding: 14,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1C202E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextContainer: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#DFE2EF',
  },
  actionTitleDanger: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#8C90A1',
    lineHeight: 16,
  },

  // Footer
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  footerBrand: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8C90A1',
  },
  footerVersion: {
    fontSize: 11,
    color: '#6B7280',
  },
});
