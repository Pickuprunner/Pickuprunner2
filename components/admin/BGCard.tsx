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
import {
  useReviewBackgroundCheck,
  type BackgroundCheck,
} from '@/lib/backgroundCheck';
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

export default function BGCard({ check }: { check: BackgroundCheck }) {
  const review = useReviewBackgroundCheck();
  const [open, setOpen] = useState(check.status === 'pending' || check.status === 'in_review');
  const [note, setNote] = useState(check.admin_note ?? '');
  const [ref, setRef] = useState(check.external_ref ?? '');
  const [showReject, setShowReject] = useState(false);
  const [rejReason, setRejReason] = useState('');
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

  const isPending = check.status === 'pending';
  const isInReview = check.status === 'in_review';
  const isApproved = check.status === 'approved';
  const isRejected = check.status === 'rejected';
  const isResolved = isApproved || isRejected;
  const isActionable = isPending || isInReview;

  const statusColor = isApproved
    ? '#00E297'
    : isRejected
    ? '#FFB4AB'
    : isInReview
    ? '#B3C5FF'
    : '#FFE399';
  const statusBg = isApproved
    ? 'rgba(0, 226, 151, 0.12)'
    : isRejected
    ? 'rgba(255, 180, 171, 0.12)'
    : isInReview
    ? 'rgba(0, 102, 255, 0.12)'
    : 'rgba(244, 195, 0, 0.12)';
  const statusBorder = isApproved
    ? 'rgba(0, 226, 151, 0.35)'
    : isRejected
    ? 'rgba(255, 180, 171, 0.35)'
    : isInReview
    ? 'rgba(0, 102, 255, 0.35)'
    : 'rgba(244, 195, 0, 0.35)';
  const statusIcon: keyof typeof MaterialIcons.glyphMap = isApproved
    ? 'check-circle'
    : isRejected
    ? 'cancel'
    : isInReview
    ? 'manage-search'
    : 'hourglass-top';

  const initials = (check.driver_name || 'D')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const doReview = (status: 'pending' | 'in_review' | 'approved' | 'rejected', reasonText?: string) => {
    const isApprove = status === 'approved';
    const isReject = status === 'rejected';
    const isReview = status === 'in_review';

    setConfirmConfig({
      visible: true,
      title: isApprove
        ? 'Approve Background Check'
        : isReject
        ? 'Reject Background Check'
        : isReview
        ? 'Mark In Review'
        : 'Reopen Background Check',
      message: isApprove
        ? `Are you sure you want to approve the background check for ${check.driver_name}?`
        : isReject
        ? `Are you sure you want to reject the background check for ${check.driver_name}?`
        : isReview
        ? `Mark background check for ${check.driver_name} as currently in review?`
        : `Reopen background check review for ${check.driver_name}?`,
      confirmText: isApprove ? 'Approve' : isReject ? 'Reject' : isReview ? 'Mark In Review' : 'Reopen',
      variant: isApprove ? 'success' : isReject ? 'danger' : 'info',
      iconName: isApprove ? 'verified-user' : isReject ? 'cancel' : isReview ? 'manage-search' : 'lock-open',
      onConfirm: async () => {
        setBusy(true);
        try {
          await review.mutateAsync({
            id: check.id,
            status,
            adminNote: reasonText || note.trim() || undefined,
            externalRef: ref.trim() || undefined,
          });
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
          setShowReject(false);
          setRejReason('');
          setConfirmConfig(null);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const saveRef = async () => {
    setBusy(true);
    try {
      await review.mutateAsync({
        id: check.id,
        status: check.status,
        externalRef: ref.trim(),
      });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, !isResolved ? styles.cardActionable : styles.cardResolved]}>
      {/* Card Header */}
      <Pressable onPress={() => setOpen((prev) => !prev)} style={styles.headerRow}>
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
              {check.driver_name}
            </Text>
            <View style={styles.timeRow}>
              <MaterialIcons name="schedule" size={13} color={colors.outline} />
              <Text style={styles.timeText} numberOfLines={1}>
                Submitted {relDate(check.submitted_at)} · {check.driver_email || '—'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.statusTag, { backgroundColor: statusBg, borderColor: statusBorder }]}>
            <MaterialIcons name={statusIcon} size={13} color={statusColor} />
            <Text style={[styles.statusTagText, { color: statusColor }]}>
              {check.status === 'in_review'
                ? 'In Review'
                : check.status.charAt(0).toUpperCase() + check.status.slice(1)}
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
          {/* FCRA Grid */}
          <View style={styles.fcraGrid}>
            <View style={styles.fcraItem}>
              <View style={styles.fcraLabelRow}>
                <MaterialIcons name="cake" size={13} color={colors.outline} />
                <Text style={styles.fcraLabel}>DATE OF BIRTH</Text>
              </View>
              <Text style={styles.fcraValue}>{check.date_of_birth || '—'}</Text>
            </View>

            <View style={styles.fcraItem}>
              <View style={styles.fcraLabelRow}>
                <MaterialIcons name="lock" size={13} color={colors.outline} />
                <Text style={styles.fcraLabel}>SSN (LAST 4)</Text>
              </View>
              <Text style={styles.fcraValue}>•••• {check.ssn_last4 || '••••'}</Text>
            </View>

            <View style={[styles.fcraItem, styles.fcraItemFull]}>
              <View style={styles.fcraLabelRow}>
                <MaterialIcons name="home" size={13} color={colors.outline} />
                <Text style={styles.fcraLabel}>RESIDENTIAL ADDRESS</Text>
              </View>
              <Text style={styles.fcraValue}>{check.address || '—'}</Text>
              <Text style={styles.fcraSubValue}>
                {check.city}, {check.state} {check.zip}
              </Text>
            </View>
          </View>

          {/* Rejection Note if rejected */}
          {isRejected && (check.admin_note || check.rejection_reason) && (
            <View style={styles.rejectNoteBox}>
              <View style={styles.rejectNoteTitleRow}>
                <MaterialIcons name="block" size={14} color="#FFB4AB" />
                <Text style={styles.rejectNoteTitle}>Rejection Reason</Text>
              </View>
              <Text style={styles.rejectNoteText}>
                {check.admin_note || check.rejection_reason}
              </Text>
            </View>
          )}

          {/* Admin Note if present and not rejected */}
          {!isRejected && check.admin_note ? (
            <View style={styles.adminNoteBox}>
              <View style={styles.adminNoteTitleRow}>
                <MaterialIcons name="notes" size={14} color={colors.primary} />
                <Text style={styles.adminNoteTitle}>Admin Note</Text>
              </View>
              <Text style={styles.adminNoteText}>{check.admin_note}</Text>
            </View>
          ) : null}

          {/* Screening Reference Row */}
          <View style={styles.refRow}>
            <TextInput
              value={ref}
              onChangeText={setRef}
              placeholder="Screening Ref ID (e.g. Checkr Case ID)"
              placeholderTextColor="rgba(194, 198, 216, 0.4)"
              autoCapitalize="none"
              style={[
                styles.refInput,
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
              ]}
            />
            <Pressable
              onPress={saveRef}
              disabled={busy}
              style={({ pressed }) => [styles.btnGhostRef, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.btnGhostRefText}>{isResolved ? 'Update' : 'Save'}</Text>
            </Pressable>
          </View>

          {/* Actions */}
          {isActionable ? (
            <View style={styles.actionsRow}>
              {!isInReview && (
                <Pressable
                  onPress={() => doReview('in_review')}
                  disabled={busy}
                  style={({ pressed }) => [styles.btn, styles.btnReview, pressed && { opacity: 0.7 }]}
                >
                  <MaterialIcons name="manage-search" size={17} color="#3B82F6" />
                  <Text style={styles.btnReviewText}>In Review</Text>
                </Pressable>
              )}

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
        title="Reject Background Check"
        driverName={check.driver_name}
        itemType={check.external_ref ? `Ref: ${check.external_ref}` : 'Background Check'}
        loading={busy}
        onClose={() => setShowReject(false)}
        onConfirm={async (note) => {
          setBusy(true);
          try {
            await review.mutateAsync({ id: check.id, status: 'rejected', adminNote: note || undefined });
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
  fcraGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fcraItem: {
    width: '48%',
    backgroundColor: '#0A0E17',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 4,
  },
  fcraItemFull: {
    width: '100%',
  },
  fcraLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fcraLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.5,
  },
  fcraValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  fcraSubValue: {
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
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
  adminNoteBox: {
    backgroundColor: 'rgba(0, 102, 255, 0.10)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.3)',
    padding: 14,
    gap: 4,
  },
  adminNoteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminNoteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  adminNoteText: {
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
  },
  refRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  refInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#0A0E17',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    color: colors.onSurface,
    fontSize: 13,
  },
  btnGhostRef: {
    height: 42,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostRefText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  actionsContainer: {
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  btnReview: {
    backgroundColor: 'rgba(0, 102, 255, 0.12)',
    borderColor: 'rgba(0, 102, 255, 0.30)',
  },
  btnReviewText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B82F6',
  },
  btnApprove: {
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderColor: 'rgba(0, 226, 151, 0.30)',
  },
  btnApproveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00E297',
  },
  btnReject: {
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderColor: 'rgba(239, 68, 68, 0.28)',
  },
  btnRejectText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  btnGhost: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dfe2ef',
  },
});
