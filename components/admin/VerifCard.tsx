import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  View,
  Text,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useReviewVerification, useDriverProfile, type DriverVerification } from '@/lib/verification';
import { DocumentPreviewRow } from '@/components/DocumentViewer';
import { CustomConfirmModal, type ConfirmModalVariant } from '@/components/core';
import { AdminRejectReasonModal } from './AdminRejectReasonModal';
import { colors, spacing, borderRadius } from '@/constants/design';

function relDate(iso?: string) {
  if (!iso) return '';
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
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

export default function VerifCard({ v }: { v: DriverVerification }) {
  const review = useReviewVerification();
  const { data: profile } = useDriverProfile(v.user_id);
  const [open, setOpen] = useState(v.status === 'pending');
  const [rejNote, setRejNote] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [busy, setBusy] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: ConfirmModalVariant;
    iconName: keyof typeof MaterialIcons.glyphMap;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const isPending = v.status === 'pending';
  const isApproved = v.status === 'approved';
  const isRejected = v.status === 'rejected';

  const statusColor = isApproved ? '#00E297' : isRejected ? '#FFB4AB' : '#FFE399';
  const statusBg = isApproved
    ? 'rgba(0, 226, 151, 0.12)'
    : isRejected
    ? 'rgba(255, 180, 171, 0.12)'
    : 'rgba(244, 195, 0, 0.12)';
  const statusBorder = isApproved
    ? 'rgba(0, 226, 151, 0.35)'
    : isRejected
    ? 'rgba(255, 180, 171, 0.35)'
    : 'rgba(244, 195, 0, 0.35)';
  const statusIcon: keyof typeof MaterialIcons.glyphMap = isApproved
    ? 'check-circle'
    : isRejected
    ? 'cancel'
    : 'hourglass-top';

  const initials = (v.driver_name || 'D')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const doReview = (action: 'approved' | 'rejected' | 'pending', note?: string) => {
    const isApprove = action === 'approved';
    const isReject = action === 'rejected';

    setConfirmConfig({
      visible: true,
      title: isApprove ? 'Approve Documents' : isReject ? 'Reject Documents' : 'Reopen Document Review',
      message: isApprove
        ? `Are you sure you want to approve driver documents for ${v.driver_name}?`
        : isReject
        ? `Are you sure you want to reject documents for ${v.driver_name}?`
        : `Reopen document review process for ${v.driver_name}?`,
      confirmText: isApprove ? 'Approve' : isReject ? 'Reject' : 'Reopen',
      variant: isApprove ? 'success' : isReject ? 'danger' : 'info',
      iconName: isApprove ? 'verified-user' : isReject ? 'cancel' : 'lock-open',
      onConfirm: async () => {
        setBusy(true);
        try {
          await review.mutateAsync({ id: v.id, status: action, adminNote: note });
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
          setShowReject(false);
          setRejNote('');
          setConfirmConfig(null);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  return (
    <View style={[styles.card, isPending ? styles.cardActionable : styles.cardResolved]}>
      {/* Card Header */}
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        style={styles.headerRow}
      >
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={[colors.primaryContainer, '#262A34']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>

          <View style={styles.titleCol}>
            <Text style={styles.driverName} numberOfLines={1}>
              {v.driver_name}
            </Text>
            <View style={styles.timeRow}>
              <MaterialIcons name="schedule" size={13} color={colors.outline} />
              <Text style={styles.timeText} numberOfLines={1}>
                Submitted {relDate(v.submitted_at)} · {v.driver_email || '—'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.statusTag, { backgroundColor: statusBg, borderColor: statusBorder }]}>
            <MaterialIcons name={statusIcon} size={13} color={statusColor} />
            <Text style={[styles.statusTagText, { color: statusColor }]}>
              {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
            </Text>
          </View>

          <MaterialIcons
            name={open ? 'expand-less' : 'expand-more'}
            size={20}
            color={open ? colors.primary : colors.outline}
          />
        </View>
      </Pressable>

      {/* Expanded Content */}
      {open && (
        <View style={styles.expandedContent}>
          {/* Rejection Note if rejected */}
          {isRejected && (v.admin_note || v.rejection_reason) && (
            <View style={styles.rejectNoteBox}>
              <View style={styles.rejectNoteTitleRow}>
                <MaterialIcons name="block" size={14} color="#FFB4AB" />
                <Text style={styles.rejectNoteTitle}>Rejection Reason</Text>
              </View>
              <Text style={styles.rejectNoteText}>{v.admin_note || v.rejection_reason}</Text>
            </View>
          )}

          {/* Reviewed timestamp banner */}
          {v.reviewed_at && (
            <View style={styles.reviewedBox}>
              <View style={styles.reviewedTitleRow}>
                <MaterialIcons name="history" size={14} color={colors.primary} />
                <Text style={styles.reviewedTitle}>Reviewed {relDate(v.reviewed_at)}</Text>
              </View>
              <Text style={styles.reviewedText}>Decision recorded in compliance log.</Text>
            </View>
          )}

          {/* Profile Detail Grid (2x2) */}
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <View style={styles.detailLabelRow}>
                <MaterialIcons name="call" size={13} color={colors.outline} />
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
                {profile?.role || 'driver'}
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
                <Text style={styles.detailLabel}>STRIPE ACCOUNT</Text>
              </View>
              <Text style={[styles.detailValue, styles.monospace]}>
                {profile?.stripeAccountId || '—'}
              </Text>
            </View>
          </View>

          {/* Submitted Documents Row */}
          <View style={styles.docsSection}>
            <View style={styles.docsSectionHeader}>
              <MaterialIcons name="folder-open" size={15} color={colors.onSurfaceVariant} />
              <Text style={styles.docsSectionTitle}>Submitted Documents</Text>
            </View>

            <DocumentPreviewRow
              licenseUrl={v.license_url}
              licenseFilename={v.license_filename}
              insuranceUrl={v.insurance_url}
              insuranceFilename={v.insurance_filename}
            />
          </View>

          {/* Actions */}
          {isPending ? (
            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => doReview('approved')}
                disabled={busy}
                style={({ pressed }) => [styles.btn, styles.btnApprove, pressed && { opacity: 0.85 }]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#00E297" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={17} color="#00E297" />
                    <Text style={styles.btnApproveText}>Approve</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => setShowReject(true)}
                disabled={busy}
                style={({ pressed }) => [styles.btn, styles.btnReject, pressed && { opacity: 0.85 }]}
              >
                <MaterialIcons name="close" size={17} color="#FF6B6B" />
                <Text style={styles.btnRejectText}>Reject</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => doReview('pending')}
                disabled={busy}
                style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && { opacity: 0.7 }]}
              >
                <MaterialIcons name="lock-open" size={16} color={colors.onSurfaceVariant} />
                <Text style={styles.btnGhostText}>Reopen Review</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Reject Reason Modal */}
      <AdminRejectReasonModal
        visible={showReject}
        title="Reject Documents"
        driverName={v.driver_name}
        itemType="Driver License & Insurance"
        loading={busy}
        onClose={() => setShowReject(false)}
        onConfirm={async (note) => {
          setBusy(true);
          try {
            await review.mutateAsync({ id: v.id, status: 'rejected', adminNote: note || undefined });
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }
            setShowReject(false);
          } catch (e: any) {
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            }
          } finally {
            setBusy(false);
          }
        }}
      />

      {confirmConfig && (
        <CustomConfirmModal
          visible={confirmConfig.visible}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText={confirmConfig.confirmText}
          cancelText="Cancel"
          variant={confirmConfig.variant}
          iconName={confirmConfig.iconName}
          loading={busy}
          onClose={() => setConfirmConfig(null)}
          onConfirm={confirmConfig.onConfirm}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  cardActionable: {
    borderColor: 'rgba(244, 195, 0, 0.35)',
  },
  cardResolved: {
    opacity: 0.85,
  },
  actionableIndicator: {
    position: 'absolute',
    left: 0,
    top: '15%',
    bottom: '15%',
    width: 3.5,
    backgroundColor: '#FFE399',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimaryContainer,
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: colors.outline,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  expandedContent: {
    paddingTop: 16,
    gap: 14,
  },
  rejectNoteBox: {
    backgroundColor: 'rgba(255, 180, 171, 0.10)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.3)',
    padding: 14,
    gap: 6,
  },
  rejectNoteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rejectNoteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFB4AB',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rejectNoteText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  reviewedBox: {
    backgroundColor: 'rgba(0, 102, 255, 0.10)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.3)',
    padding: 14,
    gap: 4,
  },
  reviewedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewedTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  reviewedText: {
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#0A0E17',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 12,
  },
  detailItem: {
    width: '46%',
    gap: 4,
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
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  monospace: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11.5,
  },
  docsSection: {
    gap: 10,
  },
  docsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docsSectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  actionsContainer: {
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  btnApprove: {
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderColor: 'rgba(0, 226, 151, 0.30)',
  },
  btnApproveText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#00E297',
  },
  btnReject: {
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderColor: 'rgba(239, 68, 68, 0.28)',
  },
  btnRejectText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  btnGhost: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  btnGhostText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#dfe2ef',
  },
});
