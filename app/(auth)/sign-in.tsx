import React, { useState, useEffect, useRef } from 'react';
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
  Truck,
  Mail,
  Lock,
  ChevronLeft,
  User,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import { saveDisplayName } from '@/lib/chat';
import { colors, gradients, spacing, borderRadius } from '@/constants/design';
import { AuthHero, TermsAgreement, PasswordInput } from '@/components/auth';
import CustomInput from '@/components/core/CustomInput';
import { useToast } from '@/components/core';
import { isValidEmail, checkPasswordRequirements } from '@/lib/validation';
import { subscribeTermsAgreed } from '@/components/legal';

type Mode = 'signin' | 'signup';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { login, register, logout } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    return subscribeTermsAgreed((agreed) => {
      if (agreed) setAgreedToTerms(true);
    });
  }, []);

  const isSignUp = mode === 'signup';
  const isNameValid = name.trim().length >= 2;
  const nameStatus = name.length === 0 ? 'default' : isNameValid ? 'success' : 'default';

  const isEmailValid = isValidEmail(email);
  const emailStatus = email.length === 0 ? 'default' : isEmailValid ? 'success' : 'error';

  const scrollViewRef = useRef<ScrollView>(null);
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
    const emailTrimmed = email.trim();
    const nameTrimmed = name.trim();

    if (!emailTrimmed || !password) {
      showToast('Please fill in all fields.', 'error');
      return;
    }
    if (isSignUp && !nameTrimmed) {
      showToast('Please enter your name.', 'error');
      return;
    }
    if (isSignUp && !isEmailValid) {
      showToast('Please enter a valid email address (e.g. name@gmail.com).', 'error');
      return;
    }
    if (isSignUp && !passwordCheck.isValid) {
      showToast('Please meet all password requirements.', 'error');
      return;
    }
    if (isSignUp && !agreedToTerms) {
      showToast('Please read and agree to the Terms of Use to create an account.', 'error');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await register({
          email: emailTrimmed,
          password,
          displayName: nameTrimmed,
          role: 'driver',
        });
        await saveDisplayName(nameTrimmed).catch(() => {});
      } else {
        const loggedUser = await login(emailTrimmed, password);
        if (loggedUser.role !== 'driver' && loggedUser.role !== 'admin') {
          await logout();
          showToast('This account is registered as a customer. Please use Customer login.', 'error');
          return;
        }
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (msg.includes('already exists') || msg.includes('EMAIL_ALREADY_EXISTS') || msg.includes('duplicate')) {
        showToast('An account with this email already exists. Try signing in.', 'error');
      } else if (msg.includes('INVALID_CREDENTIALS') || msg.includes('invalid') || msg.includes('Invalid credentials')) {
        showToast('Incorrect email or password.', 'error');
      } else if (msg.includes('WEAK_PASSWORD') || msg.includes('weak') || msg.includes('at least 8')) {
        showToast('Password must be at least 8 characters.', 'error');
      } else {
        showToast(msg || 'Something went wrong. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setAgreedToTerms(false);
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
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
            ref={scrollViewRef}
            contentContainerStyle={[
              styles.scroll,
              {
                paddingTop: Math.max(
                  insets.top + spacing.sm,
                  Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + spacing.sm : spacing.lg
                ),
                paddingBottom: Math.max(insets.bottom, 24) + (isSignUp ? 60 : spacing.lg),
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

              <View style={styles.formSection}>
                {isSignUp && (
                  <CustomInput
                    label="YOUR NAME"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Alex Rivera"
                    autoCapitalize="words"
                    returnKeyType="next"
                    leftIcon={<User size={18} color={colors.outline} />}
                    status={nameStatus}
                  />
                )}

                <CustomInput
                  label="EMAIL"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="driver@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                  leftIcon={<Mail size={18} color={colors.outline} />}
                  status={emailStatus}
                />

                <PasswordInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (isSignUp && text.length === 1) {
                      scrollViewRef.current?.scrollTo({ y: 130, animated: true });
                    }
                  }}
                  showRequirements={isSignUp}
                  accentColor={colors.primaryContainer}
                  onSubmitEditing={handleSubmit}
                  onFocus={() => {
                    if (isSignUp) {
                      setTimeout(() => scrollViewRef.current?.scrollTo({ y: 130, animated: true }), 100);
                    }
                  }}
                />

                {isSignUp && (
                  <TermsAgreement
                    agreed={agreedToTerms}
                    onToggle={() => setAgreedToTerms((v) => !v)}
                    accentColor={colors.primaryContainer}
                  />
                )}

                {!isSignUp && (
                  <Pressable
                    onPress={() => router.push('/(auth)/forgot-password' as any)}
                    style={styles.forgotBtn}
                  >
                    <Text style={styles.forgotBtnText}>Forgot Password?</Text>
                  </Pressable>
                )}

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
  forgotBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    marginTop: -4,
  },
  forgotBtnText: {
    fontSize: 13.5,
    color: colors.primary,
    fontWeight: '600',
  },
});
