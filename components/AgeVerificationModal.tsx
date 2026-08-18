/**
 * AgeVerificationModal
 * Lets the driver capture or upload the customer's driver's license photo,
 * sends it to the AI for DOB extraction, and reports pass/fail for 21+.
 */
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  ShieldCheck,
  ShieldAlert,
  Camera,
  X,
  AlertTriangle,
  CheckCircle,
  User,
  Calendar,
  MapPin,
  Clock,
} from '@blinkdotnew/mobile-ui';
import { blink } from '@/lib/blink';
import { scanDriversLicense, type IDScanResult } from '@/lib/ageVerification';
import { colors, spacing, borderRadius } from '@/constants/design';

type Phase = 'idle' | 'uploading' | 'scanning' | 'result' | 'error';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called with true if 21+, false if under 21 or expired */
  onResult: (passed: boolean, result: IDScanResult) => void;
}

export default function AgeVerificationModal({ visible, onClose, onResult }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<IDScanResult | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const reset = () => {
    setPhase('idle');
    setResult(null);
    setPreviewUri(null);
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
          mediaTypes: 'images',
          quality: 0.9,
          allowsEditing: false,
        });
      } else {
        pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          quality: 0.9,
          allowsEditing: false,
        });
      }

      if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

      const asset = pickerResult.assets[0];
      setPreviewUri(asset.uri);
      await runScan(asset);
    } catch (err: any) {
      setPhase('error');
      setResult({ success: false, errorMessage: err?.message ?? 'Failed to open camera.' });
    }
  };

  const runScan = async (asset: ImagePicker.ImagePickerAsset) => {
    setPhase('uploading');
    try {
      // Convert local URI to a blob for upload
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const file = new File([blob], `id-scan-${Date.now()}.${ext}`, { type: blob.type || 'image/jpeg' });

      const { publicUrl } = await blink.storage.upload(file, `id-scans/${Date.now()}.${ext}`);

      setPhase('scanning');
      const scanResult = await scanDriversLicense(publicUrl);
      setResult(scanResult);
      setPhase(scanResult.success ? 'result' : 'error');

      if (scanResult.success) {
        onResult(!!(scanResult.isOver21 && !scanResult.isExpired), scanResult);
      }
    } catch (err: any) {
      setResult({ success: false, errorMessage: err?.message ?? 'Upload failed. Please try again.' });
      setPhase('error');
    }
  };

  const passed = result?.success && result.isOver21 && !result.isExpired;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <YStack flex={1} backgroundColor="$background">

        {/* Header */}
        <XStack
          paddingHorizontal="$4"
          paddingTop="$5"
          paddingBottom="$3"
          alignItems="center"
          justifyContent="space-between"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <YStack>
            <SizableText size="$5" fontWeight="800" color="$color12">Age Verification</SizableText>
            <SizableText size="$2" color="$color9">21+ required for alcohol</SizableText>
          </YStack>
          <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
            <X size={20} color="$color10" />
          </Pressable>
        </XStack>

        <YStack flex={1} padding="$4" gap="$4">

          {/* ── IDLE: choose method ── */}
          {phase === 'idle' && (
            <YStack flex={1} gap="$5">
              <YStack
                backgroundColor="$amber2"
                borderRadius="$4"
                borderWidth={1}
                borderColor="$amber5"
                padding="$4"
                gap="$2"
              >
                <XStack gap="$2" alignItems="center">
                  <AlertTriangle size={18} color="$amber9" />
                  <SizableText size="$3" fontWeight="700" color="$amber10">
                    ID Scan Required
                  </SizableText>
                </XStack>
                <SizableText size="$2" color="$amber9" lineHeight={20}>
                  This order contains alcohol. You must scan the customer's driver's license
                  or state ID to confirm they are 21 or older before handing over the order.
                </SizableText>
              </YStack>

              <YStack gap="$3" flex={1} justifyContent="center">
                {/* Camera button — native only */}
                {Platform.OS !== 'web' && (
                  <Pressable
                    onPress={() => pickImage(true)}
                    style={({ pressed }) => [styles.scanOption, pressed && styles.scanOptionPressed]}
                  >
                    <YStack
                      width={56} height={56} borderRadius={28}
                      backgroundColor="$blue3" alignItems="center" justifyContent="center"
                    >
                      <Camera size={28} color="$blue9" />
                    </YStack>
                    <YStack flex={1} gap="$0.5">
                      <SizableText size="$4" fontWeight="700" color="$color12">
                        Take Photo
                      </SizableText>
                      <SizableText size="$2" color="$color9">
                        Use camera to photograph the ID
                      </SizableText>
                    </YStack>
                  </Pressable>
                )}

                {/* Gallery / file upload */}
                <Pressable
                  onPress={() => pickImage(false)}
                  style={({ pressed }) => [styles.scanOption, pressed && styles.scanOptionPressed]}
                >
                  <YStack
                    width={56} height={56} borderRadius={28}
                    backgroundColor="$color3" alignItems="center" justifyContent="center"
                  >
                    <Ionicons name="images-outline" size={28} color={colors.textSecondary} />
                  </YStack>
                  <YStack flex={1} gap="$0.5">
                    <SizableText size="$4" fontWeight="700" color="$color12">
                      {Platform.OS === 'web' ? 'Upload ID Photo' : 'Choose from Library'}
                    </SizableText>
                    <SizableText size="$2" color="$color9">
                      {Platform.OS === 'web'
                        ? 'Select an image file of the ID'
                        : 'Select an existing photo of the ID'}
                    </SizableText>
                  </YStack>
                </Pressable>
              </YStack>

              <SizableText size="$1" color="$color8" textAlign="center" lineHeight={18}>
                ID images are uploaded securely and used only for age verification.
                They are not stored permanently.
              </SizableText>
            </YStack>
          )}

          {/* ── UPLOADING / SCANNING ── */}
          {(phase === 'uploading' || phase === 'scanning') && (
            <YStack flex={1} alignItems="center" justifyContent="center" gap="$4">
              <ActivityIndicator size="large" color={colors.primary} />
              <YStack alignItems="center" gap="$1">
                <SizableText size="$4" fontWeight="700" color="$color12">
                  {phase === 'uploading' ? 'Uploading photo…' : 'Scanning ID…'}
                </SizableText>
                <SizableText size="$2" color="$color9" textAlign="center">
                  {phase === 'uploading'
                    ? 'Securely transferring image'
                    : 'AI is reading the date of birth'}
                </SizableText>
              </YStack>
            </YStack>
          )}

          {/* ── RESULT ── */}
          {phase === 'result' && result?.success && (
            <YStack flex={1} gap="$4">
              {/* Big pass / fail banner */}
              <YStack
                borderRadius="$5"
                borderWidth={1.5}
                borderColor={passed ? '$green6' : '$red6'}
                backgroundColor={passed ? '$green2' : '$red2'}
                padding="$5"
                alignItems="center"
                gap="$3"
              >
                {passed
                  ? <ShieldCheck size={56} color="$green9" />
                  : <ShieldAlert size={56} color="$red9" />
                }
                <SizableText size="$6" fontWeight="900" color={passed ? '$green10' : '$red10'}>
                  {passed ? 'AGE VERIFIED' : result.isExpired ? 'ID EXPIRED' : 'UNDER 21'}
                </SizableText>
                <SizableText size="$3" color={passed ? '$green9' : '$red9'} textAlign="center">
                  {passed
                    ? `Customer is ${result.age} years old — OK to hand over alcohol`
                    : result.isExpired
                      ? 'This ID has expired. Ask for a valid ID.'
                      : `Customer is only ${result.age} years old — DO NOT hand over alcohol`}
                </SizableText>
              </YStack>

              {/* ID details */}
              <YStack
                backgroundColor="$color2"
                borderRadius="$4"
                borderWidth={1}
                borderColor="$color4"
                padding="$4"
                gap="$3"
              >
                <SizableText size="$2" fontWeight="700" color="$color10" letterSpacing={0.5}>
                  ID DETAILS
                </SizableText>

                {(result.firstName || result.lastName) && (
                  <XStack gap="$3" alignItems="center">
                    <User size={16} color="$color9" />
                    <SizableText size="$3" color="$color12" flex={1}>
                      {[result.firstName, result.lastName].filter(Boolean).join(' ')}
                    </SizableText>
                  </XStack>
                )}

                <XStack gap="$3" alignItems="center">
                  <Calendar size={16} color="$color9" />
                  <SizableText size="$3" color="$color12" flex={1}>
                    DOB: {result.dob} · Age {result.age}
                  </SizableText>
                </XStack>

                {result.expirationDate && (
                  <XStack gap="$3" alignItems="center">
                    <Clock size={16} color={result.isExpired ? '$red9' : '$color9'} />
                    <SizableText size="$3" color={result.isExpired ? '$red10' : '$color12'} flex={1}>
                      Expires: {result.expirationDate}
                      {result.isExpired ? ' — EXPIRED' : ''}
                    </SizableText>
                  </XStack>
                )}

                {result.state && (
                  <XStack gap="$3" alignItems="center">
                    <MapPin size={16} color="$color9" />
                    <SizableText size="$3" color="$color12" flex={1}>
                      State: {result.state}
                    </SizableText>
                  </XStack>
                )}
              </YStack>

              {/* Actions */}
              <YStack gap="$2" marginTop="auto">
                {!passed && (
                  <Button
                    variant="outlined"
                    size="$4"
                    borderRadius={99}
                    onPress={reset}
                  >
                    Scan a Different ID
                  </Button>
                )}
                <Button
                  theme={passed ? 'active' : undefined}
                  size="$4"
                  borderRadius={99}
                  fontWeight="800"
                  onPress={handleClose}
                  backgroundColor={passed ? undefined : '$red9'}
                  color={passed ? undefined : 'white'}
                >
                  {passed ? 'Continue with Delivery' : 'Do Not Deliver Alcohol'}
                </Button>
              </YStack>
            </YStack>
          )}

          {/* ── ERROR ── */}
          {phase === 'error' && (
            <YStack flex={1} alignItems="center" justifyContent="center" gap="$4">
              <YStack
                width={72} height={72} borderRadius={36}
                backgroundColor="$amber3" alignItems="center" justifyContent="center"
              >
                <AlertTriangle size={36} color="$amber9" />
              </YStack>
              <YStack alignItems="center" gap="$1">
                <SizableText size="$5" fontWeight="700" color="$color12">Scan Failed</SizableText>
                <SizableText size="$3" color="$color9" textAlign="center" lineHeight={22}>
                  {result?.errorMessage ?? 'Something went wrong. Please try again.'}
                </SizableText>
              </YStack>
              <YStack gap="$2" width="100%">
                <Button
                  theme="active"
                  size="$4"
                  borderRadius={99}
                  fontWeight="700"
                  onPress={reset}
                >
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  size="$4"
                  borderRadius={99}
                  onPress={handleClose}
                >
                  Cancel
                </Button>
              </YStack>
            </YStack>
          )}

        </YStack>
      </YStack>
    </Modal>
  );
}

const styles = StyleSheet.create({
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scanOptionPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
