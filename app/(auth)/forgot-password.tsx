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
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, ChevronLeft, Lock, CheckCircle2 } from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import { colors, gradients, spacing, borderRadius } from '@/constants/design';
import { AuthHero } from '@/components/auth';
import CustomInput from '@/components/core/CustomInput';
import { useToast } from '@/components/core';
import { isValidEmail } from '@/lib/validation';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetData, setDevResetData] = useState<{ userId?: string; token?: string } | null>(null);

  const isEmailValid = isValidEmail(email);
  const emailStatus = email.length === 0 ? 'default' : isEmailValid ? 'success' : 'error';

  const handleSubmit = async () => {
    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      showToast('Please enter your email address.', 'error');
      return;
    }
    if (!isEmailValid) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    setLoading(true);
    console.log('[Auth:ForgotPassword] Submitting reset request for email:', emailTrimmed);
    try {
      const res: any = await forgotPassword(emailTrimmed);
      console.log('[Auth:ForgotPassword] Server response:', res);
      if (res?.data?.token) {
        console.log('[Auth:ForgotPassword] TOKEN:', res.data.token);
        console.log('[Auth:ForgotPassword] USER_ID:', res.data.userId);
        setDevResetData({ userId: res.data.userId, token: res.data.token });
      }
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      setSent(true);
    } catch (err: any) {
      console.error('[Auth:ForgotPassword] Error:', err);
      showToast(err?.message || 'Could not send reset link. Please try again.', 'error');
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
                icon={<Lock size={40} color="#0F131C" />}
                iconBgColor={colors.secondaryContainer}
                iconBorderColor={colors.secondaryContainer}
                glowType="gold"
                title="Forgot Password"
                subtitle="Enter your email to receive a password reset link"
              />

              {sent ? (
                <View style={styles.successCard}>
                  <CheckCircle2 size={36} color={colors.primary} />
                  <Text style={styles.successTitle}>Check Your Email</Text>
                  <Text style={styles.successSubtitle}>
                    If an account with {email} exists, we've sent password reset instructions.
                  </Text>
                  <Pressable
                    onPress={() => {
                      if (devResetData?.token && devResetData?.userId) {
                        router.push({
                          pathname: '/(auth)/reset-password',
                          params: { userId: devResetData.userId, token: devResetData.token },
                        } as any);
                      } else {
                        router.push('/(auth)/reset-password' as any);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.submitBtn,
                      styles.backToSignBtn,
                      pressed && styles.submitBtnPressed,
                    ]}
                  >
                    <Text style={styles.submitBtnText}>Reset Password Now</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (router.canGoBack()) {
                        router.back();
                      } else {
                        router.replace('/(landing)/role-select');
                      }
                    }}
                    style={({ pressed }) => [
                      styles.cancelBtn,
                      { marginTop: 12 },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={styles.cancelBtnText}>Return to Sign In</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.formSection}>
                  <CustomInput
                    label="EMAIL ADDRESS"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    leftIcon={<Mail size={18} color={colors.outline} />}
                    status={emailStatus}
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
                      <Text style={styles.submitBtnText}>Send Reset Link</Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (router.canGoBack()) {
                        router.back();
                      } else {
                        router.replace('/(landing)/role-select');
                      }
                    }}
                    style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.cancelBtnText}>Back to Sign In</Text>
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
  cancelBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelBtnText: {
    fontSize: 14,
    color: colors.outline,
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
