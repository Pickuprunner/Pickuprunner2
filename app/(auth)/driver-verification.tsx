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
  Zap,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
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
  const { data: existing } = useMyVerification(user?.id);
  const submitVerification = useSubmitVerification();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DriverWizardData>({
    vehicleMake: existing?.vehicle_make || '',
    vehicleModel: existing?.vehicle_model || '',
    vehicleYear: existing?.vehicle_year || '',
    vehicleColor: existing?.vehicle_color || '',
    licensePlate: existing?.license_plate || '',
    address: existing?.address || '',
    apt: existing?.apt || '',
    city: existing?.city || '',
    state: existing?.state || 'AZ',
    zip: existing?.zip || '',

    licenseState: existing?.license_state || 'AZ',
    licenseNumber: existing?.license_number || '',
    licenseFullName: existing?.license_fullname || user?.displayName || '',
    licenseDob: existing?.license_dob || '',
    licenseExpDate: existing?.license_exp_date || '',
    licenseFrontUrl: existing?.license_url || '',
    licenseFrontName: existing?.license_filename || '',
    licenseBackUrl: existing?.license_back_url || '',
    licenseBackName: existing?.license_back_filename || '',

    ssnLast4: existing?.ssn_last4 || '',
    fcraAgreed: existing?.fcra_agreed ?? false,

    insuranceCompany: existing?.insurance_company || '',
    naicNumber: existing?.naic_number || '',
    policyNumber: existing?.policy_number || '',
    effectiveDate: existing?.effective_date || '',
    expirationDate: existing?.expiration_date || '',
    vinNumber: existing?.vin_number || '',
    insuranceDocUrl: existing?.insurance_url || '',
    insuranceDocName: existing?.insurance_filename || '',
  });

  // If already pending or approved from database, start on Step 5
  useEffect(() => {
    if (existing?.status === 'pending' || existing?.status === 'approved') {
      setCurrentStep(5);
    }
  }, [existing?.status]);

  const updateFormData = (patch: Partial<DriverWizardData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
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
        <Pressable onPress={handleHeaderBack} style={styles.headerBtn} hitSlop={10}>
          <ArrowLeft size={22} color={colors.onSurface} />
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
            <Zap size={14} color="#0F131C" />
            <Text style={styles.mockDataBtnText}>Fill Mock</Text>
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
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <DriversLicenseStep
            data={formData}
            onChange={updateFormData}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <BackgroundCheckStep
            data={formData}
            onChange={updateFormData}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && (
          <InsuranceStep
            data={formData}
            onChange={updateFormData}
            onSubmit={handleSubmitAll}
            onBack={() => setCurrentStep(3)}
            submitting={submitVerification.isPending}
          />
        )}

        {currentStep === 5 && (
          <ReviewPendingStep
            data={formData}
            onDone={() => router.replace('/(tabs)/profile')}
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
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
  },
});
