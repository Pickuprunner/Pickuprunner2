import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  Platform,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  X,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import {
  useDriverAccreditation,
  useSaveAccreditationStep,
  useUploadAccreditationDocument,
  useRecordAccreditationConsent,
  useSubmitAccreditation,
  useCompleteAccreditation,
} from '@/lib/accreditation';
import { useMyVerification, useSubmitVerification } from '@/lib/verification';
import { colors, spacing, borderRadius } from '@/constants/design';
import { useToast } from '@/components/core';
import {
  StepIndicator,
  VehicleAddressStep,
  DriversLicenseStep,
  BackgroundCheckStep,
  InsuranceStep,
  DriverProfileStatusScreen,
  DriverWizardData,
  normalizeDateToISO,
} from '@/components/driver-verification';

export default function DriverVerificationScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ edit?: string; step?: string }>();
  const { user, isAuthenticated, token, isLoading } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user || !token)) {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(landing)/role-select');
    }
  }, [isLoading, isAuthenticated, user, token]);

  const { data: accreditationData, isLoading: accreditationLoading } = useDriverAccreditation();
  const saveStepMutation = useSaveAccreditationStep();
  const uploadDocMutation = useUploadAccreditationDocument();
  const recordConsentMutation = useRecordAccreditationConsent();
  const submitAccreditationMutation = useSubmitAccreditation();
  const completeAccreditationMutation = useCompleteAccreditation();

  const { data: existing } = useMyVerification(user?.id);
  const submitVerification = useSubmitVerification();

  const profile = accreditationData?.profile;
  const rawLicenseStatus = String(profile?.licenseStatus || accreditationData?.steps?.license || '');
  const rawInsuranceStatus = String(profile?.insuranceStatus || accreditationData?.steps?.insurance || '');
  const rawBgStatus = String(profile?.backgroundStatus || accreditationData?.steps?.backgroundCheck || '');
  const rawVehicleStatus = String((profile as any)?.vehicleStatus || (profile as any)?.vehicle_status || '');
  const isAnyStepRejected =
    profile?.accreditationStatus === 'rejected' ||
    rawVehicleStatus === 'rejected' ||
    rawLicenseStatus === 'rejected' ||
    rawInsuranceStatus === 'rejected' ||
    rawBgStatus === 'rejected';

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStep, setCurrentStep] = useState(params.step ? Number(params.step) : 1);
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  useEffect(() => {
    if (params.edit === 'true') {
      const isUnderReviewLocked = profile?.accreditationStatus === 'under_review' && !isAnyStepRejected;
      if (isUnderReviewLocked) {
        setIsEditing(false);
        setIsSubmitted(true);
      } else {
        setIsEditing(true);
        setIsSubmitted(false);
        if (params.step) {
          setCurrentStep(Number(params.step));
        }
      }
    }
  }, [params.edit, params.step, profile?.accreditationStatus, isAnyStepRejected]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        if (Platform.OS === 'android') {
          setKeyboardPadding(e.endCoordinates.height + 24);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (Platform.OS === 'android') {
          setKeyboardPadding(0);
        }
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [formData, setFormData] = useState<DriverWizardData>({
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleColor: '',
    licensePlate: '',
    address: '',
    apt: '',
    city: '',
    state: 'AZ',
    zip: '',

    licenseState: 'AZ',
    licenseNumber: '',
    licenseFullName: user?.displayName || '',
    licenseDob: '',
    licenseExpDate: '',
    licenseFrontUrl: '',
    licenseFrontName: '',
    licenseBackUrl: '',
    licenseBackName: '',

    ssnLast4: '',
    fcraAgreed: false,

    insuranceCompany: '',
    naicNumber: '',
    policyNumber: '',
    effectiveDate: '',
    expirationDate: '',
    vinNumber: '',
    insuranceDocUrl: '',
    insuranceDocName: '',
  });

  useEffect(() => {
    const profile = accreditationData?.profile;
    const isProfileSubmitted =
      Boolean(profile?.isSubmitted) ||
      profile?.accreditationStatus === 'under_review' ||
      profile?.accreditationStatus === 'approved' ||
      existing?.status === 'pending' ||
      existing?.status === 'approved';

    if (isProfileSubmitted && !isEditing && params.edit !== 'true') {
      setIsSubmitted(true);
    }

    if (profile) {
      const p = profile as any;
      setFormData((prev) => ({
        ...prev,
        vehicleMake: prev.vehicleMake || p.vehicleMake || p.vehicle_make || '',
        vehicleModel: prev.vehicleModel || p.vehicleModel || p.vehicle_model || '',
        vehicleYear: prev.vehicleYear || (p.vehicleYear ? String(p.vehicleYear) : (p.vehicle_year ? String(p.vehicle_year) : '')),
        vehicleColor: prev.vehicleColor || p.vehicleColor || p.vehicle_color || '',
        licensePlate: prev.licensePlate || p.vehiclePlate || p.vehicle_plate || p.licensePlate || p.license_plate || '',
        address: prev.address || p.streetAddress || p.street_address || p.address || '',
        apt: prev.apt || p.aptSuite || p.apt_suite || p.apt || '',
        city: prev.city || p.city || '',
        state: prev.state || p.state || 'AZ',
        zip: prev.zip || p.postalCode || p.postal_code || p.zip || '',

        licenseState: prev.licenseState || p.licenseState || p.license_state || 'AZ',
        licenseNumber: prev.licenseNumber || p.licenseNumber || p.license_number || '',
        licenseFullName: prev.licenseFullName || p.legalName || p.legal_name || p.licenseFullName || user?.displayName || '',
        licenseDob: prev.licenseDob || p.dateOfBirth || p.date_of_birth || p.licenseDob || '',
        licenseExpDate: prev.licenseExpDate || p.licenseExpirationDate || p.license_expiration_date || p.licenseExpDate || '',

        fcraAgreed: prev.fcraAgreed || Boolean(p.backgroundConsentAt || p.background_consent_at),

        insuranceCompany: prev.insuranceCompany || p.insuranceCompany || p.insurance_company || '',
        naicNumber: prev.naicNumber || p.insuranceNaicNumber || p.insurance_naic_number || p.naicNumber || '',
        policyNumber: prev.policyNumber || p.insurancePolicyNumber || p.insurance_policy_number || p.policyNumber || '',
        effectiveDate: prev.effectiveDate || p.insuranceEffectiveDate || p.insurance_effective_date || p.effectiveDate || '',
        expirationDate: prev.expirationDate || p.insuranceExpirationDate || p.insurance_expiration_date || p.expirationDate || '',
        vinNumber: prev.vinNumber || p.vehicleVin || p.vehicle_vin || p.vinNumber || '',
      }));
    } else if (existing) {
      setFormData((prev) => ({
        ...prev,
        vehicleMake: prev.vehicleMake || existing.vehicle_make || '',
        vehicleModel: prev.vehicleModel || existing.vehicle_model || '',
        vehicleYear: prev.vehicleYear || existing.vehicle_year || '',
        vehicleColor: prev.vehicleColor || existing.vehicle_color || '',
        licensePlate: prev.licensePlate || existing.license_plate || '',
        address: prev.address || existing.address || '',
        apt: prev.apt || existing.apt || '',
        city: prev.city || existing.city || '',
        state: prev.state || existing.state || 'AZ',
        zip: prev.zip || existing.zip || '',
        licenseState: prev.licenseState || existing.license_state || 'AZ',
        licenseNumber: prev.licenseNumber || existing.license_number || '',
        licenseFullName: prev.licenseFullName || existing.license_fullname || user?.displayName || '',
        licenseDob: prev.licenseDob || existing.license_dob || '',
        licenseExpDate: prev.licenseExpDate || existing.license_exp_date || '',
        ssnLast4: prev.ssnLast4 || existing.ssn_last4 || '',
        fcraAgreed: prev.fcraAgreed || Boolean(existing.fcra_agreed),
        insuranceCompany: prev.insuranceCompany || existing.insurance_company || '',
        naicNumber: prev.naicNumber || existing.naic_number || '',
        policyNumber: prev.policyNumber || existing.policy_number || '',
        effectiveDate: prev.effectiveDate || existing.effective_date || '',
        expirationDate: prev.expirationDate || existing.expiration_date || '',
        vinNumber: prev.vinNumber || existing.vin_number || '',
      }));
    }
  }, [accreditationData?.profile, existing]);

  const updateFormData = (patch: Partial<DriverWizardData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const handleStep1Next = async () => {
    try {
      await saveStepMutation.mutateAsync({
        step: 'vehicle',
        payload: {
          vehicleMake: formData.vehicleMake.trim(),
          vehicleModel: formData.vehicleModel.trim(),
          vehicleYear: parseInt(formData.vehicleYear, 10) || undefined,
          vehicleColor: formData.vehicleColor.trim(),
          vehiclePlate: formData.licensePlate.trim(),
          streetAddress: formData.address.trim(),
          aptSuite: formData.apt.trim() || undefined,
          city: formData.city.trim(),
          state: formData.state.trim().toUpperCase(),
          postalCode: formData.zip.trim(),
        },
      });
      setCurrentStep(2);
    } catch (e: any) {
      console.warn('[Accreditation] saveStep(vehicle) error:', e);
      showToast('Save Failed', { type: 'error', description: e?.message || 'Could not save vehicle info.' });
      setCurrentStep(2);
    }
  };

  const handleStep2Next = async () => {
    try {
      await saveStepMutation.mutateAsync({
        step: 'license',
        payload: {
          licenseState: formData.licenseState.trim().toUpperCase(),
          licenseNumber: formData.licenseNumber.trim(),
          legalName: formData.licenseFullName.trim(),
          dateOfBirth: normalizeDateToISO(formData.licenseDob),
          licenseExpirationDate: normalizeDateToISO(formData.licenseExpDate),
        },
      });

      if (formData.licenseFrontUrl) {
        await uploadDocMutation
          .mutateAsync({
            type: 'license_front',
            file: {
              uri: formData.licenseFrontUrl,
              name: formData.licenseFrontName || 'license_front.jpg',
            },
          })
          .catch((e) => console.warn('[Accreditation] upload license_front error:', e));
      }

      if (formData.licenseBackUrl) {
        await uploadDocMutation
          .mutateAsync({
            type: 'license_back',
            file: {
              uri: formData.licenseBackUrl,
              name: formData.licenseBackName || 'license_back.jpg',
            },
          })
          .catch((e) => console.warn('[Accreditation] upload license_back error:', e));
      }
      setCurrentStep(3);
    } catch (e: any) {
      console.warn('[Accreditation] saveStep(license) error:', e);
      showToast('Save Failed', { type: 'error', description: e?.message || 'Could not save license info.' });
      setCurrentStep(3);
    }
  };

  const handleStep3Next = async () => {
    try {
      await recordConsentMutation.mutateAsync({
        authorized: formData.fcraAgreed,
        legalName: formData.licenseFullName.trim() || user?.displayName || undefined,
      });
      setCurrentStep(4);
    } catch (e: any) {
      console.warn('[Accreditation] recordConsent error:', e);
      showToast('Consent Error', { type: 'error', description: e?.message || 'Could not record consent.' });
      setCurrentStep(4);
    }
  };

  const handleSubmitAll = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      }

      // Try bulk /complete endpoint first, with fallback to step-by-step
      try {
        await completeAccreditationMutation.mutateAsync({
          fields: {
            vehicleMake: formData.vehicleMake.trim(),
            vehicleModel: formData.vehicleModel.trim(),
            vehicleYear: parseInt(formData.vehicleYear, 10) || undefined,
            vehicleColor: formData.vehicleColor.trim(),
            vehiclePlate: formData.licensePlate.trim(),
            streetAddress: formData.address.trim(),
            aptSuite: formData.apt.trim() || undefined,
            city: formData.city.trim(),
            state: formData.state.trim().toUpperCase(),
            postalCode: formData.zip.trim(),
            legalName: formData.licenseFullName.trim(),
            licenseState: formData.licenseState.trim().toUpperCase(),
            licenseNumber: formData.licenseNumber.trim(),
            dateOfBirth: normalizeDateToISO(formData.licenseDob),
            licenseExpirationDate: normalizeDateToISO(formData.licenseExpDate),
            insuranceCompany: formData.insuranceCompany.trim(),
            insuranceNaicNumber: formData.naicNumber.trim() || undefined,
            insurancePolicyNumber: formData.policyNumber.trim(),
            insuranceEffectiveDate: normalizeDateToISO(formData.effectiveDate),
            insuranceExpirationDate: normalizeDateToISO(formData.expirationDate),
            vehicleVin: formData.vinNumber.trim() || undefined,
            authorized: formData.fcraAgreed ? 'true' : 'false',
            submit: 'true',
          },
          files: {
            license_front: formData.licenseFrontUrl ? { uri: formData.licenseFrontUrl, name: formData.licenseFrontName } : undefined,
            license_back: formData.licenseBackUrl ? { uri: formData.licenseBackUrl, name: formData.licenseBackName } : undefined,
            insurance_card: formData.insuranceDocUrl ? { uri: formData.insuranceDocUrl, name: formData.insuranceDocName } : undefined,
          },
        });
      } catch (bulkErr: any) {
        if (bulkErr?.message?.includes('already been submitted') || bulkErr?.message?.includes('under review')) {
          setIsSubmitted(true);
          setIsEditing(false);
          showToast('Profile is currently under review by compliance team.', 'info');
          return;
        }

        console.warn('[Accreditation] bulk /complete fallback to step-by-step:', bulkErr);
        await saveStepMutation.mutateAsync({
          step: 'insurance',
          payload: {
            insuranceCompany: formData.insuranceCompany.trim(),
            insuranceNaicNumber: formData.naicNumber.trim() || undefined,
            insurancePolicyNumber: formData.policyNumber.trim(),
            insuranceEffectiveDate: normalizeDateToISO(formData.effectiveDate),
            insuranceExpirationDate: normalizeDateToISO(formData.expirationDate),
            vehicleVin: formData.vinNumber.trim() || undefined,
          },
        }).catch(() => {});

        if (formData.insuranceDocUrl) {
          await uploadDocMutation
            .mutateAsync({
              type: 'insurance_card',
              file: {
                uri: formData.insuranceDocUrl,
                name: formData.insuranceDocName || 'insurance_card.jpg',
              },
            })
            .catch((e) => console.warn('[Accreditation] upload insurance_card error:', e));
        }

        await submitAccreditationMutation.mutateAsync().catch((submitErr: any) => {
          if (submitErr?.message?.includes('already been submitted') || submitErr?.message?.includes('under review')) {
            console.log('[Accreditation] Already submitted / under review');
          } else {
            throw submitErr;
          }
        });
      }

      // 3. Keep local verification store in sync
      await submitVerification.mutateAsync({
        userId: user?.id || `usr-${Date.now()}`,
        driverName: formData.licenseFullName || user?.displayName || user?.email || 'Driver',
        driverEmail: user?.email,
        existingId: existing?.id,
        status: 'pending',
        vehicle_make: formData.vehicleMake,
        vehicle_model: formData.vehicleModel,
        vehicle_year: formData.vehicleYear,
        vehicle_color: formData.vehicleColor,
        license_plate: formData.licensePlate,
        address: formData.address,
        apt: formData.apt,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        license_state: formData.licenseState,
        license_number: formData.licenseNumber,
        license_fullname: formData.licenseFullName,
        license_dob: formData.licenseDob,
        license_exp_date: formData.licenseExpDate,
        licenseUrl: formData.licenseFrontUrl,
        licenseFilename: formData.licenseFrontName || 'license_front.jpg',
        license_back_url: formData.licenseBackUrl,
        license_back_filename: formData.licenseBackName || 'license_back.jpg',
        ssn_last4: formData.ssnLast4,
        fcra_agreed: formData.fcraAgreed,
        insurance_company: formData.insuranceCompany,
        naic_number: formData.naicNumber,
        policy_number: formData.policyNumber,
        effective_date: formData.effectiveDate,
        expiration_date: formData.expirationDate,
        vin_number: formData.vinNumber,
        insuranceUrl: formData.insuranceDocUrl,
        insuranceFilename: formData.insuranceDocName || 'insurance_card.pdf',
      }).catch(() => {});

      setIsSubmitted(true);
      setIsEditing(false);
      showToast('Profile & documents submitted for admin approval!', 'success');
    } catch (err: any) {
      console.warn('Submission error:', err);
      showToast(err?.message || 'Submission failed. Please try again.', 'error');
    }
  };

  const handleHeaderBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    } else if (isEditing) {
      setIsEditing(false);
      setIsSubmitted(true);
    } else {
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace('/(tabs)');
    }
  };

  const isProfileSubmitted =
    !isEditing &&
    (isSubmitted ||
      Boolean(profile?.isSubmitted) ||
      profile?.accreditationStatus === 'under_review' ||
      profile?.accreditationStatus === 'approved' ||
      existing?.status === 'pending' ||
      existing?.status === 'approved');

  if (isProfileSubmitted) {
    return (
      <DriverProfileStatusScreen
        onEditDocuments={() => {
          if (profile?.accreditationStatus === 'under_review' && !isAnyStepRejected) {
            showToast('Application is locked while under review.', 'info');
            return;
          }
          setIsEditing(true);
          setIsSubmitted(false);
          setCurrentStep(1);
        }}
        onEditStep={(step) => {
          if (profile?.accreditationStatus === 'under_review' && !isAnyStepRejected) {
            showToast('Application is locked while under review.', 'info');
            return;
          }
          setIsEditing(true);
          setIsSubmitted(false);
          setCurrentStep(step);
        }}
      />
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(
                insets.top + spacing.xs,
                Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + spacing.xs : spacing.md
              ),
            },
          ]}
        >
          {currentStep > 1 || isEditing ? (
            <Pressable
              onPress={handleHeaderBack}
              style={styles.headerBtn}
              hitSlop={10}
            >
              <ArrowLeft size={22} color={colors.onSurface} />
            </Pressable>
          ) : (
            <View style={{ width: 38, height: 38 }} />
          )}

          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Driver Accreditation</Text>
            <Text style={styles.headerSubtitle}>
              {`Step ${currentStep} of 4`}
            </Text>
          </View>

          <View style={{ width: 38, height: 38 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: Math.max(insets.bottom, 20) + 16 + keyboardPadding },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <StepIndicator currentStep={currentStep} totalSteps={4} />

            {currentStep === 1 && (
              <VehicleAddressStep
                data={formData}
                onChange={updateFormData}
                onNext={handleStep1Next}
              />
            )}

            {currentStep === 2 && (
              <DriversLicenseStep
                data={formData}
                onChange={updateFormData}
                onNext={handleStep2Next}
                onBack={() => setCurrentStep(1)}
                onUploadDoc={(type, file) =>
                  uploadDocMutation.mutateAsync({ type, file })
                }
              />
            )}

            {currentStep === 3 && (
              <BackgroundCheckStep
                data={formData}
                onChange={updateFormData}
                onNext={handleStep3Next}
                onBack={() => setCurrentStep(2)}
              />
            )}

            {currentStep === 4 && (
              <InsuranceStep
                data={formData}
                onChange={updateFormData}
                onSubmit={handleSubmitAll}
                onBack={() => setCurrentStep(3)}
                onUploadDoc={(type, file) =>
                  uploadDocMutation.mutateAsync({ type, file })
                }
                submitting={submitVerification.isPending || submitAccreditationMutation.isPending}
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F131C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(15, 19, 28, 0.98)',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
  },
});
