import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import {
  YStack,
  XStack,
  SizableText,
  Card,
  Badge,
  ShieldCheck,
  XCircle,
  CheckCircle,
  Car,
  FileText,
  ExternalLink,
  AlertCircle,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { useAllVerifications, useReviewVerification, type DriverVerification } from '@/lib/verification';
import { APP_CONFIG } from '@/lib/config';
import { colors, spacing, borderRadius } from '@/constants/design';

function relDate(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function DocLink({ label, url, icon }: { label: string; url?: string; icon: React.ReactNode }) {
  if (!url) return null;
  return (
    <Pressable
      onPress={() => url && Linking.openURL(url)}
      style={({ pressed }) => [styles.docLink, pressed && { opacity: 0.7 }]}
    >
      <XStack gap="$2" alignItems="center">
        {icon}
        <SizableText size="$2" fontWeight="600" color="$blue9">{label}</SizableText>
        <ExternalLink size={12} color="$blue9" />
      </XStack>
    </Pressable>
  );
}

function VerificationCard({ v }: { v: DriverVerification }) {
  const review = useReviewVerification();
  const [rejNote, setRejNote] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [resolving, setResolving] = useState(false);

  const isPending = v.status === 'pending';

  const confirm = (action: 'approved' | 'rejected', note?: string) => {
    const msg =
      action === 'approved'
        ? `Approve verification for ${v.driver_name}?`
        : `Reject verification for ${v.driver_name}?${note ? `\n\nReason: ${note}` : ''}`;

    if (Platform.OS === 'web') {
      if (!window.confirm(msg)) return;
      doReview(action, note);
    } else {
      Alert.alert(
        action === 'approved' ? 'Approve Driver' : 'Reject Driver',
        msg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: action === 'approved' ? 'Approve' : 'Reject', style: action === 'rejected' ? 'destructive' : 'default', onPress: () => doReview(action, note) },
        ]
      );
    }
  };

  const doReview = async (action: 'approved' | 'rejected', note?: string) => {
    setResolving(true);
    try {
      await review.mutateAsync({ id: v.id, status: action, adminNote: note });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      setShowRejectInput(false);
      setRejNote('');
    } finally {
      setResolving(false);
    }
  };

  return (
    <Card
      backgroundColor="$color2"
      borderRadius="$4"
      borderWidth={1}
      borderColor={
        v.status === 'approved' ? 'rgba(22,163,74,0.3)' :
          v.status === 'rejected' ? 'rgba(220,38,38,0.3)' :
            '$borderColor'
      }
      padding="$4"
      marginBottom="$3"
    >
      <YStack gap="$3">
        {/* Driver info row */}
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack>
            <SizableText size="$4" fontWeight="700" color="$color12">{v.driver_name}</SizableText>
            <SizableText size="$2" color="$color9">{v.driver_email}</SizableText>
          </YStack>
          <XStack gap="$2" alignItems="center">
            <Badge
              variant={v.status === 'approved' ? 'success' : v.status === 'rejected' ? 'error' : 'warning'}
            >
              {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
            </Badge>
            <SizableText size="$1" color="$color9">{relDate(v.submitted_at)}</SizableText>
          </XStack>
        </XStack>

        {/* Document links */}
        <XStack gap="$3" flexWrap="wrap">
          <DocLink
            label={v.license_filename || "Driver's License"}
            url={v.license_url}
            icon={<Car size={14} color="$blue9" />}
          />
          <DocLink
            label={v.insurance_filename || 'Insurance'}
            url={v.insurance_url}
            icon={<FileText size={14} color="$blue9" />}
          />
        </XStack>

        {/* Admin note (if any) */}
        {v.admin_note && !isPending && (
          <XStack gap="$2" alignItems="flex-start" backgroundColor="$color3" borderRadius="$3" padding="$3">
            <AlertCircle size={14} color="$color9" />
            <SizableText size="$2" color="$color10" flex={1}>{v.admin_note}</SizableText>
          </XStack>
        )}

        {/* Action buttons — only for pending */}
        {isPending && (
          <YStack gap="$2">
            {showRejectInput && (
              <XStack
                backgroundColor="$color3"
                borderRadius={12}
                borderWidth={1}
                borderColor="$color5"
                paddingHorizontal="$3"
                alignItems="center"
              >
                <TextInput
                  value={rejNote}
                  onChangeText={setRejNote}
                  placeholder="Rejection reason (optional)"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.noteInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}]}
                />
              </XStack>
            )}
            <XStack gap="$2">
              {showRejectInput ? (
                <>
                  <Pressable
                    onPress={() => setShowRejectInput(false)}
                    style={({ pressed }) => [styles.actionBtn, styles.actionBtnOutline, pressed && { opacity: 0.7 }]}
                  >
                    <SizableText size="$2" fontWeight="700" color="$color10">Cancel</SizableText>
                  </Pressable>
                  <Pressable
                    onPress={() => confirm('rejected', rejNote.trim() || undefined)}
                    disabled={resolving}
                    style={({ pressed }) => [styles.actionBtn, styles.actionBtnReject, pressed && { opacity: 0.7 }]}
                  >
                    {resolving ? <ActivityIndicator size="small" color="white" /> : (
                      <XStack gap="$1" alignItems="center">
                        <XCircle size={14} color="white" />
                        <SizableText size="$2" fontWeight="700" color="white">Confirm Reject</SizableText>
                      </XStack>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={() => setShowRejectInput(true)}
                    style={({ pressed }) => [styles.actionBtn, styles.actionBtnRejectOutline, pressed && { opacity: 0.7 }]}
                  >
                    <XStack gap="$1" alignItems="center">
                      <XCircle size={14} color="$red9" />
                      <SizableText size="$2" fontWeight="700" color="$red9">Reject</SizableText>
                    </XStack>
                  </Pressable>
                  <Pressable
                    onPress={() => confirm('approved')}
                    disabled={resolving}
                    style={({ pressed }) => [styles.actionBtn, styles.actionBtnApprove, pressed && { opacity: 0.7 }]}
                  >
                    {resolving ? <ActivityIndicator size="small" color="white" /> : (
                      <XStack gap="$1" alignItems="center">
                        <CheckCircle size={14} color="white" />
                        <SizableText size="$2" fontWeight="700" color="white">Approve</SizableText>
                      </XStack>
                    )}
                  </Pressable>
                </>
              )}
            </XStack>
          </YStack>
        )}
      </YStack>
    </Card>
  );
}

export default function AdminVerificationPanel() {
  const { data: all = [] } = useAllVerifications();
  const pending = all.filter((v) => v.status === 'pending');

  if (pending.length === 0) return null;

  return (
    <YStack gap="$3">
      <XStack alignItems="center" gap="$2">
        <SizableText size="$2" fontWeight="700" color="$red10">
          ADMIN — DRIVER VERIFICATIONS
        </SizableText>
        <YStack
          backgroundColor="$red9"
          borderRadius={999}
          width={18}
          height={18}
          alignItems="center"
          justifyContent="center"
        >
          <SizableText size="$1" color="white" fontWeight="800">{pending.length}</SizableText>
        </YStack>
      </XStack>
      <SizableText size="$2" color="$color9">
        Review uploaded documents and approve or reject each driver.
      </SizableText>
      {pending.map((v) => <VerificationCard key={v.id} v={v} />)}
    </YStack>
  );
}

const styles = StyleSheet.create({
  docLink: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    gap: 4,
  },
  actionBtnOutline: {
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  actionBtnRejectOutline: {
    borderColor: colors.error,
    backgroundColor: 'transparent',
  },
  actionBtnReject: {
    borderColor: colors.error,
    backgroundColor: colors.error,
  },
  actionBtnApprove: {
    borderColor: '#16a34a',
    backgroundColor: '#16a34a',
  },
  noteInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: colors.text,
  },
});
