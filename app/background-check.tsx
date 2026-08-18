import React, { useState } from 'react';
import {
  ScrollView,
  Platform,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import {
  YStack,
  XStack,
  SizableText,
  SafeArea,
  ArrowLeft,
  Shield,
  CheckSquare,
  Square,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  ShieldCheck,
  User,
  MapPin,
  Calendar,
  Lock,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import {
  useMyBackgroundCheck,
  useSubmitBackgroundCheck,
} from '@/lib/backgroundCheck';
import { APP_CONFIG } from '@/lib/config';
import { colors, spacing, borderRadius } from '@/constants/design';

// ── Helpers ────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  icon,
  secureTextEntry,
  hint,
  error,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: any;
  maxLength?: number;
  icon: React.ReactNode;
  secureTextEntry?: boolean;
  hint?: string;
  error?: boolean;
  autoCapitalize?: any;
}) {
  return (
    <YStack space="$1">
      <SizableText size="$2" fontWeight="700" color="$color10">{label}</SizableText>
      <XStack
        backgroundColor="$color3"
        borderRadius={14}
        borderWidth={1.5}
        borderColor={error ? '$red7' : '$color5'}
        paddingHorizontal="$3"
        alignItems="center"
        space="$2"
      >
        {icon}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType={keyboardType ?? 'default'}
          maxLength={maxLength}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          autoCorrect={false}
          style={[
            styles.input,
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
          ]}
        />
      </XStack>
      {hint && (
        <SizableText size="$1" color="$color9" paddingLeft="$1">{hint}</SizableText>
      )}
    </YStack>
  );
}

// ── Status Banner ──────────────────────────────────────────────────────────────

function StatusBanner({
  status,
  adminNote,
  externalRef,
  onResubmit,
}: {
  status: string;
  adminNote?: string;
  externalRef?: string;
  onResubmit?: () => void;
}) {
  const configs = {
    pending: {
      bg: '$amber2', border: '$amber5', icon: <Clock size={26} color="$amber9" />,
      title: 'Awaiting Review',
      body: 'Your background check authorization has been submitted. The admin will initiate the check and update your status within 1–3 business days.',
    },
    in_review: {
      bg: '$blue2', border: '$blue5', icon: <Shield size={26} color="$blue9" />,
      title: 'Check In Progress',
      body: 'Your background check is currently being processed. You will be notified once it is complete.',
    },
    approved: {
      bg: '$green2', border: '$green5', icon: <ShieldCheck size={26} color="$green9" />,
      title: 'Background Check Cleared ✓',
      body: 'Your background check has been approved. You are fully cleared to make deliveries.',
    },
    rejected: {
      bg: '$red2', border: '$red5', icon: <XCircle size={26} color="$red9" />,
      title: 'Background Check Failed',
      body: adminNote || 'Your background check could not be cleared. Please contact the admin for details.',
    },
  };

  const cfg = configs[status as keyof typeof configs] ?? configs.pending;

  return (
    <YStack
      backgroundColor={cfg.bg}
      borderRadius="$4"
      borderWidth={1}
      borderColor={cfg.border}
      padding="$4"
      space="$3"
    >
      <XStack space="$3" alignItems="flex-start">
        {cfg.icon}
        <YStack flex={1} space="$1">
          <SizableText size="$5" fontWeight="800" color="$color12">{cfg.title}</SizableText>
          <SizableText size="$2" color="$color10" lineHeight={20}>{cfg.body}</SizableText>
        </YStack>
      </XStack>
      {externalRef && (
        <XStack space="$2" alignItems="center">
          <SizableText size="$1" color="$color9" fontWeight="600">REFERENCE ID</SizableText>
          <SizableText size="$2" fontWeight="700" color="$color11">{externalRef}</SizableText>
        </XStack>
      )}
      {status === 'rejected' && onResubmit && (
        <Pressable
          onPress={onResubmit}
          style={({ pressed }) => [styles.resubmitBtn, pressed && { opacity: 0.8 }]}
        >
          <SizableText size="$3" fontWeight="700" color="white">Resubmit Authorization</SizableText>
        </Pressable>
      )}
    </YStack>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function BackgroundCheckScreen() {
  const { user } = useAuth();
  const { data: existing } = useMyBackgroundCheck(user?.id);
  const submit = useSubmitBackgroundCheck();

  const [showForm, setShowForm] = useState(false);

  // Form state
  const [dob, setDob] = useState('');
  const [ssn4, setSsn4] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('AZ');
  const [zip, setZip] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState('');

  const hasExisting = !!existing;
  const showUploadForm = showForm || !hasExisting;
  const isApproved = existing?.status === 'approved';
  const isPending = existing?.status === 'pending' || existing?.status === 'in_review';
  const isRejected = existing?.status === 'rejected';

  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!dob.match(/^\d{2}\/\d{2}\/\d{4}$/)) e.dob = true;
    if (!ssn4.match(/^\d{4}$/)) e.ssn4 = true;
    if (!address.trim()) e.address = true;
    if (!city.trim()) e.city = true;
    if (!state.trim()) e.state = true;
    if (!zip.match(/^\d{5}$/)) e.zip = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    setSubmitError('');
    if (!validate()) {
      setSubmitError('Please fix the highlighted fields.');
      return;
    }
    if (!agreed) {
      setSubmitError('You must authorize the background check before submitting.');
      return;
    }
    try {
      await submit.mutateAsync({
        userId: user!.id,
        driverName: user!.displayName || user!.email || 'Driver',
        driverEmail: user!.email,
        dateOfBirth: dob,
        ssnLast4: ssn4,
        address,
        city,
        state,
        zip,
        existingId: existing?.id,
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setShowForm(false);
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Submission failed. Please try again.');
    }
  };

  return (
    <SafeArea>
      {/* Header */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        alignItems="center"
        space="$3"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/driver-verification')}
          hitSlop={12}
        >
          <ArrowLeft size={22} color="$color10" />
        </Pressable>
        <XStack flex={1} space="$2" alignItems="center">
          <Shield size={18} color={APP_CONFIG.PRIMARY_COLOR} />
          <SizableText size="$5" fontWeight="800" color="$color12">Background Check</SizableText>
        </XStack>
        {existing && (
          <YStack
            paddingHorizontal={10}
            paddingVertical={4}
            borderRadius={999}
            backgroundColor={
              isApproved ? 'rgba(22,163,74,0.12)' :
              isPending  ? 'rgba(59,130,246,0.12)' :
              isRejected ? 'rgba(220,38,38,0.12)'  :
                           'rgba(217,119,6,0.12)'
            }
          >
            <SizableText
              size="$1"
              fontWeight="800"
              color={isApproved ? '$green9' : isPending ? '$blue9' : isRejected ? '$red9' : '$amber9'}
            >
              {existing.status.replace('_', ' ').toUpperCase()}
            </SizableText>
          </YStack>
        )}
      </XStack>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <YStack space="$5">

          {/* Intro */}
          <YStack space="$2">
            <SizableText size="$6" fontWeight="800" color="$color12">
              Driver Background Check
            </SizableText>
            <SizableText size="$3" color="$color10" lineHeight={22}>
              All {APP_CONFIG.STORE_NAME} delivery drivers are required to pass a background check before making deliveries. This is a standard process run through a third-party screening service.
            </SizableText>
          </YStack>

          {/* Status banner for existing submissions */}
          {hasExisting && !showForm && (
            <StatusBanner
              status={existing.status}
              adminNote={existing.admin_note}
              externalRef={existing.external_ref}
              onResubmit={isRejected ? () => setShowForm(true) : undefined}
            />
          )}

          {/* What is checked info card */}
          {!hasExisting && (
            <YStack
              backgroundColor="$color2"
              borderRadius="$4"
              borderWidth={1}
              borderColor="$borderColor"
              padding="$4"
              space="$3"
            >
              <SizableText size="$2" fontWeight="700" color="$color10">WHAT IS CHECKED</SizableText>
              {[
                'Criminal history (federal, state, county)',
                'Sex offender registry',
                'Global watchlist / terrorist screening',
                'Motor vehicle record (MVR)',
                'Identity verification',
              ].map((item, i) => (
                <XStack key={i} space="$3" alignItems="center">
                  <CheckCircle size={15} color="$color8" />
                  <SizableText size="$3" color="$color11">{item}</SizableText>
                </XStack>
              ))}

              {/* FCRA notice */}
              <YStack
                backgroundColor="$color3"
                borderRadius="$3"
                padding="$3"
                space="$1"
                borderWidth={1}
                borderColor="$color5"
              >
                <SizableText size="$1" fontWeight="700" color="$color9">YOUR FCRA RIGHTS</SizableText>
                <SizableText size="$2" color="$color9" lineHeight={18}>
                  Under the Fair Credit Reporting Act (FCRA), you have the right to know if information in your background report is used against you. You may request a copy of your report and dispute inaccuracies with the reporting agency.
                </SizableText>
              </YStack>
            </YStack>
          )}

          {/* Authorization form */}
          {showUploadForm && !isPending && !isApproved && (
            <YStack space="$4">
              <XStack justifyContent="space-between" alignItems="center">
                <SizableText size="$2" fontWeight="700" color="$color10">AUTHORIZATION FORM</SizableText>
                <Pressable
                  onPress={() => {
                    setDob('01/15/1990');
                    setSsn4('1234');
                    setAddress('123 Test Street');
                    setCity('Sahuarita');
                    setState('AZ');
                    setZip('85629');
                    setAgreed(true);
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? 'rgba(0,102,255,0.2)' : 'rgba(0,102,255,0.1)',
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: 'rgba(0,102,255,0.35)',
                  })}
                >
                  <SizableText size="$1" fontWeight="700" color="$blue9">⚡ Fill test data</SizableText>
                </Pressable>
              </XStack>

              <Field
                label="DATE OF BIRTH"
                value={dob}
                onChangeText={setDob}
                placeholder="MM/DD/YYYY"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                icon={<Calendar size={18} color="$color9" />}
                hint="Used for identity verification only"
                error={errors.dob}
                autoCapitalize="none"
              />

              <Field
                label="LAST 4 OF SSN"
                value={ssn4}
                onChangeText={(v) => setSsn4(v.replace(/\D/g, '').slice(0, 4))}
                placeholder="XXXX"
                keyboardType="number-pad"
                maxLength={4}
                icon={<Lock size={18} color="$color9" />}
                secureTextEntry
                hint="We only collect the last 4 digits — never your full SSN"
                error={errors.ssn4}
                autoCapitalize="none"
              />

              <Field
                label="STREET ADDRESS"
                value={address}
                onChangeText={setAddress}
                placeholder="123 Main St"
                icon={<MapPin size={18} color="$color9" />}
                error={errors.address}
              />

              <XStack space="$3">
                <YStack flex={2}>
                  <Field
                    label="CITY"
                    value={city}
                    onChangeText={setCity}
                    placeholder="Sahuarita"
                    icon={<MapPin size={16} color="$color9" />}
                    error={errors.city}
                  />
                </YStack>
                <YStack flex={1}>
                  <Field
                    label="STATE"
                    value={state}
                    onChangeText={(v) => setState(v.toUpperCase().slice(0, 2))}
                    placeholder="AZ"
                    maxLength={2}
                    icon={<MapPin size={16} color="$color9" />}
                    error={errors.state}
                    autoCapitalize="characters"
                  />
                </YStack>
                <YStack flex={1}>
                  <Field
                    label="ZIP"
                    value={zip}
                    onChangeText={(v) => setZip(v.replace(/\D/g, '').slice(0, 5))}
                    placeholder="85629"
                    keyboardType="number-pad"
                    maxLength={5}
                    icon={<MapPin size={16} color="$color9" />}
                    error={errors.zip}
                    autoCapitalize="none"
                  />
                </YStack>
              </XStack>

              {/* Privacy notice */}
              <YStack
                backgroundColor="$color3"
                borderRadius="$3"
                padding="$3"
                space="$1"
                borderWidth={1}
                borderColor="$color5"
              >
                <XStack space="$2" alignItems="flex-start">
                  <Lock size={14} color="$color9" />
                  <SizableText size="$2" color="$color9" flex={1} lineHeight={18}>
                    Your personal information is encrypted and used solely to run your background check. It is never shared with third parties beyond the authorized screening provider.
                  </SizableText>
                </XStack>
              </YStack>

              {/* Consent checkbox */}
              <Pressable
                onPress={() => setAgreed((v) => !v)}
                style={styles.consentRow}
              >
                {agreed
                  ? <CheckSquare size={22} color="$green9" />
                  : <Square size={22} color="$color9" />}
                <SizableText size="$2" color="$color10" flex={1} lineHeight={20}>
                  I authorize {APP_CONFIG.STORE_NAME} and its designated screening provider to obtain a consumer report and/or investigative consumer report for employment purposes. I understand this report may include information on my criminal history, driving record, and identity. I acknowledge my FCRA rights described above.
                </SizableText>
              </Pressable>

              {/* Error */}
              {!!submitError && (
                <XStack
                  backgroundColor="$red2"
                  borderRadius="$3"
                  padding="$3"
                  space="$2"
                  alignItems="center"
                  borderWidth={1}
                  borderColor="$red5"
                >
                  <AlertCircle size={16} color="$red9" />
                  <SizableText size="$2" color="$red10" flex={1}>{submitError}</SizableText>
                </XStack>
              )}

              {/* Submit */}
              <Pressable
                onPress={handleSubmit}
                disabled={submit.isPending}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.submitBtnPressed,
                  submit.isPending && styles.submitBtnDisabled,
                ]}
              >
                {submit.isPending ? (
                  <XStack space="$2" alignItems="center">
                    <ActivityIndicator color="white" size="small" />
                    <SizableText size="$4" fontWeight="700" color="white">Submitting…</SizableText>
                  </XStack>
                ) : (
                  <XStack space="$2" alignItems="center">
                    <Shield size={20} color="white" />
                    <SizableText size="$4" fontWeight="800" color="white">
                      Submit Authorization
                    </SizableText>
                  </XStack>
                )}
              </Pressable>
            </YStack>
          )}

          {/* Submitted summary (pending / in_review) */}
          {isPending && existing && (
            <YStack
              backgroundColor="$color2"
              borderRadius="$4"
              borderWidth={1}
              borderColor="$borderColor"
              padding="$4"
              space="$3"
            >
              <SizableText size="$2" fontWeight="700" color="$color10">SUBMITTED INFORMATION</SizableText>
              <XStack space="$3">
                <YStack flex={1} space="$1">
                  <SizableText size="$1" color="$color9">DOB</SizableText>
                  <SizableText size="$3" color="$color12">{existing.date_of_birth}</SizableText>
                </YStack>
                <YStack flex={1} space="$1">
                  <SizableText size="$1" color="$color9">SSN LAST 4</SizableText>
                  <SizableText size="$3" color="$color12">••••{existing.ssn_last4}</SizableText>
                </YStack>
              </XStack>
              <YStack space="$1">
                <SizableText size="$1" color="$color9">ADDRESS</SizableText>
                <SizableText size="$3" color="$color12">
                  {existing.address}, {existing.city}, {existing.state} {existing.zip}
                </SizableText>
              </YStack>
            </YStack>
          )}

        </YStack>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: colors.text,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  submitBtn: {
    height: 56,
    borderRadius: borderRadius.xl,
    backgroundColor: APP_CONFIG.PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  submitBtnDisabled: { opacity: 0.45 },
  resubmitBtn: {
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: APP_CONFIG.PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
