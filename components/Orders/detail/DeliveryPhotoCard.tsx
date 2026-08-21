import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CustomCard } from '@/components/core';
import { colors } from '@/constants/design';

export interface DeliveryPhotoCardProps {
  photoUri: string | null;
  photoUrl: string | null;
  uploadingPhoto: boolean;
  onPickPhoto: (source: 'camera' | 'library') => void;
  onMockFill: () => void;
}

export function DeliveryPhotoCard({
  photoUri,
  photoUrl,
  uploadingPhoto,
  onPickPhoto,
  onMockFill,
}: DeliveryPhotoCardProps) {
  const currentPhoto = photoUri ?? photoUrl;

  return (
    <CustomCard variant="glass" style={styles.photoBox}>
      <View style={styles.photoHeader}>
        <View style={styles.photoHeaderTitleRow}>
          <MaterialIcons name="camera-alt" size={20} color={colors.onSurface} />
          <Text style={styles.photoTitle}>Delivery Photo</Text>
          <Text style={styles.photoRequired}>(Required)</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.mockPhotoChip}
          onPress={onMockFill}
        >
          <MaterialIcons name="auto-fix-high" size={14} color={colors.tertiary} />
          <Text style={styles.mockPhotoChipText}>Mock Fill</Text>
        </TouchableOpacity>
      </View>

      {!!currentPhoto && (
        <View style={styles.photoPreviewWrapper}>
          <Image
            source={{ uri: currentPhoto }}
            style={styles.photoPreview}
            resizeMode="cover"
          />
          {uploadingPhoto && (
            <View style={styles.photoUploadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.photoUploadingText}>Uploading Photo…</Text>
            </View>
          )}
          {!uploadingPhoto && photoUrl && (
            <View style={styles.photoUploadedBadge}>
              <Text style={styles.photoUploadedText}>✓ Verified Upload</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.photoPickersRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.photoPickerBtn}
          onPress={() => onPickPhoto('camera')}
          disabled={uploadingPhoto}
        >
          <MaterialIcons name="photo-camera" size={18} color={colors.secondary} />
          <Text style={styles.photoPickerText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.photoPickerBtn}
          onPress={() => onPickPhoto('library')}
          disabled={uploadingPhoto}
        >
          <MaterialIcons name="photo-library" size={18} color={colors.primary} />
          <Text style={styles.photoPickerText}>Choose File</Text>
        </TouchableOpacity>
      </View>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  photoBox: {
    marginTop: 14,
    padding: 16,
    gap: 12,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  photoHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  photoTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '700',
  },
  photoRequired: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
  },
  mockPhotoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.greenAlpha15,
    borderWidth: 1,
    borderColor: colors.greenAlpha40,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mockPhotoChipText: {
    color: colors.tertiary,
    fontSize: 12,
    fontWeight: '700',
  },
  photoPreviewWrapper: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    marginBottom: 4,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoUploadingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  photoUploadedBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: colors.tertiary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  photoUploadedText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  photoPickersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoPickerBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.glassLevel2Bg,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoPickerText: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: '600',
  },
});
