import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  Platform,
  Pressable,
  StyleSheet,
  View,
  Text,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  AlertTriangle,
  ArrowLeft,
  Trash2,
  CheckCircle,
  Shield,
  Package,
  CreditCard,
  Mail,
  User,
} from '@blinkdotnew/mobile-ui';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/apis/users';
import { colors, spacing, borderRadius } from '@/constants/design';
import { useToast } from '@/components/core';
import CustomInput from '@/components/core/CustomInput';
import { APP_CONFIG } from '@/lib/config';

type Step = 'review' | 'confirm' | 'done';

export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const isDriver = user?.role === 'driver';

  const [step, setStep] = useState<Step>('review');
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [conflictReason, setConflictReason] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (step !== 'done') return;

    if (countdown <= 0) {
      router.replace('/(landing)/role-select');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [step, countdown]);

  const handleNext = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setStep('confirm');
  };

  const handleDelete = async () => {
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      showToast('Confirmation Required', {
        type: 'warning',
        description: 'Please type DELETE in the box to confirm.',
      });
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }

    setIsDeleting(true);
    setConflictReason(null);

    try {
      await usersApi.deleteMe();

      showToast('Account Closed', {
        type: 'success',
        description: 'Your account has been deleted successfully.',
      });

      setStep('done');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      await logout();
    } catch (err: any) {
      console.warn('[delete-account] error:', err);
      const isConflict = err?.status === 409;
      const errorMsg =
        err?.data?.error ||
        err?.data?.message ||
        err?.message ||
        'Could not delete account at this time.';

      if (isConflict) {
        setConflictReason(errorMsg);
        showToast('Cannot Delete Account', {
          type: 'warning',
          description: errorMsg,
        });
      } else {
        showToast('Deletion Failed', {
          type: 'error',
          description: errorMsg,
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleHeaderBack = () => {
    if (step === 'confirm') {
      setStep('review');
      setConflictReason(null);
    } else if (step === 'done') {
      router.replace('/(landing)/role-select');
    } else {
      router.back();
    }
  };

  const items = isDriver
    ? [
        {
          icon: <User size={18} color="#EF4444" />,
          label: 'Personal Identity & Profile',
          desc: 'Name, phone, email, credentials and authentication sessions are cleared.',
        },
        {
          icon: <Shield size={18} color="#EF4444" />,
          label: 'Accreditation & Documents',
          desc: 'Driver license, insurance files and background authorizations are removed.',
        },
        {
          icon: <Package size={18} color="#EF4444" />,
          label: 'Orders & Deliveries',
          desc: 'Orders are anonymized. Deletion is blocked if active orders are in progress.',
        },
        {
          icon: <CreditCard size={18} color="#EF4444" />,
          label: 'Payouts & Earnings',
          desc: 'All pending payout transfers must be settled before closing your account.',
        },
      ]
    : [
        {
          icon: <User size={18} color="#EF4444" />,
          label: 'Personal Identity & Profile',
          desc: 'Name, phone, email, saved addresses, and authentication sessions are cleared.',
        },
        {
          icon: <Package size={18} color="#EF4444" />,
          label: 'Orders & Deliveries',
          desc: 'Past order history is anonymized. Deletion is blocked if active orders are in progress.',
        },
        {
          icon: <CreditCard size={18} color="#EF4444" />,
          label: 'Payment Data & Preferences',
          desc: 'Saved payment details, receipts, and account preferences are permanently removed.',
        },
      ];
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(
              insets.top + spacing.xs,
              Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + spacing.xs : spacing.md
            ),
          },
        ]}
      >
        {step !== 'done' && (
          <Pressable onPress={handleHeaderBack} style={styles.headerBtn} hitSlop={10}>
            <ArrowLeft size={20} color={colors.onSurface} />
          </Pressable>
        )}

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Delete Account</Text>
          <Text style={styles.headerSubtitle}>
            {step === 'review'
              ? 'Review impact'
              : step === 'confirm'
              ? 'Permanent confirmation'
              : 'Completed'}
          </Text>
        </View>

        {step !== 'done' ? <View style={{ width: 38 }} /> : null}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 24) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'review' && (
          <View style={styles.contentCol}>
            <View style={styles.warningCard}>
              <View style={styles.warningIconCircle}>
                <AlertTriangle size={32} color="#EF4444" />
              </View>
              <Text style={styles.warningTitle}>Permanent Account Deletion</Text>
              <Text style={styles.warningDesc}>
                {isDriver
                  ? 'Closing your account is permanent. Once completed, your profile, document records, and session data will be permanently wiped.'
                  : 'Closing your account is permanent. Once completed, your profile, order history, and account data will be permanently wiped.'}
              </Text>
            </View>

            <View style={styles.sectionBox}>
              <Text style={styles.sectionBoxTitle}>WHAT WILL BE AFFECTED</Text>
              {items.map((item, i) => (
                <React.Fragment key={item.label}>
                  <View style={styles.affectedRow}>
                    <View style={styles.affectedIconBg}>{item.icon}</View>
                    <View style={styles.affectedContent}>
                      <Text style={styles.affectedLabel}>{item.label}</Text>
                      <Text style={styles.affectedDesc}>{item.desc}</Text>
                    </View>
                  </View>
                  {i < items.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>

            <View style={styles.helpBox}>
              <View style={styles.helpHeaderRow}>
                <Mail size={16} color="#38BDF8" />
                <Text style={styles.helpHeaderTitle}>Need help instead?</Text>
              </View>
              <Text style={styles.helpBodyText}>
                If you are experiencing an issue or need order assistance, contact our support team
                at <Text style={styles.helpHighlight}>{APP_CONFIG.STORE_EMAIL}</Text> before
                closing your account.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleNext}
              style={styles.continueDeleteBtn}
            >
              <Trash2 size={18} color="#FFFFFF" />
              <Text style={styles.continueDeleteBtnText}>Continue to Confirmation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.back()}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>Keep Account</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: CONFIRM */}
        {step === 'confirm' && (
          <View style={styles.contentCol}>
            <View style={styles.dangerConfirmCard}>
              <View style={styles.dangerConfirmIconCircle}>
                <Trash2 size={30} color="#EF4444" />
              </View>
              <Text style={styles.dangerConfirmTitle}>Are you completely sure?</Text>
              <Text style={styles.dangerConfirmSubtitle}>
                This action cannot be undone. To verify your intent, please type{' '}
                <Text style={styles.deleteKeyword}>DELETE</Text> in the field below.
              </Text>
            </View>

            {conflictReason && (
              <View style={styles.conflictCard}>
                <AlertTriangle size={18} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.conflictTitle}>Cannot Delete Right Now</Text>
                  <Text style={styles.conflictDesc}>{conflictReason}</Text>
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <CustomInput
                label="CONFIRMATION KEYWORD"
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder="Type DELETE"
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleDelete}
              disabled={isDeleting || confirmText.trim().toUpperCase() !== 'DELETE'}
              style={[
                styles.finalDeleteBtn,
                (isDeleting || confirmText.trim().toUpperCase() !== 'DELETE') &&
                  styles.finalDeleteBtnDisabled,
              ]}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Trash2 size={18} color="#FFFFFF" />
                  <Text style={styles.finalDeleteBtnText}>Permanently Delete My Account</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setStep('review');
                setConflictReason(null);
              }}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: DONE */}
        {step === 'done' && (
          <View style={[styles.contentCol, { alignItems: 'center', marginTop: 40 }]}>
            <View style={styles.successIconCircle}>
              <CheckCircle size={44} color="#22C55E" />
            </View>

            <Text style={styles.successTitle}>Account Deleted</Text>
            <Text style={styles.successDesc}>
              Your account has been closed and your personal credentials have been removed. Thank
              you for being part of Pickup Runner.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.replace('/(landing)/role-select')}
              style={styles.doneBtn}
            >
              <Text style={styles.doneBtnText}>Return to Welcome Screen ({countdown}s)</Text>
            </TouchableOpacity>
            <Text style={styles.autoRedirectText}>Automatically redirecting in {countdown} seconds...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F131C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(15, 19, 28, 0.98)',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  scroll: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
  },
  contentCol: {
    gap: spacing.md,
  },
  warningCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.22)',
    gap: 8,
  },
  warningIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 4,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  warningDesc: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
  },
  sectionBox: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: 12,
  },
  sectionBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  affectedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  affectedIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  affectedContent: {
    flex: 1,
  },
  affectedLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  affectedDesc: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
  },
  helpBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    gap: 6,
  },
  helpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
  },
  helpBodyText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 17,
  },
  helpHighlight: {
    fontWeight: '700',
    color: '#38BDF8',
  },
  continueDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    marginTop: 6,
  },
  continueDeleteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  dangerConfirmCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    gap: 8,
  },
  dangerConfirmIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 2,
  },
  dangerConfirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.onSurface,
  },
  dangerConfirmSubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  deleteKeyword: {
    fontWeight: '800',
    color: '#EF4444',
  },
  conflictCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  conflictTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  conflictDesc: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 16,
  },
  inputContainer: {
    marginTop: 4,
  },
  finalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    marginTop: 6,
  },
  finalDeleteBtnDisabled: {
    opacity: 0.45,
  },
  finalDeleteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.onSurface,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  doneBtn: {
    backgroundColor: colors.primaryContainer,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimaryContainer,
  },
  autoRedirectText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 12,
  },
});
