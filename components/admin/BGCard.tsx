import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import {
  YStack,
  XStack,
  SizableText,
  Card,
  Badge,
  Shield,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Search,
  AlertCircle,
  Clock,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import {
  useReviewBackgroundCheck,
  type BackgroundCheck,
} from '@/lib/backgroundCheck';
import { colors, spacing, borderRadius } from '@/constants/design';

function relDate(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_BADGE: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
  pending: 'warning', in_review: 'info', approved: 'success', rejected: 'error',
};

export default function BGCard({ check }: { check: BackgroundCheck }) {
  const review = useReviewBackgroundCheck();
  const [note, setNote] = useState(check.admin_note ?? '');
  const [ref, setRef] = useState(check.external_ref ?? '');
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  const isPending = check.status === 'pending' || check.status === 'in_review';

  const doReview = async (status: 'in_review' | 'approved' | 'rejected') => {
    const labels = { in_review: 'Mark In Review', approved: 'Approve', rejected: 'Reject' };
    const msg = status === 'approved'
      ? `Approve background check for ${check.driver_name}?`
      : status === 'rejected'
      ? `Reject for ${check.driver_name}?${note ? `\n\nReason: ${note}` : ''}`
      : `Mark ${check.driver_name} as In Review?`;
    const run = async () => {
      setBusy(true);
      try {
        await review.mutateAsync({ id: check.id, status, adminNote: note.trim() || undefined, externalRef: ref.trim() || undefined });
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setExpanded(false);
      } finally { setBusy(false); }
    };
    if (Platform.OS === 'web') { if (window.confirm(msg)) run(); }
    else Alert.alert(labels[status], msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: labels[status], style: status === 'rejected' ? 'destructive' : 'default', onPress: run },
    ]);
  };

  return (
    <Card
      backgroundColor="$color2" borderRadius="$4" borderWidth={1} padding="$4" marginBottom="$3"
      borderColor={check.status === 'approved' ? 'rgba(22,163,74,0.3)' : check.status === 'rejected' ? 'rgba(220,38,38,0.3)' : '$borderColor'}
    >
      <YStack gap="$3">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} marginRight="$2">
            <SizableText size="$4" fontWeight="700" color="$color12">{check.driver_name}</SizableText>
            <SizableText size="$2" color="$color9">{check.driver_email}</SizableText>
          </YStack>
          <XStack gap="$2" alignItems="center">
            <Badge
              variant={STATUS_BADGE[check.status] ?? 'warning'}
            >
              {check.status.replace('_', ' ').charAt(0).toUpperCase() + check.status.replace('_', ' ').slice(1)}
            </Badge>
            <SizableText size="$1" color="$color9">{relDate(check.submitted_at)}</SizableText>
          </XStack>
        </XStack>

        <XStack gap="$4" flexWrap="wrap">
          <YStack>
            <SizableText size="$1" color="$color9" fontWeight="600">DOB</SizableText>
            <SizableText size="$2" fontWeight="600" color="$color11">{check.date_of_birth}</SizableText>
          </YStack>
          <YStack>
            <SizableText size="$1" color="$color9" fontWeight="600">SSN LAST 4</SizableText>
            <SizableText size="$2" fontWeight="600" color="$color11">{'\u2022'.repeat(4)}{check.ssn_last4}</SizableText>
          </YStack>
          <YStack flex={1}>
            <SizableText size="$1" color="$color9" fontWeight="600">ADDRESS</SizableText>
            <SizableText size="$2" color="$color11" numberOfLines={1}>
              {check.address}, {check.city}, {check.state} {check.zip}
            </SizableText>
          </YStack>
        </XStack>

        {check.admin_note && !expanded && (
          <XStack gap="$2" alignItems="flex-start" backgroundColor="$color3" borderRadius="$3" padding="$3">
            <AlertCircle size={14} color="$color9" />
            <SizableText size="$2" color="$color10" flex={1}>{check.admin_note}</SizableText>
          </XStack>
        )}
        {check.external_ref && !expanded && (
          <XStack gap="$2" alignItems="center">
            <SizableText size="$1" color="$color9" fontWeight="600">REF ID</SizableText>
            <SizableText size="$2" color="$color11">{check.external_ref}</SizableText>
          </XStack>
        )}

        {!isPending && (
          <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8}>
            <SizableText size="$2" color="$blue9" fontWeight="600">
              {expanded ? 'Hide actions' : 'Edit status / note'}
            </SizableText>
          </Pressable>
        )}

        {(isPending || expanded) && (
          <YStack gap="$2">
            <YStack gap="$1">
              <SizableText size="$1" fontWeight="700" color="$color9">SCREENING REFERENCE ID (optional)</SizableText>
              <XStack backgroundColor="$color3" borderRadius={12} borderWidth={1} borderColor="$color5"
                paddingHorizontal="$3" alignItems="center" gap="$2">
                <Search size={14} color="$color9" />
                <TextInput value={ref} onChangeText={setRef}
                  placeholder="e.g. CHKR-12345 or Sterling case ID" placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  style={[styles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}]} />
              </XStack>
            </YStack>
            <YStack gap="$1">
              <SizableText size="$1" fontWeight="700" color="$color9">ADMIN NOTE (shown to driver if rejected)</SizableText>
              <XStack backgroundColor="$color3" borderRadius={12} borderWidth={1} borderColor="$color5"
                paddingHorizontal="$3" paddingVertical="$2">
                <TextInput value={note} onChangeText={setNote}
                  placeholder="Reason for rejection or internal note..." placeholderTextColor={colors.textTertiary}
                  multiline numberOfLines={2}
                  style={[styles.input, styles.inputMulti, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}]} />
              </XStack>
            </YStack>
            <XStack gap="$2">
              {check.status !== 'in_review' && (
                <Pressable onPress={() => doReview('in_review')} disabled={busy}
                  style={({ pressed }) => [styles.btn, styles.btnReview, pressed && { opacity: 0.7 }]}>
                  <Clock size={13} color="$blue9" />
                  <SizableText size="$2" fontWeight="700" color="$blue9"> In Review</SizableText>
                </Pressable>
              )}
              <Pressable onPress={() => doReview('rejected')} disabled={busy}
                style={({ pressed }) => [styles.btn, styles.btnReject, pressed && { opacity: 0.7 }]}>
                <XCircle size={13} color="white" />
                <SizableText size="$2" fontWeight="700" color="white"> Reject</SizableText>
              </Pressable>
              <Pressable onPress={() => doReview('approved')} disabled={busy}
                style={({ pressed }) => [styles.btn, styles.btnApprove, pressed && { opacity: 0.7 }]}>
                {busy ? <ActivityIndicator size="small" color="white" /> : (
                  <><ShieldCheck size={13} color="white" /><SizableText size="$2" fontWeight="700" color="white"> Approve</SizableText></>
                )}
              </Pressable>
            </XStack>
          </YStack>
        )}
      </YStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  input: { flex: 1, height: 44, fontSize: 14, color: colors.text },
  inputMulti: { height: 64, textAlignVertical: 'top', paddingTop: 4 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    gap: 3,
  },
  btnReview: { borderColor: 'rgba(59,130,246,0.5)', backgroundColor: 'rgba(59,130,246,0.08)' },
  btnReject: { borderColor: colors.error, backgroundColor: colors.error },
  btnApprove: { borderColor: '#16a34a', backgroundColor: '#16a34a' },
});
