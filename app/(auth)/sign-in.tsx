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
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Truck,
  Mail,
  Lock,
  ArrowLeft,
  User,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { blink } from '@/lib/blink';
import { saveDisplayName } from '@/lib/chat';
import { colors, gradients, spacing, borderRadius } from '@/constants/design';
import { AuthInput, AuthHero, TermsAgreement } from '@/components/auth';

type Mode = 'signin' | 'signup';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Hero Glow Background — matching landing role-select */}
      <LinearGradient
        colors={gradients.heroGlow}
        locations={gradients.heroGlowLocations}
        style={[styles.heroGlow, { height: 320 + insets.top }]}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top > 0 ? insets.top + spacing.sm : spacing.lg,
              paddingBottom: insets.bottom > 0 ? insets.bottom + spacing.lg : spacing.xxl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(landing)/role-select');
              }
            }}
            style={styles.backBtn}
            hitSlop={12}
          >
            <ArrowLeft size={22} color={colors.onSurfaceVariant} />
          </Pressable>

          {/* Hero Header */}
          <AuthHero
            icon={<Truck size={42} color="#0F131C" />}
            iconBgColor={colors.primaryContainer}
            iconBorderColor={colors.primaryContainer}
            glowType="cobalt"
            title={isSignUp ? 'Create Account' : 'Welcome Back'}
            subtitle={
              isSignUp
                ? 'Create a driver account to start delivering orders'
                : 'Sign in to view orders and start delivering'
            }
          />

          {/* Form */}
          <View style={styles.formSection}>
            {/* Name (sign-up only) */}
            {isSignUp && (
              <AuthInput
                label="YOUR NAME"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Alex Rivera"
                autoCapitalize="words"
                returnKeyType="next"
                icon={<User size={18} color={colors.outline} />}
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
              icon={<Mail size={18} color={colors.outline} />}
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
              icon={<Lock size={18} color={colors.outline} />}
            />

            {/* Error */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Terms — sign-up only */}
            {isSignUp && (
              <TermsAgreement
                agreed={agreedToTerms}
                onToggle={() => setAgreedToTerms((v) => !v)}
                accentColor={colors.primaryContainer}
              />
            )}

            {/* Submit CTA Button */}
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
                <Text style={styles.submitBtnText}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </Pressable>

            {/* Mode switch */}
            <View style={styles.switchRow}>
              <Text style={styles.switchModePrompt}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </Text>
              <Pressable onPress={switchMode}>
                <Text style={styles.switchModeLink}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  backBtn: {
    marginBottom: spacing.gutter,
    alignSelf: 'flex-start',
  },
  formSection: {
    gap: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.gutter,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#ff8b8b',
    fontSize: 13.5,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  switchModePrompt: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  switchModeLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
