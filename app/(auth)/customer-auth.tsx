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
import {
  ShoppingBag,
  Mail,
  Lock,
  ArrowLeft,
  User,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blink } from '@/lib/blink';
import { colors, gradients, spacing, borderRadius } from '@/constants/design';
import { AuthHero, TermsAgreement, PasswordRequirements } from '@/components/auth';
import CustomInput from '@/components/core/CustomInput';
import { isValidEmail, checkPasswordRequirements } from '@/lib/validation';

const SESSION_KEY = 'customer_session_id';
const NAME_KEY = 'customer_display_name';

type Mode = 'signin' | 'signup';

export default function CustomerAuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const isSignUp = mode === 'signup';
  const isNameValid = name.trim().length >= 2;
  const nameStatus = name.length === 0 ? 'default' : isNameValid ? 'success' : 'default';

  const isEmailValid = isValidEmail(email);
  const emailStatus = email.length === 0 ? 'default' : isEmailValid ? 'success' : 'error';

  const passwordCheck = checkPasswordRequirements(password);
  const passwordStatus =
    password.length === 0
      ? 'default'
      : isSignUp
      ? passwordCheck.isValid
        ? 'success'
        : 'error'
      : 'default';

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
    if (isSignUp && !isEmailValid) {
      setError('Please enter a valid email address (e.g. name@gmail.com).');
      return;
    }
    if (isSignUp && !passwordCheck.isValid) {
      if (!passwordCheck.hasMinLength) setError('Password must be at least 8 characters.');
      else if (!passwordCheck.hasUpper) setError('Password must contain at least 1 uppercase letter.');
      else if (!passwordCheck.hasLower) setError('Password must contain at least 1 lowercase letter.');
      else if (!passwordCheck.hasNumber) setError('Password must contain at least 1 number.');
      else if (!passwordCheck.hasSpecial) setError('Password must contain at least 1 special character (!@#$...).');
      return;
    }
    if (isSignUp && !agreedToTerms) {
      setError('Please agree to the Terms of Use to create an account.');
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
        await AsyncStorage.setItem(NAME_KEY, nameTrimmed).catch(() => {});
      } else {
        await blink.auth.signInWithEmail(emailTrimmed, password);
        const me = await blink.auth.me();
        if (me?.displayName) {
          await AsyncStorage.setItem(NAME_KEY, me.displayName).catch(() => {});
        }
      }

      const sid = await AsyncStorage.getItem(SESSION_KEY);
      if (!sid) {
        await AsyncStorage.setItem(SESSION_KEY, `cust_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      router.replace('/(customer)/my-orders');
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
            <Pressable onPress={Keyboard.dismiss} style={styles.innerContent}>
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
                icon={<ShoppingBag size={42} color="#0F131C" />}
                iconBgColor={colors.secondaryContainer}
                iconBorderColor={colors.secondaryContainer}
                glowType="gold"
                title={isSignUp ? 'Create Account' : 'Welcome Back'}
                subtitle={
                  isSignUp
                    ? 'Sign up to place orders and track deliveries'
                    : 'Sign in to place and track your orders'
                }
              />

              {/* Form */}
              <View style={styles.formSection}>
                {/* Name (sign-up only) */}
                {isSignUp && (
                  <CustomInput
                    label="YOUR NAME"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Alex Rivera"
                    autoCapitalize="words"
                    returnKeyType="next"
                    leftIcon={<User size={18} color={colors.outline} />}
                    error={!!error && !name.trim()}
                    status={nameStatus}
                  />
                )}

                {/* Email */}
                <CustomInput
                  label="EMAIL"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                  leftIcon={<Mail size={18} color={colors.outline} />}
                  status={emailStatus}
                />

                {/* Password */}
                <CustomInput
                  label="PASSWORD"
                  value={password}
                  onChangeText={setPassword}
                  placeholder={isSignUp ? 'Min 8 chars, uppercase, number...' : '••••••••'}
                  isPassword
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  leftIcon={<Lock size={18} color={colors.outline} />}
                  status={passwordStatus}
                />

                {/* Live Password Requirements (Sign-up only) */}
                {isSignUp && <PasswordRequirements check={passwordCheck} />}

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

                {/* Continue without account */}
                <Pressable
                  onPress={() => router.replace('/(customer)/my-orders')}
                  style={({ pressed }) => [styles.guestBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.guestBtnText}>
                    Continue without an account
                  </Text>
                </Pressable>
              </View>
            </Pressable>
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
    flex: 1,
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
  guestBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: 2,
  },
  guestBtnText: {
    fontSize: 13.5,
    color: colors.outline,
  },
});
