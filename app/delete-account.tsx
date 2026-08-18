import React, { useState } from 'react';
import {
  ScrollView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import {
  YStack,
  XStack,
  SizableText,
  SafeArea,
  AlertTriangle,
  ChevronLeft,
  Trash2,
  CheckCircle,
  Spinner,
  Shield,
  Package,
  FileText,
  User,
  CreditCard,
  Mail,
} from '@blinkdotnew/mobile-ui';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blink } from '@/lib/blink';
import { useAuth } from '@/hooks/useAuth';
import { colors, spacing, borderRadius } from '@/constants/design';
import { APP_CONFIG } from '@/lib/config';

type Step = 'review' | 'confirm' | 'deleting' | 'done';

export default function DeleteAccountScreen() {
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>('review');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  const handleNext = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setStep('confirm');
  };

  const handleDelete = async () => {
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      setError('Please type DELETE to confirm.');
      return;
    }

    setError('');
    setStep('deleting');

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }

    try {
      const userId = user?.id;
      if (userId) {
        // Delete user data from all tables (best-effort, in parallel)
        const cleanupOps = [
          blink.db.driverVerifications.list({ where: { user_id: userId } })
            .then((rows: any[]) => Promise.all(rows.map((r: any) => blink.db.driverVerifications.delete(r.id)))),
          blink.db.backgroundChecks.list({ where: { user_id: userId } })
            .then((rows: any[]) => Promise.all(rows.map((r: any) => blink.db.backgroundChecks.delete(r.id)))),
          blink.db.payoutRequests.list({ where: { driver_user_id: userId } })
            .then((rows: any[]) => Promise.all(rows.map((r: any) => blink.db.payoutRequests.delete(r.id)))),
          blink.db.orders.list({ where: { driver_user_id: userId } })
            .then((rows: any[]) => Promise.all(rows.map((r: any) => blink.db.orders.update(r.id, { driver_user_id: null, driver_name: null, driver_photo_url: null })))),
        ];

        await Promise.allSettled(cleanupOps);

        // Remove local photo reference
        await AsyncStorage.removeItem('driver_photo_url').catch(() => {});
        await AsyncStorage.removeItem('app_role').catch(() => {});
      }

      // Sign out
      await blink.auth.signOut();

      setStep('done');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (err: any) {
      console.warn('[delete-account] error:', err?.message);
      setError('Something went wrong. Please try again or contact support.');
      setStep('confirm');
    }
  };

  return (
    <SafeArea edges={['top', 'bottom']}>
      {/* Header */}
      <XStack
        alignItems="center"
        paddingHorizontal="$4"
        paddingVertical="$3"
        borderBottomWidth={1}
        borderBottomColor={colors.border}
        gap="$3"
      >
        {step !== 'deleting' && step !== 'done' && (
          <Pressable
            onPress={() => step === 'confirm' ? setStep('review') : router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
        )}
        <SizableText size="$6" fontWeight="700" color="$color12">
          Delete Account
        </SizableText>
      </XStack>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'review' && <ReviewStep onNext={handleNext} />}
        {step === 'confirm' && (
          <ConfirmStep
            confirmText={confirmText}
            setConfirmText={setConfirmText}
            error={error}
            onDelete={handleDelete}
            onBack={() => { setStep('review'); setError(''); }}
          />
        )}
        {step === 'deleting' && <DeletingStep />}
        {step === 'done' && <DoneStep />}
      </ScrollView>
    </SafeArea>
  );
}

// ─── Step 1: Review what will be deleted ──────────────────────────────────────

function ReviewStep({ onNext }: { onNext: () => void }) {
  const items = [
    { icon: <User size={20} color="$red9" />, label: 'Your profile', desc: 'Name, email, and account details' },
    { icon: <FileText size={20} color="$red9" />, label: 'Verification documents', desc: "Driver's license and insurance files" },
    { icon: <Shield size={20} color="$red9" />, label: 'Background check records', desc: 'Your background check authorization and results' },
    { icon: <Package size={20} color="$red9" />, label: 'Order associations', desc: 'Your name will be removed from past deliveries' },
    { icon: <CreditCard size={20} color="$red9" />, label: 'Payout history', desc: 'Pending payout requests will be cancelled' },
  ];

  return (
    <YStack gap="$6">
      <YStack alignItems="center" gap="$4" marginTop="$4">
        <YStack
          width={80} height={80} borderRadius={40}
          backgroundColor="rgba(220,38,38,0.1)"
          alignItems="center" justifyContent="center"
          borderWidth={2} borderColor="rgba(220,38,38,0.25)"
        >
          <AlertTriangle size={36} color="$red9" />
        </YStack>
        <YStack alignItems="center" gap="$2">
          <SizableText size="$7" fontWeight="800" color="$color12">
            Request Account Deletion
          </SizableText>
          <SizableText size="$3" color="$color9" textAlign="center" paddingHorizontal="$6">
            The following data will be permanently deleted. This action cannot be undone.
          </SizableText>
        </YStack>
      </YStack>

      <YStack
        backgroundColor="$color2"
        borderRadius={16}
        borderWidth={1}
        borderColor={colors.border}
        overflow="hidden"
      >
        {items.map((item, i) => (
          <React.Fragment key={item.label}>
            <XStack alignItems="center" gap="$3" padding="$4">
              <YStack
                width={40} height={40} borderRadius={20}
                backgroundColor="rgba(220,38,38,0.08)"
                alignItems="center" justifyContent="center"
                flexShrink={0}
              >
                {item.icon}
              </YStack>
              <YStack flex={1}>
                <SizableText size="$4" fontWeight="700" color="$color12">{item.label}</SizableText>
                <SizableText size="$2" color="$color9">{item.desc}</SizableText>
              </YStack>
            </XStack>
            {i < items.length - 1 && <YStack height={1} backgroundColor={colors.border} />}
          </React.Fragment>
        ))}
      </YStack>

      <YStack
        backgroundColor="rgba(59,130,246,0.06)"
        borderRadius={12} borderWidth={1} borderColor="rgba(59,130,246,0.2)"
        padding="$4" gap="$2"
      >
        <XStack alignItems="center" gap="$2">
          <Mail size={16} color="$blue9" />
          <SizableText size="$3" fontWeight="700" color="$blue9">
            Need help instead?
          </SizableText>
        </XStack>
        <SizableText size="$2" color="$color10" lineHeight={20}>
          If you're having issues with your account, contact us at{' '}
          <SizableText size="$2" fontWeight="700" color="$blue10">
            {APP_CONFIG.STORE_EMAIL}
          </SizableText>{' '}
          before deleting.
        </SizableText>
      </YStack>

      <Pressable
        onPress={onNext}
        style={({ pressed }) => [
          styles.deleteBtn,
          pressed && styles.deleteBtnPressed,
        ]}
      >
        <Trash2 size={18} color="white" />
        <SizableText size="$4" fontWeight="800" color="white">
          Continue to Delete
        </SizableText>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
        <SizableText size="$3" fontWeight="600" color="$color10">
          Cancel
        </SizableText>
      </Pressable>
    </YStack>
  );
}

// ─── Step 2: Confirm by typing DELETE ─────────────────────────────────────────

function ConfirmStep({
  confirmText,
  setConfirmText,
  error,
  onDelete,
  onBack,
}: {
  confirmText: string;
  setConfirmText: (v: string) => void;
  error: string;
  onDelete: () => void;
  onBack: () => void;
}) {
  return (
    <YStack gap="$5" marginTop="$4">
      <YStack alignItems="center" gap="$3">
        <YStack
          width={64} height={64} borderRadius={32}
          backgroundColor="rgba(220,38,38,0.12)"
          alignItems="center" justifyContent="center"
          borderWidth={2} borderColor="rgba(220,38,38,0.3)"
        >
          <Trash2 size={28} color="$red9" />
        </YStack>
        <SizableText size="$6" fontWeight="800" color="$color12">
          Are you sure?
        </SizableText>
        <SizableText size="$3" color="$color9" textAlign="center" paddingHorizontal="$4">
          Type <SizableText size="$3" fontWeight="800" color="$red10">DELETE</SizableText> below to permanently remove your account and all associated data.
        </SizableText>
      </YStack>

      <YStack gap="$2">
        <SizableText size="$2" fontWeight="700" color="$color10" paddingLeft="$1">
          TYPE DELETE TO CONFIRM
        </SizableText>
        <YStack
          backgroundColor="$color3"
          borderRadius={14}
          borderWidth={2}
          borderColor={confirmText.trim().toUpperCase() === 'DELETE' ? '$green8' : (error ? '$red8' : '$color5')}
          paddingHorizontal="$4"
          height={52}
          justifyContent="center"
        >
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type DELETE"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="done"
            style={[
              styles.confirmInput,
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
            ]}
          />
        </YStack>
        {!!error && (
          <SizableText size="$2" color="$red9">{error}</SizableText>
        )}
      </YStack>

      <Pressable
        onPress={onDelete}
        disabled={confirmText.trim().toUpperCase() !== 'DELETE'}
        style={({ pressed }) => [
          styles.deleteBtn,
          confirmText.trim().toUpperCase() !== 'DELETE' && styles.deleteBtnDisabled,
          pressed && styles.deleteBtnPressed,
        ]}
      >
        <Trash2 size={18} color="white" />
        <SizableText size="$4" fontWeight="800" color="white">
          Permanently Delete My Account
        </SizableText>
      </Pressable>

      <Pressable onPress={onBack} style={styles.cancelBtn}>
        <SizableText size="$3" fontWeight="600" color="$color10">
          Go Back
        </SizableText>
      </Pressable>
    </YStack>
  );
}

// ─── Step 3: Deleting in progress ─────────────────────────────────────────────

function DeletingStep() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$5" marginTop="$8">
      <YStack
        width={80} height={80} borderRadius={40}
        backgroundColor="rgba(220,38,38,0.08)"
        alignItems="center" justifyContent="center"
      >
        <Spinner size="large" color="$red9" />
      </YStack>
      <YStack alignItems="center" gap="$2">
        <SizableText size="$5" fontWeight="700" color="$color12">
          Deleting your account...
        </SizableText>
        <SizableText size="$3" color="$color9" textAlign="center">
          Removing your data. This will only take a moment.
        </SizableText>
      </YStack>
    </YStack>
  );
}

// ─── Step 4: Done ─────────────────────────────────────────────────────────────

function DoneStep() {
  return (
    <YStack alignItems="center" gap="$5" marginTop="$8">
      <YStack
        width={80} height={80} borderRadius={40}
        backgroundColor="rgba(220,38,38,0.1)"
        alignItems="center" justifyContent="center"
        borderWidth={2} borderColor="rgba(22,163,74,0.25)"
      >
        <CheckCircle size={36} color="$green9" />
      </YStack>
      <YStack alignItems="center" gap="$2">
        <SizableText size="$6" fontWeight="800" color="$color12">
          Account Deleted
        </SizableText>
        <SizableText size="$3" color="$color9" textAlign="center" paddingHorizontal="$6">
          Your account and all associated data have been permanently removed. You have been signed out.
        </SizableText>
      </YStack>

      <YStack
        backgroundColor="rgba(59,130,246,0.06)"
        borderRadius={12} borderWidth={1} borderColor="rgba(59,130,246,0.2)"
        padding="$4" gap="$2" width="100%"
      >
        <SizableText size="$2" color="$color10" lineHeight={20}>
          If you change your mind, you can create a new account at any time. If you have questions, contact{' '}
          <SizableText size="$2" fontWeight="700" color="$blue10">
            {APP_CONFIG.STORE_EMAIL}
          </SizableText>.
        </SizableText>
      </YStack>

      <Pressable
        onPress={() => router.replace('/role-select')}
        style={({ pressed }) => [
          styles.homeBtn,
          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        ]}
      >
        <SizableText size="$4" fontWeight="700" color="white">
          Return to Home
        </SizableText>
      </Pressable>
    </YStack>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    backgroundColor: '#dc2626',
    borderRadius: borderRadius.xl,
  },
  deleteBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  deleteBtnDisabled: {
    opacity: 0.4,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  homeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    width: '100%',
  },
  confirmInput: {
    flex: 1,
    height: 48,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
  },
});
