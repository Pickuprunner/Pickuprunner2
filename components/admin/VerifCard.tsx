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
  XCircle,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  CreditCard,
  Clock,
  DollarSign,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { useReviewVerification, useDriverProfile, type DriverVerification } from '@/lib/verification';
import { DocumentPreviewRow } from '@/components/DocumentViewer';
import { colors, spacing, borderRadius } from '@/constants/design';

function relDate(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function joinDate(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
}

/** Info pill for driver profile details */
function InfoPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <XStack
      gap="$1"
      alignItems="center"
      backgroundColor="$color3"
      borderRadius={8}
      paddingHorizontal={8}
      paddingVertical={4}
      borderWidth={1}
      borderColor="$color5"
    >
      {icon}
      <SizableText size="$1" color="$color10">{label}:</SizableText>
      <SizableText size="$1" fontWeight="600" color="$color12" numberOfLines={1}>
        {value}
      </SizableText>
    </XStack>
  );
}

export default function VerifCard({ v }: { v: DriverVerification }) {
  const review = useReviewVerification();
  const { data: profile } = useDriverProfile(v.user_id);
  const [rejNote, setRejNote] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const isPending = v.status === 'pending';

  const doReview = async (action: 'approved' | 'rejected', note?: string) => {
    const msg = action === 'approved'
      ? `Approve docs for ${v.driver_name}?`
      : `Reject docs for ${v.driver_name}?${note ? `\n\nReason: ${note}` : ''}`;
    const run = async () => {
      setBusy(true);
      try {
        await review.mutateAsync({ id: v.id, status: action, adminNote: note });
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setShowReject(false); setRejNote('');
      } finally { setBusy(false); }
    };
    if (Platform.OS === 'web') { if (window.confirm(msg)) run(); }
    else Alert.alert(action === 'approved' ? 'Approve' : 'Reject', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: action === 'approved' ? 'Approve' : 'Reject', style: action === 'rejected' ? 'destructive' : 'default', onPress: run },
    ]);
  };

  return (
    <Card
      backgroundColor="$color2" borderRadius="$4" borderWidth={1} padding="$4" marginBottom="$3"
      borderColor={v.status === 'approved' ? 'rgba(22,163,74,0.3)' : v.status === 'rejected' ? 'rgba(220,38,38,0.3)' : '$borderColor'}
    >
      <YStack gap="$3">
        {/* Driver info header */}
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} marginRight="$2">
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

        {/* Driver profile details (collapsible) */}
        {profile && (
          <Pressable onPress={() => setShowProfile((s) => !s)} hitSlop={6}>
            <XStack gap="$1" alignItems="center">
              <User size={12} color="$color9" />
              <SizableText size="$1" color="$blue9" fontWeight="600">
                {showProfile ? 'Hide profile' : 'View profile'}
              </SizableText>
            </XStack>
          </Pressable>
        )}
        {profile && showProfile && (
          <XStack gap="$2" flexWrap="wrap">
            <InfoPill
              icon={<Phone size={10} color="$color9" />}
              label="Phone"
              value={profile.phone || 'Not provided'}
            />
            <InfoPill
              icon={<Clock size={10} color="$color9" />}
              label="Joined"
              value={joinDate(profile.createdAt)}
            />
            <InfoPill
              icon={<User size={10} color="$color9" />}
              label="Role"
              value={profile.role || 'N/A'}
            />
            {profile.stripeAccountId && (
              <InfoPill
                icon={<CreditCard size={10} color="$green9" />}
                label="Stripe"
                value={profile.stripeAccountId.slice(0, 14) + '...'}
              />
            )}
          </XStack>
        )}

        {/* Document image previews */}
        <YStack gap="$1">
          <SizableText size="$1" fontWeight="700" color="$color9" letterSpacing={0.3}>
            UPLOADED DOCUMENTS
          </SizableText>
          <DocumentPreviewRow
            licenseUrl={v.license_url}
            licenseFilename={v.license_filename}
            insuranceUrl={v.insurance_url}
            insuranceFilename={v.insurance_filename}
          />
        </YStack>

        {/* Admin note */}
        {v.admin_note && (
          <XStack gap="$2" alignItems="flex-start" backgroundColor="$color3" borderRadius="$3" padding="$3">
            <AlertCircle size={14} color="$color9" />
            <SizableText size="$2" color="$color10" flex={1}>{v.admin_note}</SizableText>
          </XStack>
        )}

        {/* Pending actions */}
        {isPending && (
          <YStack gap="$2">
            {showReject && (
              <XStack backgroundColor="$color3" borderRadius={12} borderWidth={1} borderColor="$color5" paddingHorizontal="$3" alignItems="center">
                <TextInput value={rejNote} onChangeText={setRejNote}
                  placeholder="Rejection reason (optional)" placeholderTextColor={colors.textTertiary}
                  style={[cardStyles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}]} />
              </XStack>
            )}
            <XStack gap="$2">
              {showReject ? (
                <>
                  <Pressable onPress={() => setShowReject(false)}
                    style={({ pressed }) => [cardStyles.btn, cardStyles.btnOutline, pressed && { opacity: 0.7 }]}>
                    <SizableText size="$2" fontWeight="700" color="$color10">Cancel</SizableText>
                  </Pressable>
                  <Pressable onPress={() => doReview('rejected', rejNote.trim() || undefined)} disabled={busy}
                    style={({ pressed }) => [cardStyles.btn, cardStyles.btnReject, pressed && { opacity: 0.7 }]}>
                    {busy ? <ActivityIndicator size="small" color="white" /> : (
                      <XStack gap="$1" alignItems="center">
                        <XCircle size={14} color="white" />
                        <SizableText size="$2" fontWeight="700" color="white">Confirm Reject</SizableText>
                      </XStack>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={() => setShowReject(true)}
                    style={({ pressed }) => [cardStyles.btn, cardStyles.btnRejectOutline, pressed && { opacity: 0.7 }]}>
                    <XStack gap="$1" alignItems="center">
                      <XCircle size={14} color="$red9" />
                      <SizableText size="$2" fontWeight="700" color="$red9">Reject</SizableText>
                    </XStack>
                  </Pressable>
                  <Pressable onPress={() => doReview('approved')} disabled={busy}
                    style={({ pressed }) => [cardStyles.btn, cardStyles.btnApprove, pressed && { opacity: 0.7 }]}>
                    {busy ? <ActivityIndicator size="small" color="white" /> : (
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

const cardStyles = StyleSheet.create({
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
  btnOutline: { borderColor: colors.border, backgroundColor: 'transparent' },
  btnRejectOutline: { borderColor: colors.error, backgroundColor: 'transparent' },
  btnReject: { borderColor: colors.error, backgroundColor: colors.error },
  btnApprove: { borderColor: '#16a34a', backgroundColor: '#16a34a' },
  input: { flex: 1, height: 44, fontSize: 14, color: colors.text },
});
