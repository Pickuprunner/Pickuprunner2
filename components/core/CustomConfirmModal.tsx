import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  confirmIconName?: keyof typeof MaterialIcons.glyphMap;
  cancelIconName?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  orderId?: string;
  dismissOnBackdropPress?: boolean;
}

const VARIANT_CONFIG: Record<
  ConfirmModalVariant,
  {
    icon: keyof typeof MaterialIcons.glyphMap;
    confirmIcon: keyof typeof MaterialIcons.glyphMap;
    accentColor: string;
    glowBg: string;
    haloBorder: string;
    innerBorder: string;
    buttonBg: string;
    buttonText: string;
  }
> = {
  danger: {
    icon: 'delete-outline',
    confirmIcon: 'delete-outline',
    accentColor: '#EF4444',
    glowBg: 'rgba(239, 68, 68, 0.12)',
    haloBorder: 'rgba(239, 68, 68, 0.25)',
    innerBorder: 'rgba(239, 68, 68, 0.55)',
    buttonBg: '#EF4444',
    buttonText: '#FFFFFF',
  },
  warning: {
    icon: 'warning-amber',
    confirmIcon: 'delete-outline',
    accentColor: '#F59E0B',
    glowBg: 'rgba(245, 158, 11, 0.12)',
    haloBorder: 'rgba(245, 158, 11, 0.25)',
    innerBorder: 'rgba(245, 158, 11, 0.55)',
    buttonBg: '#F59E0B',
    buttonText: '#0F131C',
  },
  info: {
    icon: 'info-outline',
    confirmIcon: 'check',
    accentColor: '#0066FF',
    glowBg: 'rgba(0, 102, 255, 0.12)',
    haloBorder: 'rgba(0, 102, 255, 0.25)',
    innerBorder: 'rgba(0, 102, 255, 0.55)',
    buttonBg: '#0066FF',
    buttonText: '#FFFFFF',
  },
  success: {
    icon: 'check-circle-outline',
    confirmIcon: 'check',
    accentColor: '#00E297',
    glowBg: 'rgba(0, 226, 151, 0.12)',
    haloBorder: 'rgba(0, 226, 151, 0.25)',
    innerBorder: 'rgba(0, 226, 151, 0.55)',
    buttonBg: '#00E297',
    buttonText: '#0F131C',
  },
};

export function CustomConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  message = 'This will remove your order from the live dispatch.',
  confirmText = 'Cancel Pickup',
  cancelText = 'Keep It',
  variant = 'danger',
  iconName,
  confirmIconName,
  cancelIconName = 'bookmark-outline',
  loading = false,
  orderId,
  dismissOnBackdropPress = true,
}: CustomConfirmModalProps) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.danger;
  const activeIcon = iconName || config.icon;
  const activeConfirmIcon = confirmIconName || config.confirmIcon;

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
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.92,
          duration: 140,
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
                },
              ]}
            >
              {/* Top-Right Close 'X' Button */}
              <TouchableOpacity
                onPress={handleCancel}
                style={styles.closeButton}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={19} color="#8C90A1" />
              </TouchableOpacity>

              {/* Main Content Area */}
              <View style={styles.mainRow}>
                {/* Left Side: Glowing Halo Icon */}
                <View
                  style={[
                    styles.iconHalo,
                    {
                      backgroundColor: config.glowBg,
                      borderColor: config.haloBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconInnerCircle,
                      { borderColor: config.innerBorder },
                    ]}
                  >
                    {variant === 'danger' && (!iconName || iconName === 'delete-outline') ? (
                      <Feather
                        name="trash-2"
                        size={26}
                        color={config.accentColor}
                      />
                    ) : (
                      <MaterialIcons
                        name={activeIcon}
                        size={28}
                        color={config.accentColor}
                      />
                    )}
                  </View>
                </View>

                {/* Right Side: Golden Gradient Order Tag & Message */}
                <View style={styles.contentCol}>
                  {orderId ? (
                    <LinearGradient
                      colors={['rgba(244, 195, 0, 0.22)', 'rgba(255, 227, 153, 0.08)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.orderPill}
                    >
                      <View style={styles.orderPillDot} />
                      <Text style={styles.orderPillText}>
                        <Text style={styles.orderPillPrefix}>ORDER </Text>
                        <Text style={styles.orderPillCode}>
                          #{orderId.slice(-6).toUpperCase()}
                        </Text>
                      </Text>
                    </LinearGradient>
                  ) : null}

                  {title ? <Text style={styles.titleText}>{title}</Text> : null}

                  <Text style={styles.messageText}>
                    {message}
                  </Text>
                </View>
              </View>

              {/* Bottom Action Buttons Row */}
              <View style={styles.buttonRow}>
                {/* Keep It (Cancel/Dismiss) Button */}
                <TouchableOpacity
                  onPress={handleCancel}
                  disabled={loading}
                  activeOpacity={0.8}
                  style={styles.cancelBtn}
                >
                  <Ionicons name={cancelIconName} size={17} color="#FFFFFF" />
                  <Text style={styles.cancelBtnText}>{cancelText}</Text>
                </TouchableOpacity>

                {/* Confirm Action Button */}
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
                    <>
                      {variant === 'danger' && (!confirmIconName || confirmIconName === 'delete-outline') ? (
                        <Feather
                          name="trash-2"
                          size={17}
                          color={config.buttonText}
                        />
                      ) : (
                        <MaterialIcons
                          name={activeConfirmIcon}
                          size={18}
                          color={config.buttonText}
                        />
                      )}
                      <Text
                        style={[
                          styles.confirmBtnText,
                          { color: config.buttonText },
                        ]}
                      >
                        {confirmText}
                      </Text>
                    </>
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
    backgroundColor: 'rgba(5, 7, 12, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: Math.min(SCREEN_WIDTH - 32, 385),
    backgroundColor: '#141721',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 24,
    gap: 22,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    paddingRight: 20,
  },
  iconHalo: {
    width: 68,
    height: 68,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconInnerCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#191D2A',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  orderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244, 195, 0, 0.38)',
  },
  orderPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F4C300',
    shadowColor: '#F4C300',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  orderPillText: {
    fontSize: 10.5,
    letterSpacing: 0.5,
  },
  orderPillPrefix: {
    fontWeight: '800',
    fontSize: 10.5,
    color: '#FFE399',
  },
  orderPillCode: {
    fontWeight: '700',
    fontSize: 10.5,
    color: '#FFFFFF',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  messageText: {
    fontSize: 13.5,
    color: '#DFE2EF',
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmBtn: {
    flex: 1.25,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

