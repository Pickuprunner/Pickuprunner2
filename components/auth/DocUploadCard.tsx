import React from 'react';
import { Pressable, StyleSheet, ActivityIndicator, View, Text } from 'react-native';
import { CheckCircle, Upload } from '@blinkdotnew/mobile-ui';
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
        pressed && !doc.uploading && styles.docCardPressed,
      ]}
    >
      <View style={styles.contentRow}>
        {/* Icon circle */}
        <View
          style={[
            styles.iconCircle,
            hasDoc ? styles.iconCircleDone : styles.iconCircleDefault,
          ]}
        >
          {doc.uploading ? (
            <ActivityIndicator size="small" color={colors.primaryContainer} />
          ) : hasDoc ? (
            <CheckCircle size={24} color={colors.tertiary} />
          ) : (
            icon
          )}
        </View>

        {/* Text info */}
        <View style={styles.textContainer}>
          <Text style={styles.label}>{label}</Text>
          {doc.uploading ? (
            <Text style={styles.uploadingText}>
              Uploading… {doc.progress > 0 ? `${Math.round(doc.progress)}%` : ''}
            </Text>
          ) : hasDoc ? (
            <Text style={styles.doneText} numberOfLines={1}>
              ✓ {doc.name || 'Uploaded'}
            </Text>
          ) : (
            <Text style={styles.description}>{description}</Text>
          )}
        </View>

        {/* Action hint / icon */}
        {!doc.uploading && (
          <View style={styles.actionContainer}>
            {hasDoc ? (
              <View style={styles.replaceBadge}>
                <Text style={styles.replaceText}>Replace</Text>
              </View>
            ) : (
              <Upload size={18} color={colors.outline} />
            )}
          </View>
        )}
      </View>

      {/* Progress bar */}
      {doc.uploading && doc.progress > 0 && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              { width: `${doc.progress}%` },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
}

export default DocUploadCard;

const styles = StyleSheet.create({
  docCard: {
    backgroundColor: colors.glassLevel2Bg,
    borderRadius: borderRadius.DEFAULT,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    padding: spacing.md,
    overflow: 'hidden',
  },
  docCardPressed: {
    backgroundColor: 'rgba(0, 102, 255, 0.08)',
    borderColor: 'rgba(0, 102, 255, 0.35)',
    transform: [{ scale: 0.99 }],
  },
  docCardDone: {
    borderColor: 'rgba(0, 226, 151, 0.35)',
    backgroundColor: 'rgba(0, 226, 151, 0.06)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconCircleDefault: {
    backgroundColor: 'rgba(0, 102, 255, 0.1)',
    borderColor: 'rgba(0, 102, 255, 0.3)',
  },
  iconCircleDone: {
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderColor: 'rgba(0, 226, 151, 0.35)',
  },
  textContainer: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  uploadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryContainer,
  },
  doneText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.tertiary,
  },
  actionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  replaceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: colors.glassLevel2Border,
    borderWidth: 1,
    borderRadius: borderRadius.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  replaceText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.outline,
  },
  progressTrack: {
    marginTop: 10,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primaryContainer,
  },
});

