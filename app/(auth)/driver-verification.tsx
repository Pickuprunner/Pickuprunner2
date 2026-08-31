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
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  X,
  Zap,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import {
  useDriverAccreditation,
  useSaveAccreditationStep,
  useUploadAccreditationDocument,
  useRecordAccreditationConsent,
  useSubmitAccreditation,
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
  ReviewPendingStep,
  MOCK_DRIVER_WIZARD_DATA,
  DriverWizardData,
} from '@/components/driver-verification';

export default function DriverVerificationScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();

  const { data: accreditationData, isLoading: accreditationLoading } = useDriverAccreditation();
  const saveStepMutation = useSaveAccreditationStep();
  const uploadDocMutation = useUploadAccreditationDocument();
  const recordConsentMutation = useRecordAccreditationConsent();
  const submitAccreditationMutation = useSubmitAccreditation();

  const { data: existing } = useMyVerification(user?.id);
  const submitVerification = useSubmitVerification();

  const [currentStep, setCurrentStep] = useState(1);
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

  // Hydrate from backend profile or local existing data
  useEffect(() => {
    const profile = accreditationData?.profile;
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        vehicleMake: profile.vehicleMake || prev.vehicleMake,
        vehicleModel: profile.vehicleModel || prev.vehicleModel,
        vehicleYear: profile.vehicleYear ? String(profile.vehicleYear) : prev.vehicleYear,
        vehicleColor: profile.vehicleColor || prev.vehicleColor,
        licensePlate: profile.vehiclePlate || prev.licensePlate,
        address: profile.streetAddress || prev.address,
        apt: profile.aptSuite || prev.apt,
        city: profile.city || prev.city,
        state: profile.state || prev.state,
        zip: profile.postalCode || prev.zip,

        licenseState: profile.licenseState || prev.licenseState,
        licenseNumber: profile.licenseNumber || prev.licenseNumber,
        licenseFullName: profile.legalName || prev.licenseFullName,
        licenseDob: profile.dateOfBirth || prev.licenseDob,
        licenseExpDate: profile.licenseExpirationDate || prev.licenseExpDate,

        fcraAgreed: !!profile.backgroundConsentAt || prev.fcraAgreed,

        insuranceCompany: profile.insuranceCompany || prev.insuranceCompany,
        naicNumber: profile.insuranceNaicNumber || prev.naicNumber,
        policyNumber: profile.insurancePolicyNumber || prev.policyNumber,
        effectiveDate: profile.insuranceEffectiveDate || prev.effectiveDate,
        expirationDate: profile.insuranceExpirationDate || prev.expirationDate,
        vinNumber: profile.vehicleVin || prev.vinNumber,
      }));

      if (
        profile.accreditationStatus === 'under_review' ||
        profile.accreditationStatus === 'approved'
      ) {
        setCurrentStep(5);
      } else if (profile.backgroundConsentAt) {
        setCurrentStep(4);
      } else if (profile.licenseNumber) {
        setCurrentStep(3);
      } else if (profile.vehicleMake && profile.vehiclePlate) {
        setCurrentStep(2);
      } else {
        setCurrentStep(1);
      }
    } else if (existing) {
      setFormData((prev) => ({
        ...prev,
        vehicleMake: existing.vehicle_make || prev.vehicleMake,
        vehicleModel: existing.vehicle_model || prev.vehicleModel,
        vehicleYear: existing.vehicle_year || prev.vehicleYear,
        vehicleColor: existing.vehicle_color || prev.vehicleColor,
        licensePlate: existing.license_plate || prev.licensePlate,
        address: existing.address || prev.address,
        apt: existing.apt || prev.apt,
        city: existing.city || prev.city,
        state: existing.state || prev.state,
        zip: existing.zip || prev.zip,
        licenseState: existing.license_state || prev.licenseState,
        licenseNumber: existing.license_number || prev.licenseNumber,
        licenseFullName: existing.license_fullname || prev.licenseFullName,
        licenseDob: existing.license_dob || prev.licenseDob,
        licenseExpDate: existing.license_exp_date || prev.licenseExpDate,
        ssnLast4: existing.ssn_last4 || prev.ssnLast4,
        fcraAgreed: existing.fcra_agreed ?? prev.fcraAgreed,
        insuranceCompany: existing.insurance_company || prev.insuranceCompany,
        naicNumber: existing.naic_number || prev.naicNumber,
        policyNumber: existing.policy_number || prev.policyNumber,
        effectiveDate: existing.effective_date || prev.effectiveDate,
        expirationDate: existing.expiration_date || prev.expirationDate,
        vinNumber: existing.vin_number || prev.vinNumber,
      }));

      if (existing.status === 'pending' || existing.status === 'approved') {
        setCurrentStep(5);
      }
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
    } catch (e) {
      console.warn('[Accreditation] saveStep(vehicle) fallback:', e);
    }
    setCurrentStep(2);
  };

  const handleStep2Next = async () => {
    try {
      await saveStepMutation.mutateAsync({
        step: 'license',
        payload: {
          licenseState: formData.licenseState.trim().toUpperCase(),
          licenseNumber: formData.licenseNumber.trim(),
          legalName: formData.licenseFullName.trim(),
          dateOfBirth: formData.licenseDob.trim(),
          licenseExpirationDate: formData.licenseExpDate.trim(),
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
    } catch (e) {
      console.warn('[Accreditation] saveStep(license) fallback:', e);
    }
    setCurrentStep(3);
  };

  const handleStep3Next = async () => {
    try {
      await recordConsentMutation.mutateAsync({
        authorized: formData.fcraAgreed,
        legalName: formData.licenseFullName.trim() || user?.displayName || undefined,
      });
    } catch (e) {
      console.warn('[Accreditation] recordConsent fallback:', e);
    }
    setCurrentStep(4);
  };

  const handleFillMockData = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setFormData({
      ...MOCK_DRIVER_WIZARD_DATA,
      licenseFullName: user?.displayName || MOCK_DRIVER_WIZARD_DATA.licenseFullName,
    });
    showToast('⚡ Mock driver data filled!', 'success');
  };

  const handleSubmitAll = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      // 1. Save Insurance step to backend
      try {
        await saveStepMutation.mutateAsync({
          step: 'insurance',
          payload: {
            insuranceCompany: formData.insuranceCompany.trim(),
            insuranceNaicNumber: formData.naicNumber.trim() || undefined,
            insurancePolicyNumber: formData.policyNumber.trim(),
            insuranceEffectiveDate: formData.effectiveDate.trim(),
            insuranceExpirationDate: formData.expirationDate.trim(),
            vehicleVin: formData.vinNumber.trim() || undefined,
          },
        });

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
      } catch (e) {
        console.warn('[Accreditation] saveStep(insurance) fallback:', e);
      }

      // 2. Submit to backend review queue
      try {
        await submitAccreditationMutation.mutateAsync();
      } catch (e) {
        console.warn('[Accreditation] submit backend fallback:', e);
      }

      // 3. Keep local verification store in sync
      await submitVerification.mutateAsync({
        userId: user?.id || `usr-${Date.now()}`,
        driverName: formData.licenseFullName || user?.displayName || user?.email || 'Driver',
        driverEmail: user?.email,
        existingId: existing?.id,
        status: 'pending',

        // Vehicle & Address
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

        // License
        license_state: formData.licenseState,
        license_number: formData.licenseNumber,
        license_fullname: formData.licenseFullName,
        license_dob: formData.licenseDob,
        license_exp_date: formData.licenseExpDate,
        licenseUrl: formData.licenseFrontUrl,
        licenseFilename: formData.licenseFrontName || 'license_front.jpg',
        license_back_url: formData.licenseBackUrl,
        license_back_filename: formData.licenseBackName || 'license_back.jpg',

        // Background Check
        ssn_last4: formData.ssnLast4,
        fcra_agreed: formData.fcraAgreed,

        // Insurance
        insurance_company: formData.insuranceCompany,
        naic_number: formData.naicNumber,
        policy_number: formData.policyNumber,
        effective_date: formData.effectiveDate,
        expiration_date: formData.expirationDate,
        vin_number: formData.vinNumber,
        insuranceUrl: formData.insuranceDocUrl,
        insuranceFilename: formData.insuranceDocName || 'insurance_card.pdf',
      });

      setCurrentStep(5);
      showToast('Profile & documents submitted for admin approval!', 'success');
    } catch (err: any) {
      console.warn('Submission error:', err);
      showToast(err?.message || 'Submission failed. Please try again.', 'error');
    }
  };

  const handleHeaderBack = () => {
    if (currentStep > 1 && currentStep < 5) {
      setCurrentStep((s) => s - 1);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* CUSTOM HEADER */}
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
        <Pressable
          onPress={currentStep === 5 ? () => router.replace('/(tabs)') : handleHeaderBack}
          style={styles.headerBtn}
          hitSlop={10}
        >
          {currentStep === 5 ? (
            <X size={20} color={colors.onSurface} />
          ) : (
            <ArrowLeft size={22} color={colors.onSurface} />
          )}
        </Pressable>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Driver Accreditation</Text>
          <Text style={styles.headerSubtitle}>
            {currentStep === 5 ? 'Review & Confirmation' : `Step ${currentStep} of 4`}
          </Text>
        </View>

        {currentStep < 5 ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleFillMockData}
            style={styles.mockDataBtn}
          >
            <Zap size={13} color="#0F131C" />
            <Text style={styles.mockDataBtnText}>Mock Fill</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 70 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 24) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StepIndicator currentStep={currentStep} totalSteps={5} />

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
            submitting={submitVerification.isPending || submitAccreditationMutation.isPending}
          />
        )}

        {currentStep === 5 && (
          <ReviewPendingStep
            data={formData}
            onDone={() => router.replace('/(tabs)')}
          />
        )}
      </ScrollView>
    </View>
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
  mockDataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFE399',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  mockDataBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F131C',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
  },
});
