import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
  ArrowLeft,
  User,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { blink } from '@/lib/blink';
import { saveDisplayName } from '@/lib/chat';
import { colors, spacing, borderRadius } from '@/constants/design';
import { AuthInput, AuthHero, TermsAgreement } from './components';

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
          metadata: { displayName: nameTrimmed },
        });
        await saveDisplayName(nameTrimmed).catch(() => {});

        // Auto-create Stripe Express account for driver (fire-and-forget)
        const me = await blink.auth.me();
        if (me) {
          fetch('https://vljh4v3j.backend.blink.new/connect/auto-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driverUserId: me.id, driverEmail: emailTrimmed, driverName: nameTrimmed }),
          }).catch(() => {});
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
          {/* Back button */}
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/role-select')}
            style={styles.backBtn}
            hitSlop={12}
          >
            <ArrowLeft size={22} color="$color10" />
          </Pressable>

          {/* Hero Header Component */}
          <AuthHero
            icon={<Truck size={36} color="$green9" />}
            iconBgColor="$green3"
            iconBorderColor="$green6"
            title={isSignUp ? 'Create Account' : 'Welcome Back'}
            subtitle={
              isSignUp
                ? 'Create a driver account to start delivering orders'
                : 'Sign in to view orders and start delivering'
            }
          />

          {/* Form */}
          <YStack gap="$4" width="100%">
            {/* Name (sign-up only) */}
            {isSignUp && (
              <AuthInput
                label="YOUR NAME"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Alex Rivera"
                autoCapitalize="words"
                returnKeyType="next"
                icon={<User size={18} color="$color9" />}
                error={!!error && !name.trim()}
              />
            )}

            {/* Email */}
            <AuthInput
              label="EMAIL"
              value={email}
              onChangeText={setEmail}
              placeholder="driver@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              icon={<Mail size={18} color="$color9" />}
            />

            {/* Password */}
            <AuthInput
              label="PASSWORD"
              value={password}
              onChangeText={setPassword}
              placeholder={isSignUp ? 'At least 8 characters' : '••••••••'}
              isPassword
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((v) => !v)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              icon={<Lock size={18} color="$color9" />}
            />

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

            {/* Terms — sign-up only */}
            {isSignUp && (
              <TermsAgreement
                agreed={agreedToTerms}
                onToggle={() => setAgreedToTerms((v) => !v)}
                accentColor="#16a34a"
              />
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
            <XStack justifyContent="center" gap="$1" marginTop="$2">
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
});
