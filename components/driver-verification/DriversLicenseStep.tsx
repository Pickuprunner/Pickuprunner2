import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  ShieldCheck,
  ChevronDown,
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  X,
  FileText,
} from '@blinkdotnew/mobile-ui';
import * as ImagePicker from 'expo-image-picker';
import { colors, borderRadius, spacing } from '@/constants/design';
import CustomInput from '@/components/core/CustomInput';
import { useToast } from '@/components/core';
import { US_STATES, DriverWizardData } from './mockData';

interface DriversLicenseStepProps {
  data: DriverWizardData;
  onChange: (patch: Partial<DriverWizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DriversLicenseStep({
  data,
  onChange,
  onNext,
  onBack,
}: DriversLicenseStepProps) {
  const { showToast } = useToast();
  const [showStateModal, setShowStateModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  const formatDateInput = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 8);
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  };

  const handlePickDoc = async (side: 'front' | 'back') => {
    const setUploading = side === 'front' ? setUploadingFront : setUploadingBack;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setUploading(true);
        if (side === 'front') {
          onChange({
            licenseFrontUrl: asset.uri,
            licenseFrontName: asset.fileName || 'drivers_license_front.jpg',
          });
          showToast('License Front Attached', { type: 'success', description: 'Front of driver’s license saved.' });
        } else {
          onChange({
            licenseBackUrl: asset.uri,
            licenseBackName: asset.fileName || 'drivers_license_back.jpg',
          });
          showToast('License Back Attached', { type: 'success', description: 'Back of driver’s license saved.' });
        }
      }
    } catch (e) {
      console.warn('Doc pick error:', e);
      showToast('Upload Error', { type: 'error', description: 'Failed to pick image file.' });
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    setErrorMsg('');
    if (!data.licenseNumber.trim()) {
      const msg = "Please enter your driver's license number.";
      setErrorMsg(msg);
      showToast('License Number Required', { type: 'warning', description: msg });
      return;
    }
    if (!data.licenseFullName.trim()) {
      const msg = 'Please enter your full legal name matching the license.';
      setErrorMsg(msg);
      showToast('Full Legal Name Required', { type: 'warning', description: msg });
      return;
    }
    if (!data.licenseDob.trim() || data.licenseDob.length < 10) {
      const msg = 'Please enter a valid Date of Birth (YYYY-MM-DD or MM/DD/YYYY).';
      setErrorMsg(msg);
      showToast('Date of Birth Required', { type: 'warning', description: msg });
      return;
    }
    if (!data.licenseExpDate.trim() || data.licenseExpDate.length < 10) {
      const msg = 'Please enter a valid License Expiration Date (YYYY-MM-DD or MM/DD/YYYY).';
      setErrorMsg(msg);
      showToast('Expiration Date Required', { type: 'warning', description: msg });
      return;
    }
    if (!data.licenseFrontUrl) {
      const msg = 'Please upload a photo of the front of your driver’s license.';
      setErrorMsg(msg);
      showToast('License Photo Required', { type: 'warning', description: msg });
      return;
    }
    onNext();
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBg}>
          <ShieldCheck size={18} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.sectionTitle}>DRIVER'S LICENSE DETAILS</Text>
          <Text style={styles.sectionSubtitle}>Must be valid and unexpired</Text>
        </View>
      </View>

      <View style={styles.formGrid}>
        <View style={styles.row2}>
          {/* State of Issue */}
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>STATE OF ISSUE</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowStateModal(true)}
              style={styles.selectBtn}
            >
              <Text style={styles.selectBtnText}>{data.licenseState || 'Select State'}</Text>
              <ChevronDown size={14} color={colors.outline} />
            </TouchableOpacity>
          </View>

          {/* License Number */}
          <View style={{ flex: 1.6 }}>
            <CustomInput
              label="LICENSE NUMBER"
              value={data.licenseNumber}
              onChangeText={(val) => onChange({ licenseNumber: val.toUpperCase() })}
              placeholder="e.g. D12345678"
              autoCapitalize="characters"
            />
          </View>
        </View>

        <CustomInput
          label="FULL LEGAL NAME"
          value={data.licenseFullName}
          onChangeText={(val) => onChange({ licenseFullName: val })}
          placeholder="First Middle Last"
          autoCapitalize="words"
        />

        <View style={styles.row2}>
          <View style={styles.flex1}>
            <CustomInput
              label="DATE OF BIRTH"
              value={data.licenseDob}
              onChangeText={(val) => onChange({ licenseDob: formatDateInput(val) })}
              placeholder="MM/DD/YYYY"
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
          <View style={styles.flex1}>
            <CustomInput
              label="EXPIRATION DATE"
              value={data.licenseExpDate}
              onChangeText={(val) => onChange({ licenseExpDate: formatDateInput(val) })}
              placeholder="MM/DD/YYYY"
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
        </View>

        {/* DOCUMENT UPLOADS */}
        <Text style={[styles.fieldLabel, { marginTop: 6 }]}>LICENSE PHOTO / SCAN UPLOAD</Text>

        <View style={styles.uploadRow}>
          {/* FRONT */}
          <View style={styles.uploadBox}>
            <Text style={styles.uploadBoxLabel}>Front of License *</Text>
            {data.licenseFrontUrl ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: data.licenseFrontUrl }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => onChange({ licenseFrontUrl: '', licenseFrontName: '' })}
                >
                  <X size={14} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.verifiedTag}>
                  <CheckCircle size={12} color="#22C55E" />
                  <Text style={styles.verifiedTagText}>Attached</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadPlaceholder}
                onPress={() => handlePickDoc('front')}
                disabled={uploadingFront}
              >
                {uploadingFront ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Upload size={20} color={colors.primary} />
                    <Text style={styles.uploadPlaceholderText}>Upload Front</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* BACK */}
          <View style={styles.uploadBox}>
            <Text style={styles.uploadBoxLabel}>Back of License</Text>
            {data.licenseBackUrl ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: data.licenseBackUrl }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => onChange({ licenseBackUrl: '', licenseBackName: '' })}
                >
                  <X size={14} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.verifiedTag}>
                  <CheckCircle size={12} color="#22C55E" />
                  <Text style={styles.verifiedTagText}>Attached</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadPlaceholder}
                onPress={() => handlePickDoc('back')}
                disabled={uploadingBack}
              >
                {uploadingBack ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Upload size={20} color={colors.outline} />
                    <Text style={styles.uploadPlaceholderText}>Upload Back</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <View style={styles.actionsRow}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={18} color={colors.onSurface} />
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>

        <Pressable onPress={handleNext} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>Continue to Background Check</Text>
          <ArrowRight size={18} color={colors.onPrimaryContainer} />
        </Pressable>
      </View>

      {/* STATE PICKER MODAL */}
      <Modal visible={showStateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>State of Issue</Text>
              <Pressable onPress={() => setShowStateModal(false)}>
                <Text style={styles.modalCloseText}>Done</Text>
              </Pressable>
            </View>
            <FlatList
              data={US_STATES}
              keyExtractor={(item) => item}
              numColumns={4}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.stateGridItem,
                    data.licenseState === item && styles.stateGridItemActive,
                  ]}
                  onPress={() => {
                    onChange({ licenseState: item });
                    setShowStateModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.stateGridItemText,
                      data.licenseState === item && styles.stateGridItemTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadBox: {
    flex: 1,
    gap: 6,
  },
  uploadBoxLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  uploadPlaceholder: {
    height: 105,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadPlaceholderText: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  previewContainer: {
    height: 105,
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
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedTagText: {
    color: '#22C55E',
    fontSize: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.gutter,
  },
  modalCard: {
    width: '100%',
    maxHeight: '65%',
    backgroundColor: '#161B26',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  modalCloseText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  stateGridItem: {
    flex: 1,
    margin: 4,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stateGridItemActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  stateGridItemText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  stateGridItemTextActive: {
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
});
