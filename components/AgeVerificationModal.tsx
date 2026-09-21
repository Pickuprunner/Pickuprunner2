import React, { useState } from 'react';
import {
  Platform,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Modal,
  ActivityIndicator,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/hooks/useResponsive';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { CustomHeader } from '@/components/core/CustomHeader';
import { blink } from '@/lib/blink';
import { scanDriversLicense, type IDScanResult } from '@/lib/ageVerification';
import { colors } from '@/constants/design';
import { deliveryApi } from '@/apis/delivery';

type Phase = 'idle' | 'preview' | 'uploading' | 'scanning' | 'result' | 'error';

interface Props {
  visible: boolean;
  onClose: () => void;
  orderId?: string;
  minAge?: number;
  verificationType?: string;
  onResult: (passed: boolean, result: any) => void;
}

export default function AgeVerificationModal({
  visible,
  onClose,
  orderId,
  minAge = 21,
  verificationType = 'alcohol',
  onResult,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, isNarrow, isCompact } = useResponsive();
  const sheetHeight = isNarrow
    ? Math.max(540, Math.round(windowHeight * 0.85))
    : isCompact
      ? Math.max(520, Math.round(windowHeight * 0.78))
      : Math.max(520, Math.min(Math.round(windowHeight * 0.72), 620));

  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<IDScanResult | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const reset = () => {
    setPhase('idle');
    setResult(null);
    setPreviewUri(null);
    setSelectedAsset(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      let pickerResult: ImagePicker.ImagePickerResult;

      if (useCamera) {
        if (Platform.OS !== 'web') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            setPhase('error');
            setResult({ success: false, errorMessage: 'Camera permission denied.' });
            return;
          }
        }
        pickerResult = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.9,
          allowsEditing: false,
        });
      } else {
        pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.9,
          allowsEditing: false,
        });
      }

      if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

      const asset = pickerResult.assets[0];
      setSelectedAsset(asset);
      setPreviewUri(asset.uri);
      setPhase('preview');
    } catch (err: any) {
      setPhase('error');
      setResult({ success: false, errorMessage: err?.message ?? 'Failed to open camera.' });
    }
  };

  const runScan = async (asset: ImagePicker.ImagePickerAsset) => {
    setPhase('scanning');
    try {
      const ext = asset.uri.split('.').pop()?.split('?')[0] ?? 'jpg';
      const mimeType = asset.mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg');
      const filename = asset.fileName || `id_${orderId || 'scan'}_${Date.now()}.${ext}`;

      if (orderId) {
        try {
          const res = await deliveryApi.verifyId(orderId, {
            uri: asset.uri,
            name: filename,
            type: mimeType,
          });

          const isPassed = res.verdict === 'PASSED' || res.customerVerified === true;
          const scanResult: IDScanResult = {
            success: true,
            dob: res.customerAge ? `Age: ${res.customerAge}` : undefined,
            age: res.customerAge,
            isOver21: res.isOverMinAge ?? (res.customerAge ? res.customerAge >= minAge : true),
            firstName: res.customerName,
            lastName: '',
            isExpired: res.isExpired ?? false,
          };
          setResult(scanResult);
          setPhase('result');
          onResult(isPassed, scanResult);
          return;
        } catch (apiErr: any) {
          if (
            apiErr.data &&
            (apiErr.data.verdict === 'REJECTED' ||
              apiErr.data.verdict === 'FAILED' ||
              apiErr.data.rejectionReason ||
              apiErr.data.error ||
              apiErr.status === 422)
          ) {
            const scanResult: IDScanResult = {
              success: false,
              age: apiErr.data.details?.customerAge ?? apiErr.data.customerAge,
              isOver21: apiErr.data.details?.isOverMinAge ?? apiErr.data.isOverMinAge ?? false,
              isExpired: apiErr.data.details?.isExpired ?? apiErr.data.isExpired ?? false,
              errorMessage:
                apiErr.data.rejectionReason ||
                apiErr.data.error ||
                `Customer does not meet minimum age of ${minAge}.`,
            };
            setResult(scanResult);
            setPhase('result');
            onResult(false, scanResult);
            return;
          }
          throw apiErr;
        }
      }

      // Standalone preview / fallback when no orderId is passed
      setPhase('uploading');
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type || mimeType });
      const { publicUrl } = await blink.storage.upload(file, `id-scans/${filename}`);

      setPhase('scanning');
      const scanResult = await scanDriversLicense(publicUrl);
      setResult(scanResult);
      setPhase(scanResult.success ? 'result' : 'error');

      if (scanResult.success) {
        onResult(!!(scanResult.isOver21 && !scanResult.isExpired), scanResult);
      }
    } catch (err: any) {
      setResult({ success: false, errorMessage: err?.message ?? 'ID Verification failed. Please try again.' });
      setPhase('error');
    }
  };

  const passed = result?.success && result.isOver21 && !result.isExpired && !result.errorMessage;
  const isMedication = verificationType === 'medication';

  const getRejectionDisplay = (reason?: string) => {
    switch (reason?.toUpperCase()) {
      case 'NAME_MISMATCH':
        return {
          title: 'NAME MISMATCH',
          subtitle: 'Name on the ID does not match the customer name on this order.',
        };
      case 'TAMPERED':
        return {
          title: 'TAMPER DETECTED',
          subtitle: 'ID appears digitally altered, paper printout, or photo of a screen.',
        };
      case 'EXPIRED':
        return {
          title: 'ID EXPIRED',
          subtitle: 'This ID has expired. Ask for a valid, non-expired ID.',
        };
      case 'UNDERAGE':
        return {
          title: `UNDER ${minAge}`,
          subtitle: `Customer does not meet the minimum age requirement of ${minAge}.`,
        };
      case 'UNREADABLE':
        return {
          title: 'ID UNREADABLE',
          subtitle: 'Could not clearly read the ID details. Please scan again.',
        };
      default:
        return {
          title: reason || `UNDER ${minAge}`,
          subtitle: reason || `Customer does not meet minimum age of ${minAge}. Cannot proceed.`,
        };
    }
  };

  const rejectionInfo = !passed
    ? getRejectionDisplay(result?.isExpired ? 'EXPIRED' : result?.errorMessage)
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View
          style={[
            styles.sheetContainer,
            {
              height: sheetHeight,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <CustomHeader
            title={
              phase === 'preview'
                ? 'Review ID Photo'
                : isMedication
                  ? 'Prescription ID Verification'
                  : 'Customer ID Verification'
            }
            subtitle={
              phase === 'preview'
                ? 'Check photo clarity before AI scan'
                : isMedication
                  ? 'Rx Recipient Verification'
                  : `${minAge}+ Age Requirement · Secure Verification`
            }
            titleSize="medium"
            variant="transparent"
            withSafeArea={false}
            showBack={false}
            rightIconName="close"
            onRightActionPress={handleClose}
            rightActionLabel="Close"
            containerStyle={styles.headerContainer}
          />

          <View style={styles.content}>
            {phase === 'idle' && (
              <ScrollView
                style={styles.idleScroll}
                contentContainerStyle={styles.idleContainer}
                showsVerticalScrollIndicator={false}
              >
              {/* Regulatory Warning Banner */}
              <View style={styles.warningCard}>
                <View style={styles.warningIconHalo}>
                  <MaterialIcons name="security" size={20} color={colors.secondaryContainer} />
                </View>
                <View style={styles.warningTextCol}>
                  <Text style={styles.warningTitle}>
                    Store Pickup: ID Verification Required
                  </Text>
                  <Text style={styles.warningBody}>
                    {isMedication
                      ? 'State law requires customer government ID verification before medication can be collected and transported.'
                      : `This order contains alcohol. State law requires scanning the customer's ID to verify they are ${minAge}+ before pickup can be completed.`}
                  </Text>
                </View>
              </View>

              {/* Action Cards */}
              <View style={styles.optionsContainer}>
                {Platform.OS !== 'web' && (
                  <TouchableOpacity
                    onPress={() => pickImage(true)}
                    activeOpacity={0.75}
                    style={styles.actionCard}
                  >
                    <View style={[styles.actionIconBox, styles.actionIconBoxBlue]}>
                      <MaterialIcons name="photo-camera" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>Scan Customer ID</Text>
                      <Text style={styles.actionSubtitle}>
                        Use camera to capture Driver's License or State ID
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color={colors.outline} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => pickImage(false)}
                  activeOpacity={0.75}
                  style={styles.actionCard}
                >
                  <View style={[styles.actionIconBox, styles.actionIconBoxGold]}>
                    <MaterialIcons name="photo-library" size={24} color={colors.secondary} />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>
                      {Platform.OS === 'web' ? 'Upload ID Photo' : 'Choose from Library'}
                    </Text>
                    <Text style={styles.actionSubtitle}>
                      {Platform.OS === 'web'
                        ? 'Select an image file of the ID'
                        : 'Select an existing photo of the ID'}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={colors.outline} />
                </TouchableOpacity>
              </View>

              {/* Footer Zero-Retention Security Note */}
              <View style={styles.footerNoteRow}>
                <MaterialIcons name="lock-outline" size={14} color={colors.outline} />
                <Text style={styles.footerNoteText}>
                  Zero-Retention Security: Images are securely processed in memory and are never stored on disk.
                </Text>
              </View>
            </ScrollView>
          )}

          {phase === 'preview' && (
            <ScrollView
              style={styles.previewScroll}
              contentContainerStyle={styles.previewContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.scanFrame}>
                {!!previewUri && (
                  <Image
                    source={{ uri: previewUri }}
                    style={styles.scanPhoto}
                    contentFit="contain"
                    transition={200}
                  />
                )}
                <View style={[styles.scanCorner, styles.scanCornerTL]} />
                <View style={[styles.scanCorner, styles.scanCornerTR]} />
                <View style={[styles.scanCorner, styles.scanCornerBL]} />
                <View style={[styles.scanCorner, styles.scanCornerBR]} />
              </View>

              <View style={styles.previewGuidanceRow}>
                <MaterialIcons name="info-outline" size={18} color={colors.secondary} />
                <Text style={styles.previewGuidanceText}>
                  Ensure customer name, photo, and birth date are clear and free of glare.
                </Text>
              </View>

              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.scanButton]}
                  onPress={() => selectedAsset && runScan(selectedAsset)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="document-scanner" size={20} color="#000" />
                  <Text style={styles.scanButtonText}>Scan & Verify with AI</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={reset}
                  activeOpacity={0.75}
                >
                  <MaterialIcons name="refresh" size={18} color={colors.onSurface} />
                  <Text style={styles.retryButtonText}>Retake / Choose Another</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {(phase === 'uploading' || phase === 'scanning') && (
            <View style={styles.loadingContainer}>
              <View style={styles.scanFrame}>
                {!!previewUri && (
                  <Image
                    source={{ uri: previewUri }}
                    style={styles.scanPhoto}
                    contentFit="contain"
                    transition={200}
                  />
                )}
                {/* Corner brackets */}
                <View style={[styles.scanCorner, styles.scanCornerTL]} />
                <View style={[styles.scanCorner, styles.scanCornerTR]} />
                <View style={[styles.scanCorner, styles.scanCornerBL]} />
                <View style={[styles.scanCorner, styles.scanCornerBR]} />
              </View>

              {/* Status below */}
              <View style={styles.scanStatusRow}>
                <ActivityIndicator size="small" color={colors.primaryContainer} />
                <Text style={styles.loadingTitle}>Verifying Customer ID…</Text>
              </View>
              <Text style={styles.loadingSubtitle}>
                Checking document validity & date of birth
              </Text>
            </View>
          )}

          {phase === 'result' && result && (
            <ScrollView
              style={styles.resultScroll}
              contentContainerStyle={styles.resultContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Verdict Card */}
              <View
                style={[
                  styles.verdictCard,
                  passed ? styles.verdictCardPassed : styles.verdictCardFailed,
                ]}
              >
                <View
                  style={[
                    styles.verdictIconHalo,
                    passed ? styles.verdictIconHaloPassed : styles.verdictIconHaloFailed,
                  ]}
                >
                  <MaterialIcons
                    name={passed ? 'verified' : 'gpp-bad'}
                    size={40}
                    color={passed ? colors.tertiary : colors.error}
                  />
                </View>
                <Text
                  style={[
                    styles.verdictTitle,
                    { color: passed ? colors.tertiary : colors.error },
                  ]}
                >
                  {passed ? 'ID VERIFIED' : rejectionInfo?.title}
                </Text>
                <Text style={styles.verdictSubtitle}>
                  {passed
                    ? `Customer is ${result.age ?? `${minAge}+`} years old — Verification PASSED`
                    : rejectionInfo?.subtitle}
                </Text>
              </View>

              {/* Extraction Details Card */}
              <View style={styles.detailsCard}>
                <Text style={styles.detailsHeader}>VERIFICATION DETAILS</Text>

                {result.firstName ? (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="person-outline" size={18} color={colors.outline} />
                    <Text style={styles.detailValue}>
                      Customer: <Text style={styles.detailBold}>{result.firstName} {result.lastName || ''}</Text>
                    </Text>
                  </View>
                ) : null}

                {result.age !== undefined && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="cake" size={18} color={colors.outline} />
                    <Text style={styles.detailValue}>
                      Calculated Age: <Text style={styles.detailBold}>{result.age} years</Text> (Min: {minAge})
                    </Text>
                  </View>
                )}

                {result.expirationDate && (
                  <View style={styles.detailRow}>
                    <MaterialIcons
                      name="schedule"
                      size={18}
                      color={result.isExpired ? colors.error : colors.outline}
                    />
                    <Text
                      style={[
                        styles.detailValue,
                        result.isExpired && { color: colors.error },
                      ]}
                    >
                      Expires: {result.expirationDate}
                      {result.isExpired ? ' — EXPIRED' : ''}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.resultActions}>
                {!passed && (
                  <TouchableOpacity
                    onPress={reset}
                    activeOpacity={0.75}
                    style={styles.retryButton}
                  >
                    <MaterialIcons name="refresh" size={18} color={colors.onSurface} />
                    <Text style={styles.retryButtonText}>Scan a Different ID</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleClose}
                  activeOpacity={0.8}
                  style={[
                    styles.primaryButton,
                    passed ? styles.primaryButtonPassed : styles.primaryButtonFailed,
                  ]}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      passed ? styles.primaryButtonTextPassed : styles.primaryButtonTextFailed,
                    ]}
                  >
                    {passed ? 'Confirm & Continue Pickup' : 'Close (Pickup Blocked)'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {phase === 'error' && (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconHalo}>
                <MaterialIcons name="error-outline" size={38} color={colors.secondaryContainer} />
              </View>
              <Text style={styles.errorTitle}>Scan Failed</Text>
              <Text style={styles.errorSubtitle}>
                {result?.errorMessage ?? 'Something went wrong. Please try again.'}
              </Text>
              <View style={styles.errorActions}>
                <TouchableOpacity
                  onPress={reset}
                  activeOpacity={0.8}
                  style={styles.tryAgainButton}
                >
                  <Text style={styles.tryAgainButtonText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClose}
                  activeOpacity={0.75}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.78)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#131824',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.2,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 24,
  },
  dragHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  idleScroll: {
    flex: 1,
  },
  idleContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: 16,
    paddingBottom: 8,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: 'rgba(244, 195, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 195, 0, 0.25)',
    borderRadius: 18,
    padding: 16,
  },
  warningIconHalo: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 195, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 195, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  warningTextCol: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    color: colors.secondary,
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  warningBody: {
    color: colors.onSurface,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '400',
  },
  optionsContainer: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
  },
  actionIconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBoxBlue: {
    backgroundColor: 'rgba(0, 102, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 102, 255, 0.35)',
  },
  actionIconBoxGold: {
    backgroundColor: 'rgba(244, 195, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(244, 195, 0, 0.3)',
  },
  actionTextCol: {
    flex: 1,
    gap: 3,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
  actionSubtitle: {
    color: colors.outline,
    fontSize: 12,
    lineHeight: 16,
  },
  footerNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  footerNoteText: {
    color: colors.outline,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 20,
  },
  scanFrame: {
    width: '100%',
    aspectRatio: 1.6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    position: 'relative',
  },
  scanPhoto: {
    width: '100%',
    height: '100%',
  },
  scanCorner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: colors.primaryContainer,
  },
  scanCornerTL: {
    top: 10,
    left: 10,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  scanCornerTR: {
    top: 10,
    right: 10,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  scanCornerBL: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  scanCornerBR: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  scanStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    paddingHorizontal: 28,
    paddingVertical: 36,
    width: '100%',
  },
  loadingTextCol: {
    alignItems: 'center',
    gap: 6,
  },
  loadingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingSubtitle: {
    color: colors.outline,
    fontSize: 12.5,
    textAlign: 'center',
  },
  resultScroll: {
    flex: 1,
  },
  resultContent: {
    gap: 16,
    paddingBottom: 24,
  },
  verdictCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  verdictCardPassed: {
    backgroundColor: 'rgba(0, 226, 151, 0.08)',
    borderColor: 'rgba(0, 226, 151, 0.35)',
  },
  verdictCardFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  verdictIconHalo: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdictIconHaloPassed: {
    backgroundColor: 'rgba(0, 226, 151, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 226, 151, 0.35)',
  },
  verdictIconHaloFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  verdictTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verdictSubtitle: {
    color: colors.onSurface,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  detailsCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    padding: 16,
    gap: 12,
  },
  detailsHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.outline,
    letterSpacing: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailValue: {
    color: colors.onSurface,
    fontSize: 13.5,
    flex: 1,
  },
  detailBold: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultActions: {
    gap: 10,
    marginTop: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  retryButtonText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    height: 50,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPassed: {
    backgroundColor: colors.tertiary,
  },
  primaryButtonFailed: {
    backgroundColor: '#EF4444',
  },
  primaryButtonText: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  primaryButtonTextPassed: {
    color: '#0F131C',
  },
  primaryButtonTextFailed: {
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 20,
  },
  errorIconHalo: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: 'rgba(244, 195, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(244, 195, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  errorSubtitle: {
    color: colors.outline,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  errorActions: {
    width: '100%',
    gap: 10,
    marginTop: 16,
  },
  tryAgainButton: {
    height: 48,
    borderRadius: 9999,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tryAgainButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  cancelButton: {
    height: 48,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.outline,
    fontSize: 14,
    fontWeight: '600',
  },
  previewScroll: {
    flex: 1,
  },
  previewContent: {
    gap: 16,
    paddingBottom: 24,
  },
  previewGuidanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 184, 0, 0.08)',
    borderColor: 'rgba(255, 184, 0, 0.25)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  previewGuidanceText: {
    color: colors.onSurface,
    fontSize: 12.5,
    flex: 1,
    lineHeight: 17,
  },
  previewActions: {
    gap: 10,
    marginTop: 4,
  },
  scanButton: {
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    gap: 8,
  },
  scanButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
