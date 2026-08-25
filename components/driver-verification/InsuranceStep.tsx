import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  FileText,
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  X,
  Zap,
} from '@blinkdotnew/mobile-ui';
import * as ImagePicker from 'expo-image-picker';
import { colors, borderRadius, spacing } from '@/constants/design';
import CustomInput from '@/components/core/CustomInput';
import { POPULAR_INSURERS, DriverWizardData } from './mockData';

interface InsuranceStepProps {
  data: DriverWizardData;
  onChange: (patch: Partial<DriverWizardData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting?: boolean;
}

export function InsuranceStep({
  data,
  onChange,
  onSubmit,
  onBack,
  submitting = false,
}: InsuranceStepProps) {
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const formatDateInput = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 8);
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  };

  const handlePickInsurance = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setUploadingDoc(true);
        onChange({
          insuranceDocUrl: asset.uri,
          insuranceDocName: asset.fileName || 'insurance_card.jpg',
        });
      }
    } catch (e) {
      console.warn('Doc pick error:', e);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = () => {
    setErrorMsg('');
    if (!data.insuranceCompany.trim()) {
      setErrorMsg('Please enter your insurance company name.');
      return;
    }
    if (!data.naicNumber.trim() || data.naicNumber.length < 5) {
      setErrorMsg('Please enter a valid 5-digit NAIC number.');
      return;
    }
    if (!data.policyNumber.trim()) {
      setErrorMsg('Please enter your insurance policy number.');
      return;
    }
    if (!data.effectiveDate.trim() || data.effectiveDate.length < 10) {
      setErrorMsg('Please enter a valid Effective Date (MM/DD/YYYY).');
      return;
    }
    if (!data.expirationDate.trim() || data.expirationDate.length < 10) {
      setErrorMsg('Please enter a valid Expiration Date (MM/DD/YYYY).');
      return;
    }
    if (!data.vinNumber.trim() || data.vinNumber.length !== 17) {
      setErrorMsg('Vehicle Identification Number (VIN) must be exactly 17 characters.');
      return;
    }
    if (!data.insuranceDocUrl) {
      setErrorMsg('Please upload a digital photo or scan of your insurance card.');
      return;
    }
    onSubmit();
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBg}>
          <FileText size={18} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.sectionTitle}>VEHICLE INSURANCE DETAILS</Text>
          <Text style={styles.sectionSubtitle}>Active auto insurance policy required</Text>
        </View>
      </View>

      {/* QUICK SELECT POPULAR INSURERS */}
      <View style={styles.quickSelectContainer}>
        <Text style={styles.quickSelectLabel}>Popular Insurers (tap to auto-fill NAIC):</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {POPULAR_INSURERS.map((ins) => (
            <TouchableOpacity
              key={ins.naic}
              style={[
                styles.chip,
                data.insuranceCompany.toLowerCase().includes(ins.name.toLowerCase()) && styles.chipActive,
              ]}
              onPress={() => onChange({ insuranceCompany: ins.name, naicNumber: ins.naic })}
            >
              <Text
                style={[
                  styles.chipText,
                  data.insuranceCompany.toLowerCase().includes(ins.name.toLowerCase()) && styles.chipTextActive,
                ]}
              >
                {ins.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.formGrid}>
        <View style={styles.row2}>
          <View style={{ flex: 1.8 }}>
            <CustomInput
              label="INSURANCE COMPANY"
              value={data.insuranceCompany}
              onChangeText={(val) => onChange({ insuranceCompany: val })}
              placeholder="e.g. State Farm"
              autoCapitalize="words"
            />
          </View>
          <View style={{ flex: 1.2 }}>
            <CustomInput
              label="NAIC NUMBER (5-DIGIT)"
              value={data.naicNumber}
              onChangeText={(val) => onChange({ naicNumber: val.replace(/\D/g, '').slice(0, 5) })}
              placeholder="25178"
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        </View>

        <CustomInput
          label="POLICY NUMBER"
          value={data.policyNumber}
          onChangeText={(val) => onChange({ policyNumber: val.toUpperCase() })}
          placeholder="e.g. AZ-98421034-7B"
          autoCapitalize="characters"
        />

        <View style={styles.row2}>
          <View style={styles.flex1}>
            <CustomInput
              label="EFFECTIVE DATE"
              value={data.effectiveDate}
              onChangeText={(val) => onChange({ effectiveDate: formatDateInput(val) })}
              placeholder="MM/DD/YYYY"
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
          <View style={styles.flex1}>
            <CustomInput
              label="EXPIRATION DATE"
              value={data.expirationDate}
              onChangeText={(val) => onChange({ expirationDate: formatDateInput(val) })}
              placeholder="MM/DD/YYYY"
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
        </View>

        {/* 17-CHARACTER VIN */}
        <CustomInput
          label="VEHICLE IDENTIFICATION NUMBER (VIN - 17 CHARACTERS)"
          value={data.vinNumber}
          onChangeText={(val) => onChange({ vinNumber: val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17) })}
          placeholder="e.g. 4T1B11HK5JU123456"
          autoCapitalize="characters"
          maxLength={17}
        />

        {/* INSURANCE CARD UPLOAD */}
        <Text style={[styles.fieldLabel, { marginTop: 4 }]}>INSURANCE CARD UPLOAD (PDF / JPG / PNG)</Text>

        <View style={styles.uploadBox}>
          {data.insuranceDocUrl ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: data.insuranceDocUrl }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => onChange({ insuranceDocUrl: '', insuranceDocName: '' })}
              >
                <X size={14} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.verifiedTag}>
                <CheckCircle size={12} color="#22C55E" />
                <Text style={styles.verifiedTagText}>Insurance Card Attached</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadPlaceholder}
              onPress={handlePickInsurance}
              disabled={uploadingDoc}
            >
              {uploadingDoc ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Upload size={22} color={colors.primary} />
                  <Text style={styles.uploadPlaceholderText}>Upload Insurance Card</Text>
                  <Text style={styles.uploadSubtext}>Accepted formats: JPG, PNG, PDF</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <View style={styles.actionsRow}>
        <Pressable onPress={onBack} style={styles.backBtn} disabled={submitting}>
          <ArrowLeft size={18} color={colors.onSurface} />
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Submit for Admin Approval</Text>
              <CheckCircle size={18} color={colors.onPrimaryContainer} />
            </>
          )}
        </Pressable>
      </View>
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
  quickSelectContainer: {
    gap: 6,
    marginBottom: 4,
  },
  quickSelectLabel: {
    fontSize: 11,
    color: colors.outline,
    fontWeight: '600',
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chipActive: {
    backgroundColor: 'rgba(0, 102, 255, 0.2)',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.primary,
  },
  formGrid: {
    gap: 12,
  },
  row2: {
    flexDirection: 'row',
    gap: 10,
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
  uploadBox: {
    width: '100%',
  },
  uploadPlaceholder: {
    height: 120,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadPlaceholderText: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: '700',
  },
  uploadSubtext: {
    color: colors.outline,
    fontSize: 11,
  },
  previewContainer: {
    height: 120,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedTagText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '700',
  },
  errorText: {
    color: '#ff8b8b',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.md,
  },
  backBtn: {
    height: 52,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backBtnText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    height: 52,
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: colors.onPrimaryContainer,
    fontSize: 14.5,
    fontWeight: '700',
  },
});
