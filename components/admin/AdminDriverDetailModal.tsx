import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useDriverProfile } from '@/lib/verification';
import { type AdminDriverSummary } from './AdminDriverCard';
import { colors, spacing, borderRadius } from '@/constants/design';

export interface AdminDriverDetailModalProps {
  visible: boolean;
  driver: AdminDriverSummary | null;
  onClose: () => void;
  onNavigateToDocs?: (driverName: string) => void;
  onNavigateToBG?: (driverName: string) => void;
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function AdminDriverDetailModal({
  visible,
  driver,
  onClose,
  onNavigateToDocs,
  onNavigateToBG,
}: AdminDriverDetailModalProps) {
  const { data: profile } = useDriverProfile(driver?.uid || undefined);

  if (!driver) return null;

  const docOk = driver.docStatus === 'approved';
  const bgOk = driver.bgStatus === 'approved';
  const fullyCleared = docOk && bgOk;
  const anyRejected = driver.docStatus === 'rejected' || driver.bgStatus === 'rejected';

  const ovLabel = fullyCleared ? 'CLEARED' : anyRejected ? 'ACTION NEEDED' : 'PENDING';
  const ovIcon: keyof typeof MaterialIcons.glyphMap = fullyCleared
    ? 'verified-user'
    : anyRejected
    ? 'gpp-bad'
    : 'hourglass-top';

  const ovColor = fullyCleared ? '#00E297' : anyRejected ? '#FFB4AB' : '#FFE399';
  const ovBg = fullyCleared
    ? 'rgba(0, 226, 151, 0.12)'
    : anyRejected
    ? 'rgba(255, 180, 171, 0.12)'
    : 'rgba(244, 195, 0, 0.12)';
  const ovBorder = fullyCleared
    ? 'rgba(0, 226, 151, 0.35)'
    : anyRejected
    ? 'rgba(255, 180, 171, 0.35)'
    : 'rgba(244, 195, 0, 0.35)';

  const initials = (driver.name || 'D')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleDocsPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onClose();
    onNavigateToDocs?.(driver.name);
  };

  const handleBGPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onClose();
    onNavigateToBG?.(driver.name);
  };

  const getStatusBadge = (status?: string, type: 'doc' | 'bg' = 'doc') => {
    if (status === 'approved') {
      return {
        label: 'Approved',
        color: '#00E297',
        bg: 'rgba(0, 226, 151, 0.12)',
        border: 'rgba(0, 226, 151, 0.35)',
        icon: 'check-circle' as keyof typeof MaterialIcons.glyphMap,
      };
    }
    if (status === 'rejected') {
      return {
        label: 'Rejected',
        color: '#FFB4AB',
        bg: 'rgba(255, 180, 171, 0.12)',
        border: 'rgba(255, 180, 171, 0.35)',
        icon: 'cancel' as keyof typeof MaterialIcons.glyphMap,
      };
    }
    if (status === 'in_review') {
      return {
        label: 'In Review',
        color: '#B3C5FF',
        bg: 'rgba(0, 102, 255, 0.15)',
        border: 'rgba(0, 102, 255, 0.35)',
        icon: 'manage-search' as keyof typeof MaterialIcons.glyphMap,
      };
    }
    if (status === 'pending') {
      return {
        label: 'Pending Review',
        color: '#FFE399',
        bg: 'rgba(244, 195, 0, 0.12)',
        border: 'rgba(244, 195, 0, 0.35)',
        icon: 'hourglass-top' as keyof typeof MaterialIcons.glyphMap,
      };
    }
    return {
      label: 'Not Submitted',
      color: colors.outline,
      bg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
      icon: 'help-outline' as keyof typeof MaterialIcons.glyphMap,
    };
  };

  const docBadge = getStatusBadge(driver.docStatus, 'doc');
  const bgBadge = getStatusBadge(driver.bgStatus, 'bg');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetContainer}>
              {/* Top Grabber Indicator */}
              <View style={styles.grabberRow}>
                <View style={styles.grabber} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.driverProfileHeader}>
                  <LinearGradient
                    colors={[colors.primaryContainer, '#262A34']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>{initials}</Text>
                  </LinearGradient>

                  <View style={styles.headerTitles}>
                    <Text style={styles.driverName} numberOfLines={1}>
                      {driver.name || 'Unnamed Driver'}
                    </Text>
                    <Text style={styles.driverEmail} numberOfLines={1}>
                      {driver.email || '—'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={onClose}
                    style={styles.closeBtn}
                  >
                    <MaterialIcons name="close" size={18} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>

                {/* Overall Compliance Banner */}
                <View style={[styles.overallBanner, { backgroundColor: ovBg, borderColor: ovBorder }]}>
                  <View style={styles.overallBannerLeft}>
                    <MaterialIcons name={ovIcon} size={16} color={ovColor} />
                    <Text style={[styles.overallBannerText, { color: ovColor }]}>
                      COMPLIANCE: {ovLabel}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Scrollable Body */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollBody}
              >
                {/* 1. Profile Details Grid */}
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <View style={styles.detailLabelRow}>
                      <MaterialIcons name="phone" size={13} color={colors.outline} />
                      <Text style={styles.detailLabel}>PHONE</Text>
                    </View>
                    <Text style={styles.detailValue}>{profile?.phone || '—'}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailLabelRow}>
                      <MaterialIcons name="badge" size={13} color={colors.outline} />
                      <Text style={styles.detailLabel}>ROLE</Text>
                    </View>
                    <Text style={[styles.detailValue, { textTransform: 'capitalize' }]}>
                      {profile?.role || 'Driver'}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailLabelRow}>
                      <MaterialIcons name="event" size={13} color={colors.outline} />
                      <Text style={styles.detailLabel}>REGISTERED</Text>
                    </View>
                    <Text style={styles.detailValue}>{fmtDate(profile?.createdAt)}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailLabelRow}>
                      <MaterialIcons name="credit-card" size={13} color={colors.outline} />
                      <Text style={styles.detailLabel}>STRIPE</Text>
                    </View>
                    <Text style={[styles.detailValue, styles.monospace]} numberOfLines={1}>
                      {profile?.stripeAccountId ? `${profile.stripeAccountId.slice(0, 10)}…` : '—'}
                    </Text>
                  </View>
                </View>

                {/* 2. Documents Section */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionHeaderLeft}>
                      <MaterialIcons name="description" size={18} color={colors.primary} />
                      <Text style={styles.sectionTitle}>Driver Documents</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: docBadge.bg, borderColor: docBadge.border }]}>
                      <MaterialIcons name={docBadge.icon} size={12} color={docBadge.color} />
                      <Text style={[styles.badgeText, { color: docBadge.color }]}>{docBadge.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.sectionSubtext}>
                    License and proof of commercial auto insurance coverage.
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleDocsPress}
                    style={styles.actionNavBtn}
                  >
                    <Text style={styles.actionNavBtnText}>Review Documents</Text>
                    <MaterialIcons name="chevron-right" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* 3. Background Check Section */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionHeaderLeft}>
                      <MaterialIcons name="fingerprint" size={18} color="#B3C5FF" />
                      <Text style={styles.sectionTitle}>Background Check</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: bgBadge.bg, borderColor: bgBadge.border }]}>
                      <MaterialIcons name={bgBadge.icon} size={12} color={bgBadge.color} />
                      <Text style={[styles.badgeText, { color: bgBadge.color }]}>{bgBadge.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.sectionSubtext}>
                    Identity verification, criminal history, and SSN screening.
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleBGPress}
                    style={styles.actionNavBtn}
                  >
                    <Text style={styles.actionNavBtnText}>Review Background Check</Text>
                    <MaterialIcons name="chevron-right" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* Bottom Actions */}
              <View style={styles.footer}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={styles.closeModalBtn}
                >
                  <Text style={styles.closeModalBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0C0F17',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 25,
  },
  grabberRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  driverProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimaryContainer,
  },
  headerTitles: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  driverName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.2,
  },
  driverEmail: {
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  overallBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  overallBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overallBannerText: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 12,
  },
  detailItem: {
    width: '46%',
    gap: 2,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  monospace: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11.5,
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  sectionSubtext: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 102, 255, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  actionNavBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  closeModalBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
});
