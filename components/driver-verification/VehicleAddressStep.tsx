import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {
  Car,
  MapPin,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  CheckCircle,
} from '@blinkdotnew/mobile-ui';
import { ActivityIndicator } from 'react-native';
import { colors, borderRadius, spacing } from '@/constants/design';
import CustomInput from '@/components/core/CustomInput';
import { useToast, CustomStatePickerModal } from '@/components/core';
import { DriverWizardData } from './mockData';
import { validateVehicleStep } from './validation';

interface VehicleAddressStepProps {
  data: DriverWizardData;
  onChange: (patch: Partial<DriverWizardData>) => void;
  onNext: () => void;
  isEditing?: boolean;
  canDirectSubmit?: boolean;
  onSubmitDirect?: () => void;
  submitting?: boolean;
}

export function VehicleAddressStep({
  data,
  onChange,
  onNext,
  isEditing = false,
  canDirectSubmit = false,
  onSubmitDirect,
  submitting = false,
}: VehicleAddressStepProps) {
  const { showToast } = useToast();
  const [showStateModal, setShowStateModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleNext = () => {
    setErrorMsg('');
    const result = validateVehicleStep(data);
    if (!result.isValid) {
      setErrorMsg(result.message || 'Please fill in all required fields.');
      showToast(result.title || 'Required Field Missing', {
        type: 'warning',
        description: result.message,
      });
      return;
    }
    if (canDirectSubmit && onSubmitDirect) {
      onSubmitDirect();
    } else {
      onNext();
    }
  };

  return (
    <View style={styles.container}>
      {/* SECTION 1: VEHICLE INFORMATION */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBg}>
          <Car size={18} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.sectionTitle}>VEHICLE INFORMATION</Text>
          <Text style={styles.sectionSubtitle}>Details of vehicle used for deliveries</Text>
        </View>
      </View>

      <View style={styles.formGrid}>
        <View style={styles.row2}>
          <View style={styles.flex1}>
            <CustomInput
              label="MAKE"
              value={data.vehicleMake}
              onChangeText={(val) => onChange({ vehicleMake: val })}
              placeholder="e.g. Toyota"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.flex1}>
            <CustomInput
              label="MODEL"
              value={data.vehicleModel}
              onChangeText={(val) => onChange({ vehicleModel: val })}
              placeholder="e.g. Camry"
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.row3}>
          <View style={{ flex: 1.2 }}>
            <CustomInput
              label="YEAR"
              value={data.vehicleYear}
              onChangeText={(val) => onChange({ vehicleYear: val.replace(/\D/g, '').slice(0, 4) })}
              placeholder="2023"
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
          <View style={{ flex: 1.6 }}>
            <CustomInput
              label="COLOR"
              value={data.vehicleColor}
              onChangeText={(val) => onChange({ vehicleColor: val.slice(0, 30) })}
              placeholder="e.g. Black"
              autoCapitalize="words"
              maxLength={30}
            />
          </View>
          <View style={{ flex: 1.8 }}>
            <CustomInput
              label="LICENSE PLATE"
              value={data.licensePlate}
              onChangeText={(val) => onChange({ licensePlate: val.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16) })}
              placeholder="8ABC123"
              autoCapitalize="characters"
              maxLength={16}
            />
          </View>
        </View>
      </View>

      {/* SECTION 2: RESIDENTIAL ADDRESS */}
      <View style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
        <View style={[styles.sectionIconBg, { backgroundColor: 'rgba(255, 227, 153, 0.12)' }]}>
          <MapPin size={18} color="#FFE399" />
        </View>
        <View>
          <Text style={styles.sectionTitle}>RESIDENTIAL ADDRESS</Text>
          <Text style={styles.sectionSubtitle}>Your primary home address for identity verification</Text>
        </View>
      </View>

      <View style={styles.formGrid}>
        <CustomInput
          label="STREET ADDRESS"
          value={data.address}
          onChangeText={(val) => onChange({ address: val })}
          placeholder="e.g. 2401 E Camelback Rd"
          autoCapitalize="words"
        />

        <CustomInput
          label="APT / SUITE / UNIT (OPTIONAL)"
          value={data.apt}
          onChangeText={(val) => onChange({ apt: val })}
          placeholder="e.g. Apt 4B"
          autoCapitalize="words"
        />

        <View style={styles.row3}>
          <View style={{ flex: 2 }}>
            <CustomInput
              label="CITY"
              value={data.city}
              onChangeText={(val) => onChange({ city: val })}
              placeholder="e.g. Phoenix"
              autoCapitalize="words"
            />
          </View>

          {/* State Dropdown Trigger */}
          <View style={{ flex: 1.2 }}>
            <Text style={styles.fieldLabel}>STATE</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowStateModal(true)}
              style={styles.selectBtn}
            >
              <Text style={styles.selectBtnText}>{data.state || 'Select'}</Text>
              <ChevronDown size={14} color={colors.outline} />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1.5 }}>
            <CustomInput
              label="ZIP CODE"
              value={data.zip}
              onChangeText={(val) => onChange({ zip: val.replace(/\D/g, '').slice(0, 5) })}
              placeholder="85016"
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        </View>
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <Pressable
        onPress={handleNext}
        style={[styles.nextBtn, submitting && { opacity: 0.7 }]}
        disabled={submitting}
      >
        {submitting ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.nextBtnText}>Submitting...</Text>
          </>
        ) : canDirectSubmit ? (
          <>
            <Text style={styles.nextBtnText}>Save & Resubmit</Text>
            <CheckCircle size={18} color={colors.onPrimaryContainer} />
          </>
        ) : (
          <>
            <Text style={styles.nextBtnText}>Continue to Driver's License</Text>
            <ArrowRight size={18} color={colors.onPrimaryContainer} />
          </>
        )}
      </Pressable>

      {/* STATE PICKER MODAL */}
      <CustomStatePickerModal
        visible={showStateModal}
        onClose={() => setShowStateModal(false)}
        selectedState={data.state}
        onSelect={(st) => onChange({ state: st })}
        title="Select Address State"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.xs,
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 102, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.25)',
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  formGrid: {
    gap: 12,
  },
  row2: {
    flexDirection: 'row',
    gap: 10,
  },
  row3: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  flex1: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  selectBtn: {
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  selectBtnText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff8b8b',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  nextBtn: {
    height: 52,
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
  },
  nextBtnText: {
    color: colors.onPrimaryContainer,
    fontSize: 15,
    fontWeight: '700',
  },
});
