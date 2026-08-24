import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  View,
  Text,
  StatusBar,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyRound, ChevronLeft, CheckCircle2 } from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import { colors, gradients, spacing, borderRadius } from '@/constants/design';
import { AuthHero, PasswordInput } from '@/components/auth';
import CustomInput from '@/components/core/CustomInput';
import { useToast } from '@/components/core';
import { checkPasswordRequirements } from '@/lib/validation';

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ userId?: string; token?: string }>();
  const { showToast } = useToast();
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const userId = params.userId || '';
  const token = params.token || '';

  const passwordCheck = checkPasswordRequirements(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async () => {
    console.log('[Auth:ResetPassword] Attempting password reset with params:', { userId, hasToken: !!token });
    if (!userId || !token) {
      showToast('Invalid or missing reset token. Please request a new link.', 'error');
      return;
    }
    if (!passwordCheck.isValid) {
      showToast('Please meet all password requirements.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(userId, token, password);
      console.log('[Auth:ResetPassword] Server response:', res);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      setSuccess(true);
    } catch (err: any) {
      console.error('[Auth:ResetPassword] Error:', err);
      showToast(err?.message || 'Failed to reset password. The link may have expired.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <LinearGradient
          colors={gradients.heroGlow}
          locations={gradients.heroGlowLocations}
          style={[
            styles.heroGlow,
            {
              height:
                320 +
                Math.max(
                  insets.top,
                  Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
                ),
            },
          ]}
          pointerEvents="none"
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              {
                paddingTop: Math.max(
                  insets.top + spacing.sm,
                  Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + spacing.sm : spacing.lg
                ),
                paddingBottom: Math.max(insets.bottom, 24) + spacing.lg,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.innerContent}>
              <Pressable
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(landing)/role-select');
                  }
                }}
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
                hitSlop={12}
              >
                <ChevronLeft size={24} color={colors.onSurface} />
              </Pressable>

              <AuthHero
                icon={<KeyRound size={40} color="#0F131C" />}
                iconBgColor={colors.secondaryContainer}
                iconBorderColor={colors.secondaryContainer}
                glowType="gold"
                title="Reset Password"
                subtitle="Create a new secure password for your account"
              />

              {success ? (
                <View style={styles.successCard}>
                  <CheckCircle2 size={36} color={colors.primary} />
                  <Text style={styles.successTitle}>Password Updated</Text>
                  <Text style={styles.successSubtitle}>
                    Your password has been successfully reset. You can now log in with your new credentials.
                  </Text>
                  <Pressable
                    onPress={() => router.replace('/(landing)/role-select')}
                    style={({ pressed }) => [
                      styles.submitBtn,
                      styles.backToSignBtn,
                      pressed && styles.submitBtnPressed,
                    ]}
                  >
                    <Text style={styles.submitBtnText}>Proceed to Sign In</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.formSection}>
                  <PasswordInput
                    value={password}
                    onChangeText={setPassword}
                    showRequirements={true}
                    accentColor={colors.secondaryContainer}
                  />

                  <CustomInput
                    label="CONFIRM PASSWORD"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter your password"
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    status={
                      confirmPassword.length === 0
                        ? 'default'
                        : passwordsMatch
                          ? 'success'
                          : 'error'
                    }
                  />

                  <Pressable
                    onPress={handleSubmit}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.submitBtn,
                      pressed && styles.submitBtnPressed,
                      loading && styles.submitBtnDisabled,
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.onPrimaryContainer} />
                    ) : (
                      <Text style={styles.submitBtnText}>Set New Password</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.marginMobile,
  },
  innerContent: {
    flexGrow: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.gutter,
    alignSelf: 'flex-start',
  },
  formSection: {
    gap: 16,
  },
  submitBtn: {
    height: 54,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnPressed: {
    backgroundColor: 'rgba(0, 102, 255, 0.85)',
    transform: [{ scale: 0.98 }],
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimaryContainer,
    letterSpacing: 0.2,
  },
  successCard: {
    backgroundColor: colors.glassLevel2Bg,
    borderRadius: borderRadius.DEFAULT,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  backToSignBtn: {
    width: '100%',
    marginTop: 12,
  },
});
