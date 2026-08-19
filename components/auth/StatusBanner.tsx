import React from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { ShieldCheck, Clock, XCircle } from '@blinkdotnew/mobile-ui';
import { colors, borderRadius, spacing } from '@/constants/design';

interface StatusBannerProps {
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  adminNote?: string;
  externalRef?: string;
  onResubmit?: () => void;
  resubmitLabel?: string;
}

export function StatusBanner({
  status,
  adminNote,
  externalRef,
  onResubmit,
  resubmitLabel = 'Resubmit Documents',
}: StatusBannerProps) {
  if (status === 'approved') {
    return (
      <View style={[styles.banner, styles.bannerApproved]}>
        <View style={styles.contentRow}>
          <View style={[styles.iconCircle, styles.iconCircleApproved]}>
            <ShieldCheck size={24} color={colors.tertiary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.tertiary }]}>
              Verification Approved ✓
            </Text>
            <Text style={styles.subtitle}>
              Your account is fully verified. You can accept deliveries.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (status === 'pending' || status === 'in_review') {
    return (
      <View style={[styles.banner, styles.bannerPending]}>
        <View style={styles.contentRow}>
          <View style={[styles.iconCircle, styles.iconCirclePending]}>
            <Clock size={24} color={colors.secondaryContainer} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.secondary }]}>
              {status === 'in_review' ? 'Check In Progress' : 'Under Review'}
            </Text>
            <Text style={styles.subtitle}>
              Your submission is being reviewed by the admin. This usually takes less than 24 hours.
            </Text>
          </View>
        </View>
        {externalRef && (
          <View style={styles.refRow}>
            <Text style={styles.refLabel}>REFERENCE ID</Text>
            <Text style={styles.refValue}>{externalRef}</Text>
          </View>
        )}
      </View>
    );
  }

  // Rejected
  return (
    <View style={[styles.banner, styles.bannerRejected]}>
      <View style={styles.contentRow}>
        <View style={[styles.iconCircle, styles.iconCircleRejected]}>
          <XCircle size={24} color={colors.error} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.error }]}>
            Verification Rejected
          </Text>
          <Text style={styles.subtitle}>
            {adminNote || 'Please re-upload clearer documents and resubmit.'}
          </Text>
        </View>
      </View>
      {onResubmit && (
        <Pressable
          onPress={onResubmit}
          style={({ pressed }) => [styles.resubmitBtn, pressed && styles.resubmitBtnPressed]}
        >
          <Text style={styles.resubmitBtnText}>{resubmitLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default StatusBanner;

const styles = StyleSheet.create({
  banner: {
    borderRadius: borderRadius.DEFAULT,
    borderWidth: 1,
    padding: spacing.md,
    gap: 12,
  },
  bannerApproved: {
    backgroundColor: 'rgba(0, 226, 151, 0.08)',
    borderColor: 'rgba(0, 226, 151, 0.3)',
  },
  bannerPending: {
    backgroundColor: 'rgba(244, 195, 0, 0.08)',
    borderColor: 'rgba(244, 195, 0, 0.3)',
  },
  bannerRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconCircleApproved: {
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderColor: 'rgba(0, 226, 151, 0.35)',
  },
  iconCirclePending: {
    backgroundColor: 'rgba(244, 195, 0, 0.12)',
    borderColor: 'rgba(244, 195, 0, 0.35)',
  },
  iconCircleRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  textContainer: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  refLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.5,
  },
  refValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
  },
  resubmitBtn: {
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resubmitBtnPressed: {
    backgroundColor: 'rgba(0, 102, 255, 0.85)',
    transform: [{ scale: 0.98 }],
  },
  resubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimaryContainer,
  },
});

