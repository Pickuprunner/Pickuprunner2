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
import { colors } from '@/constants/design';

export interface DeliveryPhotoCardProps {
  photoUri: string | null;
  photoUrl: string | null;
  uploadingPhoto: boolean;
  onPickPhoto: (source: 'camera' | 'library') => void;
}

export function DeliveryPhotoCard({
  photoUri,
  photoUrl,
  uploadingPhoto,
  onPickPhoto,
}: DeliveryPhotoCardProps) {
  const currentPhoto = photoUri ?? photoUrl;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.iconBox}>
          <MaterialIcons name="camera-alt" size={22} color={colors.onSurface} />
        </View>
        <Text style={styles.titleText}>Delivery Photo</Text>
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

        <View style={styles.pickersRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.pickerBtn}
            onPress={() => onPickPhoto('camera')}
            disabled={uploadingPhoto}
          >
            <MaterialIcons name="photo-camera" size={18} color={colors.secondary} />
            <Text style={styles.pickerBtnText}>
              {currentPhoto ? 'Retake Photo' : 'Take Photo'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.pickerBtn}
            onPress={() => onPickPhoto('library')}
            disabled={uploadingPhoto}
          >
            <MaterialIcons name="photo-library" size={18} color={colors.primary} />
            <Text style={styles.pickerBtnText}>Choose File</Text>
          </TouchableOpacity>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    padding: 16,
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.glassLevel2Bg,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  photoPreviewWrapper: {
    width: '100%',
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
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
    bottom: 10,
    right: 10,
    backgroundColor: colors.primaryContainer,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  photoUploadedText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pickersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.glassLevel2Bg,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pickerBtnText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
});

