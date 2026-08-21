import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Platform,
  Animated,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export type ConfirmModalVariant = 'danger' | 'warning' | 'info' | 'success';

export interface CustomConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmModalVariant;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  loading?: boolean;
  orderId?: string;
  dismissOnBackdropPress?: boolean;
}

const VARIANT_CONFIG: Record<
  ConfirmModalVariant,
  {
    icon: keyof typeof MaterialIcons.glyphMap;
    accentColor: string;
    glowBg: string;
    borderColor: string;
    buttonBg: string;
    buttonText: string;
  }
> = {
  danger: {
    icon: 'delete-outline',
    accentColor: '#FF6B6B',
    glowBg: 'rgba(255, 107, 107, 0.14)',
    borderColor: 'rgba(255, 107, 107, 0.35)',
    buttonBg: '#E02424',
    buttonText: '#FFFFFF',
  },
  warning: {
    icon: 'warning-amber',
    accentColor: '#F4C300',
    glowBg: 'rgba(244, 195, 0, 0.14)',
    borderColor: 'rgba(244, 195, 0, 0.35)',
    buttonBg: '#F4C300',
    buttonText: '#0F131C',
  },
  info: {
    icon: 'info-outline',
    accentColor: '#0066FF',
    glowBg: 'rgba(0, 102, 255, 0.14)',
    borderColor: 'rgba(0, 102, 255, 0.35)',
    buttonBg: '#0066FF',
    buttonText: '#FFFFFF',
  },
  success: {
    icon: 'check-circle-outline',
    accentColor: '#00E297',
    glowBg: 'rgba(0, 226, 151, 0.14)',
    borderColor: 'rgba(0, 226, 151, 0.35)',
    buttonBg: '#00E297',
    buttonText: '#0F131C',
  },
};

export function CustomConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Keep It',
  variant = 'danger',
  iconName,
  loading = false,
  orderId,
  dismissOnBackdropPress = true,
}: CustomConfirmModalProps) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.danger;
  const activeIcon = iconName || config.icon;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(
          variant === 'danger'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light
        ).catch(() => { });
      }
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.92,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim, variant]);

  const handleConfirm = () => {
    if (loading) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => { });
    }
    onConfirm();
  };

  const handleCancel = () => {
    if (loading) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => { });
    }
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={dismissOnBackdropPress ? handleCancel : undefined}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  transform: [{ scale: scaleAnim }],
                  borderColor: config.borderColor,
                },
              ]}
            >
              <View style={styles.mainRow}>
                <View style={[styles.iconHalo, { backgroundColor: config.glowBg }]}>
                  <View style={[styles.iconCircle, { borderColor: config.borderColor }]}>
                    <MaterialIcons name={activeIcon} size={32} color={config.accentColor} />
                  </View>
                </View>

                <View style={styles.rightCol}>
                  {orderId && (
                    <View style={styles.orderBadgeRow}>
                      <View style={styles.orderPill}>
                        <View style={[styles.orderPillDot, { backgroundColor: config.accentColor }]} />
                        <Text style={styles.orderPillText}>ORDER #{orderId.slice(-6).toUpperCase()}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.textContainer}>
                    {title ? <Text style={styles.titleText}>{title}</Text> : null}
                    {message ? (
                      <Text style={styles.messageText}>
                        {message}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={handleCancel}
                  disabled={loading}
                  activeOpacity={0.8}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>{cancelText}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleConfirm}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={[
                    styles.confirmBtn,
                    { backgroundColor: config.buttonBg },
                    loading && { opacity: 0.75 },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={config.buttonText} />
                  ) : (
                    <Text style={[styles.confirmBtnText, { color: config.buttonText }]}>
                      {confirmText}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 14, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: Math.min(SCREEN_WIDTH - 36, 350),
    backgroundColor: '#121622',
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 24,
    gap: 14,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  iconHalo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#181D2B',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightCol: {
    flex: 1,
    height: 64,
    justifyContent: 'space-between',
  },
  orderBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  orderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  orderPillDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
  },
  orderPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  textContainer: {
    width: '100%',
    gap: 2,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DFE2EF',
    letterSpacing: -0.2,
  },
  messageText: {
    fontSize: 13,
    color: '#C2C6D8',
    lineHeight: 18.5,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginTop: 2,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DFE2EF',
  },
  confirmBtn: {
    flex: 1.25,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

