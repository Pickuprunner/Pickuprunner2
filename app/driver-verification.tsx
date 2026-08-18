import React, { useState } from 'react';
import {
  ScrollView,
  Platform,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  YStack,
  XStack,
  SizableText,
  SafeArea,
  ArrowLeft,
  ShieldCheck,
  Upload,
  FileText,
  Car,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  ChevronRight,
  ArrowRight,
} from '@blinkdotnew/mobile-ui';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { blink } from '@/lib/blink';
import { useAuth } from '@/hooks/useAuth';
import { useMyVerification, useSubmitVerification } from '@/lib/verification';
import { APP_CONFIG } from '@/lib/config';
import { colors, spacing, borderRadius } from '@/constants/design';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DocState {
  uri: string | null;
  name: string;
  uploading: boolean;
  publicUrl: string | null;
  progress: number;
}

const EMPTY_DOC: DocState = {
  uri: null,
  name: '',
  uploading: false,
  publicUrl: null,
  progress: 0,
};

// ── Status Banner ──────────────────────────────────────────────────────────────

function StatusBanner({
  status,
  adminNote,
  onResubmit,
}: {
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  onResubmit?: () => void;
}) {
  if (status === 'approved') {
    return (
      <YStack
        backgroundColor="$green2"
        borderRadius="$4"
        borderWidth={1}
        borderColor="$green5"
        padding="$4"
        space="$2"
      >
        <XStack space="$3" alignItems="center">
          <ShieldCheck size={28} color="$green9" />
          <YStack flex={1}>
            <SizableText size="$5" fontWeight="800" color="$green10">
              Verification Approved ✓
            </SizableText>
            <SizableText size="$2" color="$green9">
              Your account is fully verified. You can accept deliveries.
            </SizableText>
          </YStack>
        </XStack>
      </YStack>
    );
  }

  if (status === 'pending') {
    return (
      <YStack
        backgroundColor="$amber2"
        borderRadius="$4"
        borderWidth={1}
        borderColor="$amber5"
        padding="$4"
        space="$2"
      >
        <XStack space="$3" alignItems="center">
          <Clock size={28} color="$amber9" />
          <YStack flex={1}>
            <SizableText size="$5" fontWeight="800" color="$amber10">
              Under Review
            </SizableText>
            <SizableText size="$2" color="$amber9">
              Your documents are being reviewed by the admin. This usually takes less than 24 hours.
            </SizableText>
          </YStack>
        </XStack>
      </YStack>
    );
  }

  // Rejected
  return (
    <YStack
      backgroundColor="$red2"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$red5"
      padding="$4"
      space="$3"
    >
      <XStack space="$3" alignItems="center">
        <XCircle size={28} color="$red9" />
        <YStack flex={1}>
          <SizableText size="$5" fontWeight="800" color="$red10">
            Verification Rejected
          </SizableText>
          {adminNote ? (
            <SizableText size="$2" color="$red9">{adminNote}</SizableText>
          ) : (
            <SizableText size="$2" color="$red9">
              Please re-upload clearer documents and resubmit.
            </SizableText>
          )}
        </YStack>
      </XStack>
      {onResubmit && (
        <Pressable
          onPress={onResubmit}
          style={({ pressed }) => [styles.resubmitBtn, pressed && { opacity: 0.8 }]}
        >
          <SizableText size="$3" fontWeight="700" color="white">
            Resubmit Documents
          </SizableText>
        </Pressable>
      )}
    </YStack>
  );
}

// ── Doc Upload Card ────────────────────────────────────────────────────────────

function DocUploadCard({
  label,
  description,
  icon,
  doc,
  onPick,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  doc: DocState;
  onPick: () => void;
}) {
  const hasDoc = !!doc.publicUrl;

  return (
    <Pressable
      onPress={onPick}
      disabled={doc.uploading}
      style={({ pressed }) => [
        styles.docCard,
        hasDoc && styles.docCardDone,
        pressed && !doc.uploading && { opacity: 0.85 },
      ]}
    >
      <XStack space="$4" alignItems="center">
        {/* Icon circle */}
        <YStack
          width={52}
          height={52}
          borderRadius={26}
          backgroundColor={hasDoc ? 'rgba(22,163,74,0.12)' : 'rgba(204,0,0,0.08)'}
          alignItems="center"
          justifyContent="center"
          borderWidth={1.5}
          borderColor={hasDoc ? 'rgba(22,163,74,0.35)' : 'rgba(204,0,0,0.25)'}
        >
          {doc.uploading ? (
            <ActivityIndicator size="small" color={APP_CONFIG.PRIMARY_COLOR} />
          ) : hasDoc ? (
            <CheckCircle size={26} color="$green9" />
          ) : (
            icon
          )}
        </YStack>

        {/* Text */}
        <YStack flex={1} space="$0">
          <SizableText size="$4" fontWeight="700" color="$color12">{label}</SizableText>
          {doc.uploading ? (
            <SizableText size="$2" color="$amber9">
              Uploading… {doc.progress > 0 ? `${Math.round(doc.progress)}%` : ''}
            </SizableText>
          ) : hasDoc ? (
            <SizableText size="$2" color="$green9" numberOfLines={1}>
              ✓ {doc.name || 'Uploaded'}
            </SizableText>
          ) : (
            <SizableText size="$2" color="$color10">{description}</SizableText>
          )}
        </YStack>

        {/* Arrow / replace hint */}
        {!doc.uploading && (
          <YStack alignItems="center" space="$0">
            {hasDoc ? (
              <SizableText size="$1" color="$color9">Replace</SizableText>
            ) : (
              <Upload size={18} color="$color9" />
            )}
          </YStack>
        )}
      </XStack>

      {/* Progress bar */}
      {doc.uploading && doc.progress > 0 && (
        <YStack marginTop="$2" height={3} backgroundColor="$color4" borderRadius={2}>
          <YStack
            height={3}
            borderRadius={2}
            backgroundColor={APP_CONFIG.PRIMARY_COLOR}
            width={`${doc.progress}%` as any}
          />
        </YStack>
      )}
    </Pressable>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function DriverVerificationScreen() {
  const { user, isAuthenticated } = useAuth();
  const { data: existing, isLoading } = useMyVerification(user?.id);
  const submitVerification = useSubmitVerification();

  const [license, setLicense] = useState<DocState>(EMPTY_DOC);
  const [insurance, setInsurance] = useState<DocState>(EMPTY_DOC);
  const [showForm, setShowForm] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const isVerified = existing?.status === 'approved';
  const isPending = existing?.status === 'pending';
  const isRejected = existing?.status === 'rejected';
  const hasExisting = !!existing;
  const showUploadForm = showForm || !hasExisting;

  // ── File picker + upload ─────────────────────────────────────────────────────

  const pickAndUpload = async (
    docType: 'license' | 'insurance',
    setter: React.Dispatch<React.SetStateAction<DocState>>
  ) => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to upload documents.');
      return;
    }

    // On web, use file input element
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.pdf';
      input.onchange = async (e: any) => {
        const file: File = e.target.files?.[0];
        if (!file) return;
        setter((s) => ({ ...s, uri: 'pending', name: file.name, uploading: true, progress: 0 }));
        try {
          const ext = file.name.split('.').pop() ?? 'jpg';
          const path = `driver-docs/${user.id}/${docType}-${Date.now()}.${ext}`;
          const { publicUrl } = await blink.storage.upload(file, path, {
            onProgress: (pct) => setter((s) => ({ ...s, progress: pct })),
          });
          setter({ uri: publicUrl, name: file.name, uploading: false, publicUrl, progress: 100 });
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } catch (err: any) {
          setter(EMPTY_DOC);
          Alert.alert('Upload failed', err?.message ?? 'Please try again.');
        }
      };
      input.click();
      return;
    }

    // Native: request permission + launch picker
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo library access to upload documents.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const filename = asset.fileName ?? `${docType}-${Date.now()}.jpg`;

    setter((s) => ({ ...s, uri, name: filename, uploading: true, progress: 0 }));

    try {
      // Convert URI to blob on native
      const response = await fetch(uri);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      const ext = filename.split('.').pop() ?? 'jpg';
      const path = `driver-docs/${user.id}/${docType}-${Date.now()}.${ext}`;

      const { publicUrl } = await blink.storage.upload(file, path, {
        onProgress: (pct) => setter((s) => ({ ...s, progress: pct })),
      });

      setter({ uri: publicUrl, name: filename, uploading: false, publicUrl, progress: 100 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      setter(EMPTY_DOC);
      Alert.alert('Upload failed', err?.message ?? 'Please try again.');
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitError('');

    if (!license.publicUrl) {
      setSubmitError("Please upload a photo of your driver's license.");
      return;
    }
    if (!insurance.publicUrl) {
      setSubmitError('Please upload proof of insurance.');
      return;
    }

    try {
      await submitVerification.mutateAsync({
        userId: user!.id,
        driverName: user!.displayName || user!.email || 'Driver',
        driverEmail: user!.email,
        licenseUrl: license.publicUrl,
        licenseFilename: license.name,
        insuranceUrl: insurance.publicUrl,
        insuranceFilename: insurance.name,
        existingId: existing?.id,
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setShowForm(false);
      setLicense(EMPTY_DOC);
      setInsurance(EMPTY_DOC);
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Submission failed. Please try again.');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const canSubmit =
    !!license.publicUrl &&
    !!insurance.publicUrl &&
    !license.uploading &&
    !insurance.uploading;

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
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          hitSlop={12}
        >
          <ArrowLeft size={22} color="$color10" />
        </Pressable>
        <XStack flex={1} space="$2" alignItems="center">
          <ShieldCheck size={18} color={APP_CONFIG.PRIMARY_COLOR} />
          <SizableText size="$5" fontWeight="800" color="$color12">
            Driver Verification
          </SizableText>
        </XStack>
        {/* Status pill */}
        {existing && (
          <YStack
            paddingHorizontal={10}
            paddingVertical={4}
            borderRadius={999}
            backgroundColor={
              isVerified ? 'rgba(22,163,74,0.12)' :
              isPending  ? 'rgba(217,119,6,0.12)'  :
                           'rgba(220,38,38,0.12)'
            }
          >
            <SizableText
              size="$1"
              fontWeight="800"
              color={isVerified ? '$green9' : isPending ? '$amber9' : '$red9'}
            >
              {isVerified ? 'APPROVED' : isPending ? 'PENDING' : 'REJECTED'}
            </SizableText>
          </YStack>
        )}
      </XStack>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <YStack space="$5">

          {/* Intro */}
          <YStack space="$2">
            <SizableText size="$6" fontWeight="800" color="$color12">
              Verify Your Identity
            </SizableText>
            <SizableText size="$3" color="$color10" lineHeight={22}>
              To make deliveries for {APP_CONFIG.STORE_NAME}, you must upload a valid driver's license and current proof of vehicle insurance. Documents are reviewed by the admin within 24 hours.
            </SizableText>
          </YStack>

          {/* Status banner for existing submissions */}
          {hasExisting && !showForm && (
            <StatusBanner
              status={existing.status}
              adminNote={existing.admin_note}
              onResubmit={isRejected ? () => setShowForm(true) : undefined}
            />
          )}

          {/* What we check */}
          {!hasExisting && (
            <YStack
              backgroundColor="$color2"
              borderRadius="$4"
              borderWidth={1}
              borderColor="$borderColor"
              padding="$4"
              space="$3"
            >
              <SizableText size="$2" fontWeight="700" color="$color10">
                WHAT WE VERIFY
              </SizableText>
              {[
                { icon: <Car size={16} color="$color9" />, text: "Valid driver's license (not expired)" },
                { icon: <FileText size={16} color="$color9" />, text: 'Current vehicle insurance policy' },
                { icon: <ShieldCheck size={16} color="$color9" />, text: 'Identity matching your account name' },
                { icon: <CheckCircle size={16} color="$color9" />, text: 'Arizona state driving eligibility' },
              ].map((item, i) => (
                <XStack key={i} space="$3" alignItems="center">
                  {item.icon}
                  <SizableText size="$3" color="$color11">{item.text}</SizableText>
                </XStack>
              ))}
            </YStack>
          )}

          {/* Upload form — shown for new submissions or resubmissions */}
          {(showUploadForm) && !isPending && !isVerified && (
            <YStack space="$4">
              <XStack justifyContent="space-between" alignItems="center">
                <SizableText size="$2" fontWeight="700" color="$color10">UPLOAD DOCUMENTS</SizableText>
                <Pressable
                  onPress={() => {
                    setLicense({ uri: 'https://picsum.photos/400/250', name: 'test-license.jpg', uploading: false, publicUrl: 'https://picsum.photos/400/250', progress: 100 });
                    setInsurance({ uri: 'https://picsum.photos/400/250', name: 'test-insurance.jpg', uploading: false, publicUrl: 'https://picsum.photos/400/250', progress: 100 });
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

              <DocUploadCard
                label="Driver's License"
                description="Front side — tap to choose photo or PDF"
                icon={<Car size={26} color={APP_CONFIG.PRIMARY_COLOR} />}
                doc={license}
                onPick={() => pickAndUpload('license', setLicense)}
              />

              <DocUploadCard
                label="Proof of Insurance"
                description="Insurance card or declaration page"
                icon={<FileText size={26} color={APP_CONFIG.PRIMARY_COLOR} />}
                doc={insurance}
                onPick={() => pickAndUpload('insurance', setInsurance)}
              />

              {/* Tips */}
              <YStack
                backgroundColor="$blue2"
                borderRadius="$3"
                padding="$3"
                space="$2"
                borderWidth={1}
                borderColor="$blue4"
              >
                <SizableText size="$2" fontWeight="700" color="$blue10">TIPS FOR BEST RESULTS</SizableText>
                {[
                  'Use good lighting — avoid glare and shadows',
                  'Ensure all text is readable and not cut off',
                  'Accepted formats: JPG, PNG, HEIC, PDF',
                  'Max file size: 10 MB',
                ].map((tip, i) => (
                  <XStack key={i} space="$2" alignItems="flex-start">
                    <SizableText size="$2" color="$blue9">•</SizableText>
                    <SizableText size="$2" color="$blue9" flex={1}>{tip}</SizableText>
                  </XStack>
                ))}
              </YStack>

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
                disabled={!canSubmit || submitVerification.isPending}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && canSubmit && styles.submitBtnPressed,
                  (!canSubmit || submitVerification.isPending) && styles.submitBtnDisabled,
                ]}
              >
                {submitVerification.isPending ? (
                  <XStack space="$2" alignItems="center">
                    <ActivityIndicator color="white" size="small" />
                    <SizableText size="$4" fontWeight="700" color="white">Submitting…</SizableText>
                  </XStack>
                ) : (
                  <XStack space="$2" alignItems="center">
                    <ShieldCheck size={20} color="white" />
                    <SizableText size="$4" fontWeight="800" color="white">
                      Submit for Review
                    </SizableText>
                  </XStack>
                )}
              </Pressable>
            </YStack>
          )}



          {/* Approved state — show what was submitted */}
          {isVerified && existing && (
            <YStack space="$3">
              <SizableText size="$2" fontWeight="700" color="$color10">SUBMITTED DOCUMENTS</SizableText>
              <YStack
                backgroundColor="$color2"
                borderRadius="$4"
                borderWidth={1}
                borderColor="$borderColor"
                padding="$4"
                space="$3"
              >
                <XStack space="$3" alignItems="center" justifyContent="space-between">
                  <XStack space="$2" alignItems="center">
                    <Car size={18} color="$green9" />
                    <SizableText size="$3" color="$color12" fontWeight="600">Driver's License</SizableText>
                  </XStack>
                  <SizableText size="$2" color="$green9">✓ Verified</SizableText>
                </XStack>
                <XStack space="$3" alignItems="center" justifyContent="space-between">
                  <XStack space="$2" alignItems="center">
                    <FileText size={18} color="$green9" />
                    <SizableText size="$3" color="$color12" fontWeight="600">Proof of Insurance</SizableText>
                  </XStack>
                  <SizableText size="$2" color="$green9">✓ Verified</SizableText>
                </XStack>
              </YStack>
            </YStack>
          )}

          {/* Pending — show what was submitted */}
          {isPending && existing && (
            <YStack space="$3">
              <SizableText size="$2" fontWeight="700" color="$color10">DOCUMENTS SUBMITTED</SizableText>
              <YStack
                backgroundColor="$color2"
                borderRadius="$4"
                borderWidth={1}
                borderColor="$borderColor"
                padding="$4"
                space="$3"
              >
                <XStack space="$2" alignItems="center">
                  <Car size={16} color="$color9" />
                  <SizableText size="$3" color="$color10">
                    License: {existing.license_filename || 'uploaded'}
                  </SizableText>
                </XStack>
                <XStack space="$2" alignItems="center">
                  <FileText size={16} color="$color9" />
                  <SizableText size="$3" color="$color10">
                    Insurance: {existing.insurance_filename || 'uploaded'}
                  </SizableText>
                </XStack>
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
  docCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  docCardDone: {
    borderColor: 'rgba(22,163,74,0.4)',
    backgroundColor: 'rgba(22,163,74,0.04)',
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
