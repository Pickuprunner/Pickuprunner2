import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  Shield,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  FileText,
} from '@blinkdotnew/mobile-ui';
import { colors, borderRadius, spacing } from '@/constants/design';
import CustomInput from '@/components/core/CustomInput';
import { useToast } from '@/components/core';
import { DriverWizardData } from './mockData';

interface BackgroundCheckStepProps {
  data: DriverWizardData;
  onChange: (patch: Partial<DriverWizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function BackgroundCheckStep({
  data,
  onChange,
  onNext,
  onBack,
}: BackgroundCheckStepProps) {
  const { showToast } = useToast();
  const [errorMsg, setErrorMsg] = useState('');

  const handleNext = () => {
    setErrorMsg('');
    if (!data.ssnLast4.trim() || data.ssnLast4.length < 4) {
      const msg = 'Please enter the last 4 digits of your Social Security Number (SSN).';
      setErrorMsg(msg);
      showToast('SSN Required', { type: 'warning', description: msg });
      return;
    }
    if (!data.fcraAgreed) {
      const msg = 'You must authorize the background check disclosure to continue.';
      setErrorMsg(msg);
      showToast('FCRA Consent Required', { type: 'warning', description: msg });
      return;
    }
    onNext();
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBg}>
          <Shield size={18} color="#FFE399" />
        </View>
        <View>
          <Text style={styles.sectionTitle}>BACKGROUND CHECK DISCLOSURE</Text>
          <Text style={styles.sectionSubtitle}>Mandatory for all verified delivery partners</Text>
        </View>
      </View>

      <View style={styles.cardBox}>
        <View style={styles.cardHeaderRow}>
          <FileText size={16} color={colors.primary} />
          <Text style={styles.cardHeaderText}>Fair Credit Reporting Act (FCRA) Notice</Text>
        </View>
        <Text style={styles.cardBodyText}>
          Pickup Runner will obtain a consumer report and/or investigative consumer report
          for background screening purposes, including motor vehicle records (MVR) and criminal history.
          Your SSN and personal data are encrypted and transmitted securely via 256-bit SSL.
        </Text>
      </View>

      <View style={styles.formGrid}>
        <CustomInput
          label="CONFIRM LEGAL NAME"
          value={data.licenseFullName}
          onChangeText={(val) => onChange({ licenseFullName: val })}
          placeholder="First Middle Last"
          autoCapitalize="words"
        />

        <CustomInput
          label="LAST 4 DIGITS OF SSN"
          value={data.ssnLast4}
          onChangeText={(val) => onChange({ ssnLast4: val.replace(/\D/g, '').slice(0, 4) })}
          placeholder="••••"
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          leftIcon={<Lock size={16} color={colors.outline} />}
        />

        {/* FCRA CONSENT CHECKBOX */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onChange({ fcraAgreed: !data.fcraAgreed })}
          style={[styles.consentBox, data.fcraAgreed && styles.consentBoxActive]}
        >
          <View style={[styles.checkbox, data.fcraAgreed && styles.checkboxActive]}>
            {data.fcraAgreed && <CheckCircle size={14} color={colors.onPrimaryContainer} />}
          </View>
          <Text style={styles.consentText}>
            I have read and hereby authorize Pickup Runner and its certified consumer reporting agency
            to conduct a background screening and motor vehicle report.
          </Text>
        </TouchableOpacity>
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <View style={styles.actionsRow}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={18} color={colors.onSurface} />
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>

        <Pressable onPress={handleNext} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>Continue to Vehicle Insurance</Text>
          <ArrowRight size={18} color={colors.onPrimaryContainer} />
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
    backgroundColor: 'rgba(255, 227, 153, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 227, 153, 0.25)',
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
  cardBox: {
    backgroundColor: 'rgba(0, 102, 255, 0.06)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.2)',
    gap: 6,
    marginBottom: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  cardBodyText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  formGrid: {
    gap: 12,
  },

  consentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 4,
  },
  consentBoxActive: {
    backgroundColor: 'rgba(0, 102, 255, 0.08)',
    borderColor: 'rgba(0, 102, 255, 0.3)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  consentText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.onSurface,
    lineHeight: 18,
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
  nextBtn: {
    flex: 1,
    height: 52,
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnText: {
    color: colors.onPrimaryContainer,
    fontSize: 14.5,
    fontWeight: '700',
  },
});
