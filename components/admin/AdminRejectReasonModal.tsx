import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, spacing } from '@/constants/design';

export interface AdminRejectReasonModalProps {
  visible: boolean;
  title?: string;
  driverName?: string;
  itemType?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}

const QUICK_REASONS = [
  'Expired Document',
  'Blurry / Unreadable',
  'Name Mismatch',
  'Invalid Details',
  'Missing Information',
];

export function AdminRejectReasonModal({
  visible,
  title = 'Reject Submission',
  driverName,
  itemType,
  loading = false,
  onClose,
  onConfirm,
}: AdminRejectReasonModalProps) {
  const [reason, setReason] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);

  const isBusy = loading || internalLoading;

  useEffect(() => {
    if (visible) {
      setReason('');
      setInternalLoading(false);
    }
  }, [visible]);

  const handleChipPress = (preset: string) => {
    if (isBusy) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setReason((prev) => (prev ? `${prev}, ${preset}` : preset));
  };

  const handleConfirm = async () => {
    if (isBusy) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    setInternalLoading(true);
    try {
      await Promise.all([
        Promise.resolve(onConfirm(reason.trim())),
        new Promise((r) => setTimeout(r, 350)),
      ]);
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.scrim} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="cancel" size={22} color="#FF6B6B" />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.title}>{title}</Text>
              {(driverName || itemType) && (
                <Text style={styles.subtitle}>
                  {driverName ? `Driver: ${driverName}` : ''}
                  {driverName && itemType ? ' • ' : ''}
                  {itemType ? itemType : ''}
                </Text>
              )}
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="close" size={20} color={colors.outline} />
            </Pressable>
          </View>

          {/* Quick Reason Chips */}
          <View style={styles.chipsSection}>
            <Text style={styles.sectionLabel}>QUICK REASONS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {QUICK_REASONS.map((chip) => (
                <Pressable
                  key={chip}
                  onPress={() => handleChipPress(chip)}
                  style={({ pressed }) => [
                    styles.chip,
                    reason.includes(chip) && styles.chipActive,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      reason.includes(chip) && styles.chipTextActive,
                    ]}
                  >
                    + {chip}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Input Box */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionLabel}>REJECTION FEEDBACK</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Explain why this submission is being rejected so the driver can resolve it…"
              placeholderTextColor="rgba(194, 198, 216, 0.4)"
              multiline
              numberOfLines={4}
              autoFocus
              style={[
                styles.input,
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
              ]}
            />
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={onClose}
              disabled={isBusy}
              style={({ pressed }) => [
                styles.btn,
                styles.btnCancel,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={isBusy}
              style={({ pressed }) => [
                styles.btn,
                styles.btnConfirm,
                pressed && { opacity: 0.85 },
              ]}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#FF6B6B" />
              ) : (
                <>
                  <MaterialIcons name="close" size={16} color="#FF6B6B" />
                  <Text style={styles.btnConfirmText}>Confirm Rejection</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  scrim: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#0F131E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.outline,
  },
  closeBtn: {
    padding: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipsSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.8,
  },
  chipsScroll: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: '#FF6B6B',
    fontWeight: '700',
  },
  inputSection: {
    gap: 8,
  },
  input: {
    backgroundColor: '#161A26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    color: colors.onSurface,
    fontSize: 13.5,
    minHeight: 88,
    textAlignVertical: 'top',
    lineHeight: 19,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
  },
  btnCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  btnCancelText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#dfe2ef',
  },
  btnConfirm: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.30)',
  },
  btnConfirmText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FF6B6B',
  },
});
