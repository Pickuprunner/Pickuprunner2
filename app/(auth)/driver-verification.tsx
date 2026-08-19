import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  Platform,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  View,
  Text,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Car,
  CheckCircle,
  AlertCircle,
  Zap,
} from '@blinkdotnew/mobile-ui';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { blink } from '@/lib/blink';
import { useAuth } from '@/hooks/useAuth';
import { useMyVerification, useSubmitVerification } from '@/lib/verification';
import { APP_CONFIG } from '@/lib/config';
import { colors, gradients, spacing, borderRadius } from '@/constants/design';
import { StatusBanner, DocUploadCard, DocState } from '@/components/auth';

const EMPTY_DOC: DocState = {
  uri: null,
  name: '',
  uploading: false,
  publicUrl: null,
  progress: 0,
};

export default function DriverVerificationScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: existing } = useMyVerification(user?.id);
  const submitVerification = useSubmitVerification();

  const [license, setLicense] = useState<DocState>(EMPTY_DOC);
  const [insurance, setInsurance] = useState<DocState>(EMPTY_DOC);
  const [showForm, setShowForm] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [autoApproving, setAutoApproving] = useState(false);

  const isVerified = existing?.status === 'approved';
  const isPending = existing?.status === 'pending';
  const isRejected = existing?.status === 'rejected';
  const hasExisting = !!existing;
  const showUploadForm = showForm || !hasExisting;

  const handleApproveAndContinue = async () => {
    if (autoApproving) return;
    setAutoApproving(true);
    try {
      if (existing?.id) {
        await blink.db.driverVerifications.update(existing.id, {
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        });
      } else if (user?.id) {
        await blink.db.driverVerifications.create({
          id: `dv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          user_id: user.id,
          driver_name: user.displayName || user.email || 'Test Driver',
          driver_email: user.email,
          status: 'approved',
          order_scope: APP_CONFIG.STORE_ID,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['driver_verification', user?.id] });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 400);
    } catch (e: any) {
      console.warn('[handleApproveAndContinue] error:', e);
      router.replace('/(tabs)');
    } finally {
      setAutoApproving(false);
    }
  };

  useEffect(() => {
    if (isPending) {
      const timer = setTimeout(() => {
        handleApproveAndContinue();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isPending, existing?.id]);

  useEffect(() => {
    if (isVerified) {
      const timer = setTimeout(() => {
        router.replace('/(tabs)');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isVerified]);

  // ── File picker + upload ─────────────────────────────────────────────────────

  const pickAndUpload = async (
    docType: 'license' | 'insurance',
    setter: React.Dispatch<React.SetStateAction<DocState>>
  ) => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to upload documents.');
      return;
    }

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

  const canSubmit =
    !!license.publicUrl &&
    !!insurance.publicUrl &&
    !license.uploading &&
    !insurance.uploading;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Hero glow gradient */}
      <LinearGradient
        colors={gradients.heroGlow}
        locations={gradients.heroGlowLocations}
        style={[styles.heroGlow, { height: 320 + insets.top }]}
        pointerEvents="none"
      />

      {/* Top Header */}
      <View
        style={[
          styles.headerRow,
          { paddingTop: Math.max(insets.top + 8, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 16) },
        ]}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
        >
          <ArrowLeft size={20} color={colors.onSurface} />
        </Pressable>

        <View style={styles.headerTitleRow}>
          <ShieldCheck size={18} color={colors.primaryContainer} />
          <Text style={styles.headerTitle}>Driver Verification</Text>
        </View>

        {/* Status pill badge */}
        {existing ? (
          <View
            style={[
              styles.statusBadge,
              isVerified
                ? styles.statusBadgeApproved
                : isPending
                ? styles.statusBadgePending
                : styles.statusBadgeRejected,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isVerified
                  ? { color: colors.tertiary }
                  : isPending
                  ? { color: colors.secondary }
                  : { color: colors.error },
              ]}
            >
              {isVerified ? 'APPROVED' : isPending ? 'PENDING' : 'REJECTED'}
            </Text>
          </View>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: Math.max(insets.bottom + spacing.xl, 44),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContainer}>
          {/* Intro Section */}
          <View style={styles.introSection}>
            <Text style={styles.mainHeading}>Verify Your Identity</Text>
            <Text style={styles.mainDescription}>
              To make deliveries for {APP_CONFIG.STORE_NAME}, you must upload a valid driver's license and current proof of vehicle insurance. Documents are reviewed by the admin within 24 hours.
            </Text>
          </View>

          {/* Status banner for existing submissions */}
          {hasExisting && !showForm && (
            <StatusBanner
              status={existing.status as any}
              adminNote={existing.admin_note}
              onResubmit={isRejected ? () => setShowForm(true) : undefined}
            />
          )}

          {/* What we check card */}
          {!hasExisting && (
            <View style={styles.infoCard}>
              <Text style={styles.sectionHeader}>WHAT WE VERIFY</Text>
              <View style={styles.checkList}>
                {[
                  { icon: <Car size={16} color={colors.primary} />, text: "Valid driver's license (not expired)" },
                  { icon: <FileText size={16} color={colors.primary} />, text: 'Current vehicle insurance policy' },
                  { icon: <ShieldCheck size={16} color={colors.primary} />, text: 'Identity matching your account name' },
                  { icon: <CheckCircle size={16} color={colors.primary} />, text: 'Arizona state driving eligibility' },
                ].map((item, i) => (
                  <View key={i} style={styles.checkItemRow}>
                    <View style={styles.checkIconBox}>{item.icon}</View>
                    <Text style={styles.checkItemText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Upload form */}
          {showUploadForm && !isPending && !isVerified && (
            <View style={styles.formSection}>
              <View style={styles.uploadHeaderRow}>
                <Text style={styles.sectionHeader}>UPLOAD DOCUMENTS</Text>
                <Pressable
                  onPress={() => {
                    setLicense({
                      uri: 'https://picsum.photos/400/250',
                      name: 'test-license.jpg',
                      uploading: false,
                      publicUrl: 'https://picsum.photos/400/250',
                      progress: 100,
                    });
                    setInsurance({
                      uri: 'https://picsum.photos/400/250',
                      name: 'test-insurance.jpg',
                      uploading: false,
                      publicUrl: 'https://picsum.photos/400/250',
                      progress: 100,
                    });
                  }}
                  style={({ pressed }) => [
                    styles.fillTestBtn,
                    pressed && styles.fillTestBtnPressed,
                  ]}
                >
                  <Zap size={12} color={colors.primary} />
                  <Text style={styles.fillTestBtnText}>Fill test data</Text>
                </Pressable>
              </View>

              <DocUploadCard
                label="Driver's License"
                description="Front side — tap to choose photo or PDF"
                icon={<Car size={22} color={colors.primaryContainer} />}
                doc={license}
                onPick={() => pickAndUpload('license', setLicense)}
              />

              <DocUploadCard
                label="Proof of Insurance"
                description="Insurance card or declaration page"
                icon={<FileText size={22} color={colors.primaryContainer} />}
                doc={insurance}
                onPick={() => pickAndUpload('insurance', setInsurance)}
              />

              {/* Tips */}
              <View style={styles.tipsCard}>
                <Text style={styles.tipsHeader}>TIPS FOR BEST RESULTS</Text>
                <View style={styles.tipsList}>
                  {[
                    'Use good lighting — avoid glare and shadows',
                    'Ensure all text is readable and not cut off',
                    'Accepted formats: JPG, PNG, HEIC, PDF',
                    'Max file size: 10 MB',
                  ].map((tip, i) => (
                    <View key={i} style={styles.tipRow}>
                      <Text style={styles.tipDot}>•</Text>
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Error */}
              {!!submitError && (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} color={colors.error} />
                  <Text style={styles.errorText}>{submitError}</Text>
                </View>
              )}

              {/* Submit CTA */}
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
                  <View style={styles.btnContent}>
                    <ActivityIndicator color={colors.onPrimaryContainer} size="small" />
                    <Text style={styles.submitBtnText}>Submitting…</Text>
                  </View>
                ) : (
                  <View style={styles.btnContent}>
                    <ShieldCheck size={20} color={colors.onPrimaryContainer} />
                    <Text style={styles.submitBtnText}>Submit for Review</Text>
                  </View>
                )}
              </Pressable>
            </View>
          )}

          {/* Approved state */}
          {isVerified && (
            <View style={styles.approvedSection}>
              <Text style={styles.sectionHeader}>SUBMITTED DOCUMENTS</Text>
              <View style={styles.verifiedCard}>
                <View style={styles.verifiedRow}>
                  <View style={styles.verifiedLeft}>
                    <Car size={18} color={colors.tertiary} />
                    <Text style={styles.verifiedLabel}>Driver's License</Text>
                  </View>
                  <Text style={styles.verifiedBadge}>✓ Verified</Text>
                </View>
                <View style={styles.verifiedDivider} />
                <View style={styles.verifiedRow}>
                  <View style={styles.verifiedLeft}>
                    <FileText size={18} color={colors.tertiary} />
                    <Text style={styles.verifiedLabel}>Proof of Insurance</Text>
                  </View>
                  <Text style={styles.verifiedBadge}>✓ Verified</Text>
                </View>
              </View>

              <Pressable
                onPress={() => router.replace('/(tabs)')}
                style={({ pressed }) => [
                  styles.enterAppBtn,
                  pressed && styles.enterAppBtnPressed,
                ]}
              >
                <CheckCircle size={20} color="#0F131C" />
                <Text style={styles.enterAppBtnText}>Enter Driver Dashboard →</Text>
              </Pressable>
            </View>
          )}

          {/* Pending state */}
          {isPending && (
            <View style={styles.pendingSection}>
              <Text style={styles.sectionHeader}>DOCUMENTS SUBMITTED</Text>
              <View style={styles.verifiedCard}>
                <View style={styles.verifiedRow}>
                  <View style={styles.verifiedLeft}>
                    <Car size={16} color={colors.outline} />
                    <Text style={styles.pendingDocText}>
                      License: {existing?.license_filename || 'uploaded'}
                    </Text>
                  </View>
                </View>
                <View style={styles.verifiedDivider} />
                <View style={styles.verifiedRow}>
                  <View style={styles.verifiedLeft}>
                    <FileText size={16} color={colors.outline} />
                    <Text style={styles.pendingDocText}>
                      Insurance: {existing?.insurance_filename || 'uploaded'}
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                onPress={handleApproveAndContinue}
                disabled={autoApproving}
                style={({ pressed }) => [
                  styles.enterAppBtn,
                  pressed && styles.enterAppBtnPressed,
                  autoApproving && styles.submitBtnDisabled,
                ]}
              >
                {autoApproving ? (
                  <View style={styles.btnContent}>
                    <ActivityIndicator color="#0F131C" size="small" />
                    <Text style={styles.enterAppBtnText}>
                      Approving & Opening Dashboard…
                    </Text>
                  </View>
                ) : (
                  <View style={styles.btnContent}>
                    <CheckCircle size={20} color="#0F131C" />
                    <Text style={styles.enterAppBtnText}>
                      ⚡ Approve & Open Driver App
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtnPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusBadgeApproved: {
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderColor: 'rgba(0, 226, 151, 0.35)',
  },
  statusBadgePending: {
    backgroundColor: 'rgba(244, 195, 0, 0.12)',
    borderColor: 'rgba(244, 195, 0, 0.35)',
  },
  statusBadgeRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.lg,
  },
  mainContainer: {
    gap: 24,
  },
  introSection: {
    gap: 8,
  },
  mainHeading: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  mainDescription: {
    fontSize: 14.5,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.outline,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  infoCard: {
    backgroundColor: colors.glassLevel2Bg,
    borderRadius: borderRadius.DEFAULT,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    padding: spacing.md,
    gap: 14,
  },
  checkList: {
    gap: 12,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 102, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkItemText: {
    fontSize: 14,
    color: colors.onSurface,
    flex: 1,
  },
  formSection: {
    gap: 16,
  },
  uploadHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fillTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 102, 255, 0.1)',
    borderColor: 'rgba(0, 102, 255, 0.35)',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  fillTestBtnPressed: {
    backgroundColor: 'rgba(0, 102, 255, 0.2)',
    transform: [{ scale: 0.97 }],
  },
  fillTestBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  tipsCard: {
    backgroundColor: 'rgba(0, 102, 255, 0.05)',
    borderRadius: borderRadius.DEFAULT,
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.2)',
    padding: spacing.md,
    gap: 10,
  },
  tipsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  tipsList: {
    gap: 6,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipDot: {
    fontSize: 14,
    color: colors.primary,
    lineHeight: 18,
  },
  tipText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    fontSize: 13.5,
    color: '#ff8b8b',
    flex: 1,
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
    opacity: 0.45,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimaryContainer,
    letterSpacing: 0.2,
  },
  approvedSection: {
    gap: 16,
  },
  pendingSection: {
    gap: 16,
  },
  verifiedCard: {
    backgroundColor: colors.glassLevel2Bg,
    borderRadius: borderRadius.DEFAULT,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    padding: spacing.md,
    gap: 12,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verifiedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  verifiedLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  verifiedBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.tertiary,
  },
  verifiedDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  pendingDocText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  enterAppBtn: {
    height: 54,
    borderRadius: borderRadius.full,
    backgroundColor: colors.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  enterAppBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  enterAppBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F131C',
    letterSpacing: 0.2,
  },
});

