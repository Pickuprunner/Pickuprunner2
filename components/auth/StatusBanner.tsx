import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  YStack,
  XStack,
  SizableText,
  ShieldCheck,
  Clock,
  XCircle,
} from '@blinkdotnew/mobile-ui';
import { APP_CONFIG } from '@/lib/config';
import { borderRadius } from '@/constants/design';

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
      <YStack
        backgroundColor="$green2"
        borderRadius="$4"
        borderWidth={1}
        borderColor="$green5"
        padding="$4"
        gap="$2"
      >
        <XStack gap="$3" alignItems="center">
          <ShieldCheck size={28} color="$green9" />
          <YStack flex={1}>
            <SizableText size="$5" fontWeight="800" color="$green10">
              Verification Approved ✓
            </SizableText>
            <SizableText size="$2" color="$green9">
              Your account is fully verified. You can accept deliveries.
            </SizableText>
          </YStack>
        </XStack>
      </YStack>
    );
  }

  if (status === 'pending' || status === 'in_review') {
    return (
      <YStack
        backgroundColor="$amber2"
        borderRadius="$4"
        borderWidth={1}
        borderColor="$amber5"
        padding="$4"
        gap="$2"
      >
        <XStack gap="$3" alignItems="center">
          <Clock size={28} color="$amber9" />
          <YStack flex={1}>
            <SizableText size="$5" fontWeight="800" color="$amber10">
              {status === 'in_review' ? 'Check In Progress' : 'Under Review'}
            </SizableText>
            <SizableText size="$2" color="$amber9">
              Your submission is being reviewed by the admin. This usually takes less than 24 hours.
            </SizableText>
          </YStack>
        </XStack>
        {externalRef && (
          <XStack gap="$2" alignItems="center" marginTop="$1">
            <SizableText size="$1" color="$color9" fontWeight="600">
              REFERENCE ID
            </SizableText>
            <SizableText size="$2" fontWeight="700" color="$color11">
              {externalRef}
            </SizableText>
          </XStack>
        )}
      </YStack>
    );
  }

  // Rejected
  return (
    <YStack
      backgroundColor="$red2"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$red5"
      padding="$4"
      gap="$3"
    >
      <XStack gap="$3" alignItems="center">
        <XCircle size={28} color="$red9" />
        <YStack flex={1}>
          <SizableText size="$5" fontWeight="800" color="$red10">
            Verification Rejected
          </SizableText>
          <SizableText size="$2" color="$red9">
            {adminNote || 'Please re-upload clearer documents and resubmit.'}
          </SizableText>
        </YStack>
      </XStack>
      {onResubmit && (
        <Pressable
          onPress={onResubmit}
          style={({ pressed }) => [styles.resubmitBtn, pressed && { opacity: 0.8 }]}
        >
          <SizableText size="$3" fontWeight="700" color="white">
            {resubmitLabel}
          </SizableText>
        </Pressable>
      )}
    </YStack>
  );
}

export default StatusBanner;

const styles = StyleSheet.create({
  resubmitBtn: {
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: APP_CONFIG.PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
