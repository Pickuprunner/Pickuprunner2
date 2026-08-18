import React from 'react';
import { Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import {
  YStack,
  XStack,
  SizableText,
  CheckCircle,
  Upload,
} from '@blinkdotnew/mobile-ui';
import { APP_CONFIG } from '@/lib/config';
import { colors, spacing, borderRadius } from '@/constants/design';

export interface DocState {
  uri: string | null;
  name: string;
  uploading: boolean;
  publicUrl: string | null;
  progress: number;
}

interface DocUploadCardProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  doc: DocState;
  onPick: () => void;
}

export function DocUploadCard({
  label,
  description,
  icon,
  doc,
  onPick,
}: DocUploadCardProps) {
  const hasDoc = !!doc.publicUrl;

  return (
    <Pressable
      onPress={onPick}
      disabled={doc.uploading}
      style={({ pressed }) => [
        styles.docCard,
        hasDoc && styles.docCardDone,
        pressed && !doc.uploading && { opacity: 0.85 },
      ]}
    >
      <XStack gap="$4" alignItems="center">
        {/* Icon circle */}
        <YStack
          width={52}
          height={52}
          borderRadius={26}
          backgroundColor={
            hasDoc ? 'rgba(22,163,74,0.12)' : 'rgba(0,102,255,0.08)'
          }
          alignItems="center"
          justifyContent="center"
          borderWidth={1.5}
          borderColor={
            hasDoc ? 'rgba(22,163,74,0.35)' : 'rgba(0,102,255,0.25)'
          }
        >
          {doc.uploading ? (
            <ActivityIndicator size="small" color={APP_CONFIG.PRIMARY_COLOR} />
          ) : hasDoc ? (
            <CheckCircle size={26} color="$green9" />
          ) : (
            icon
          )}
        </YStack>

        {/* Text */}
        <YStack flex={1} gap="$0">
          <SizableText size="$4" fontWeight="700" color="$color12">
            {label}
          </SizableText>
          {doc.uploading ? (
            <SizableText size="$2" color="$amber9">
              Uploading… {doc.progress > 0 ? `${Math.round(doc.progress)}%` : ''}
            </SizableText>
          ) : hasDoc ? (
            <SizableText size="$2" color="$green9" numberOfLines={1}>
              ✓ {doc.name || 'Uploaded'}
            </SizableText>
          ) : (
            <SizableText size="$2" color="$color10">
              {description}
            </SizableText>
          )}
        </YStack>

        {/* Arrow / replace hint */}
        {!doc.uploading && (
          <YStack alignItems="center" gap="$0">
            {hasDoc ? (
              <SizableText size="$1" color="$color9">
                Replace
              </SizableText>
            ) : (
              <Upload size={18} color="$color9" />
            )}
          </YStack>
        )}
      </XStack>

      {/* Progress bar */}
      {doc.uploading && doc.progress > 0 && (
        <YStack marginTop="$2" height={3} backgroundColor="$color4" borderRadius={2}>
          <YStack
            height={3}
            borderRadius={2}
            backgroundColor={APP_CONFIG.PRIMARY_COLOR}
            width={`${doc.progress}%` as any}
          />
        </YStack>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  docCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.DEFAULT,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  docCardDone: {
    borderColor: 'rgba(22,163,74,0.4)',
    backgroundColor: 'rgba(22,163,74,0.04)',
  },
});
