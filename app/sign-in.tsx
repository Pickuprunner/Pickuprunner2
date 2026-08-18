import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import {
  YStack,
  XStack,
  SizableText,
  SafeArea,
  Truck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckSquare,
  Square,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { blink } from '@/lib/blink';
import { saveDisplayName } from '@/lib/chat';
import { colors, spacing, borderRadius, typography } from '@/constants/design';
import { ORDER_SCOPE } from '@/lib/config';

type Mode = 'signin' | 'signup';

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const isSignUp = mode === 'signup';

  const handleSubmit = async () => {
    setError('');
    const emailTrimmed = email.trim();
    const nameTrimmed = name.trim();

    if (!emailTrimmed || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (isSignUp && !nameTrimmed) {
      setError('Please enter your name.');
      return;
    }
    if (isSignUp && !agreedToTerms) {
      setError('Please read and agree to the Terms of Use to create an account.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await blink.auth.signUp({
          email: emailTrimmed,
          password,
          displayName: nameTrimmed,
        });
        // Also save as chat display name
        await saveDisplayName(nameTrimmed).catch(() => {});

        // Auto-create Stripe Express account for driver (fire-and-forget)
        const me = await blink.auth.me();
        if (me) {
          fetch('https://vljh4v3j.backend.blink.new/connect/auto-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driverUserId: me.id, driverEmail: emailTrimmed, driverName: nameTrimmed }),
          }).catch(() => {}); // non-blocking
        }
      } else {
        await blink.auth.signInWithEmail(emailTrimmed, password);
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      // Check verification status before routing
      const me = await blink.auth.me();
      if (!me) { router.replace('/(tabs)'); return; }

      const verRows = await blink.db.driverVerifications.list({ where: { user_id: me.id }, limit: 1 });
      const verification = verRows[0] as any;

      if (!verification || verification.status !== 'approved') {
        router.replace('/driver-verification');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (msg.includes('already exists') || msg.includes('EMAIL_ALREADY_EXISTS')) {
        setError('An account with this email already exists. Try signing in.');
      } else if (msg.includes('INVALID_CREDENTIALS') || msg.includes('invalid')) {
        setError('Incorrect email or password.');
      } else if (msg.includes('WEAK_PASSWORD') || msg.includes('weak')) {
        setError('Password must be at least 8 characters.');
      } else {
        setError(msg || 'Something went wrong. Please try again.');
      }
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setError('');
    setAgreedToTerms(false);
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
  };

  return (
    <SafeArea>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button — only shown if there's somewhere to go back to */}
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/role-select')}
            style={styles.backBtn}
            hitSlop={12}
          >
            <ArrowLeft size={22} color="$color10" />
          </Pressable>

          {/* Icon + heading */}
          <YStack alignItems="center" space="$3" marginBottom="$8">
            <YStack
              width={72}
              height={72}
              borderRadius={36}
              backgroundColor="$green3"
              alignItems="center"
              justifyContent="center"
            >
              <Truck size={36} color="$green9" />
            </YStack>
            <YStack alignItems="center" space="$1">
              <SizableText size="$8" fontWeight="800" color="$color12">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </SizableText>
              <SizableText size="$3" color="$color10" textAlign="center">
                {isSignUp
                  ? 'Create a driver account to start delivering orders'
                  : 'Sign in to view orders and start delivering'}
              </SizableText>
            </YStack>
          </YStack>

          {/* Form */}
          <YStack space="$4" width="100%">
            {/* Name (sign-up only) */}
            {isSignUp && (
              <YStack space="$1">
                <SizableText size="$2" fontWeight="700" color="$color10">
                  YOUR NAME
                </SizableText>
                <XStack
                  alignItems="center"
                  backgroundColor="$color3"
                  borderRadius={14}
                  borderWidth={1}
                  borderColor={error && !name.trim() ? '$red8' : '$color5'}
                  paddingHorizontal="$4"
                  space="$2"
                >
                  <SizableText size="$3" color="$color9">👤</SizableText>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Alex Rivera"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="words"
                    returnKeyType="next"
                    style={[
                      styles.input,
                      Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
                    ]}
                  />
                </XStack>
              </YStack>
            )}

            {/* Email */}
            <YStack space="$1">
              <SizableText size="$2" fontWeight="700" color="$color10">
                EMAIL
              </SizableText>
              <XStack
                alignItems="center"
                backgroundColor="$color3"
                borderRadius={14}
                borderWidth={1}
                borderColor="$color5"
                paddingHorizontal="$4"
                space="$2"
              >
                <Mail size={18} color="$color9" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="driver@example.com"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                  style={[
                    styles.input,
                    Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
                  ]}
                />
              </XStack>
            </YStack>

            {/* Password */}
            <YStack space="$1">
              <SizableText size="$2" fontWeight="700" color="$color10">
                PASSWORD
              </SizableText>
              <XStack
                alignItems="center"
                backgroundColor="$color3"
                borderRadius={14}
                borderWidth={1}
                borderColor="$color5"
                paddingHorizontal="$4"
                space="$2"
              >
                <Lock size={18} color="$color9" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={isSignUp ? 'At least 8 characters' : '••••••••'}
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPassword}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  style={[
                    styles.input,
                    { flex: 1 },
                    Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
                  ]}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  {showPassword
                    ? <EyeOff size={18} color="$color9" />
                    : <Eye size={18} color="$color9" />}
                </Pressable>
              </XStack>
            </YStack>

            {/* Error */}
            {!!error && (
              <YStack
                backgroundColor="$red3"
                borderRadius={10}
                paddingHorizontal="$4"
                paddingVertical="$3"
                borderWidth={1}
                borderColor="$red6"
              >
                <SizableText size="$3" color="$red10">
                  {error}
                </SizableText>
              </YStack>
            )}

            {/* Terms links + checkbox — sign-up only */}
            {isSignUp && (
              <YStack space="$2">
                {/* Read links first */}
                <XStack space="$3">
                  <Pressable
                    onPress={() => router.push('/terms')}
                    style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.6 }]}
                  >
                    <SizableText size="$2" fontWeight="700" color="$green9" textDecorationLine="underline">
                      Terms of Use
                    </SizableText>
                  </Pressable>
                  <SizableText size="$2" color="$color9">·</SizableText>
                  <Pressable
                    onPress={() => router.push('/privacy-policy')}
                    style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.6 }]}
                  >
                    <SizableText size="$2" fontWeight="700" color="$green9" textDecorationLine="underline">
                      Privacy Policy
                    </SizableText>
                  </Pressable>
                </XStack>
                {/* Separate agree checkbox */}
                <Pressable
                  onPress={() => setAgreedToTerms((v) => !v)}
                  style={styles.termsRow}
                >
                  <YStack
                    width={22} height={22} borderRadius={5}
                    borderWidth={2}
                    borderColor={agreedToTerms ? '#16a34a' : 'rgba(255,255,255,0.35)'}
                    backgroundColor={agreedToTerms ? '#16a34a' : 'transparent'}
                    alignItems="center" justifyContent="center"
                    flexShrink={0}
                  >
                    {agreedToTerms && (
                      <SizableText size="$1" fontWeight="900" color="white">✓</SizableText>
                    )}
                  </YStack>
                  <SizableText size="$2" color="$color10" flex={1} lineHeight={20}>
                    I agree to the Terms of Use and Privacy Policy
                  </SizableText>
                </Pressable>
              </YStack>
            )}

            {/* Submit button */}
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
                <ActivityIndicator color="white" />
              ) : (
                <SizableText size="$5" fontWeight="800" color="white">
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </SizableText>
              )}
            </Pressable>

            {/* Mode switch */}
            <XStack justifyContent="center" space="$1" marginTop="$2">
              <SizableText size="$3" color="$color10">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </SizableText>
              <Pressable onPress={switchMode}>
                <SizableText size="$3" fontWeight="700" color="$green9">
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </SizableText>
              </Pressable>
            </XStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  backBtn: {
    marginBottom: spacing.xl,
    alignSelf: 'flex-start',
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: colors.text,
  },
  submitBtn: {
    height: 56,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  submitBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  linkBtn: {
    paddingVertical: 2,
  },
});
