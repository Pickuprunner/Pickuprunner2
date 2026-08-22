import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/design';
import type { DeliveryState } from './deliveryFSM';

export interface StickyActionFooterProps {
  status: DeliveryState;
  hasPhoto: boolean;
  uploadingPhoto: boolean;
  atCapacity: boolean;
  bottomInset: number;
  onAccept: () => void;
  onPickUp: () => void;
  onDeliver: () => void;
  onBack: () => void;
}

export function StickyActionFooter({
  status,
  hasPhoto,
  uploadingPhoto,
  atCapacity,
  bottomInset,
  onAccept,
  onPickUp,
  onDeliver,
  onBack,
}: StickyActionFooterProps) {
  return (
    <View
      style={[
        styles.stickyBottomBar,
        { paddingBottom: Math.max(bottomInset, 12) + 6 },
      ]}
    >
      {status === 'pending' && (
        <>
          <Text style={styles.stickyInstruction} numberOfLines={1}>
            {atCapacity ? 'Order queue at capacity' : 'Ready to deliver? Accept this order'}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.primaryActionBtn, atCapacity && styles.disabledBtn]}
            onPress={atCapacity ? undefined : onAccept}
            disabled={atCapacity}
          >
            <LinearGradient
              colors={atCapacity ? ['#2D3344', '#1E2330'] : ['#1E75FF', colors.primaryContainer, '#004ECC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientFill}
            >
              <MaterialIcons
                name="local-shipping"
                size={20}
                color={atCapacity ? colors.outline : '#FFFFFF'}
              />
              <Text style={[styles.primaryActionText, atCapacity && styles.disabledText]}>
                {atCapacity ? 'Queue Full (Max Orders)' : 'Accept Order'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}

      {status === 'accepted' && (
        <>
          <Text style={styles.stickyInstruction} numberOfLines={1}>
            Collect order at store & confirm below
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryActionBtn}
            onPress={onPickUp}
          >
            <LinearGradient
              colors={['#1E75FF', colors.primaryContainer, '#004ECC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientFill}
            >
              <MaterialIcons name="inventory" size={20} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Confirm Pickup</Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}

      {status === 'picked_up' && (
        <>
          {!hasPhoto && (
            <Text style={styles.stickyWarning} numberOfLines={1}>
              Take delivery photo above to complete
            </Text>
          )}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.primaryActionBtn,
              (uploadingPhoto || !hasPhoto) && styles.disabledBtn,
            ]}
            onPress={uploadingPhoto || !hasPhoto ? undefined : onDeliver}
            disabled={uploadingPhoto || !hasPhoto}
          >
            <LinearGradient
              colors={
                uploadingPhoto || !hasPhoto
                  ? ['#2D3344', '#1E2330']
                  : ['#00E297', '#00BA7C', '#009462']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientFill}
            >
              {uploadingPhoto ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>Uploading Photo…</Text>
                </>
              ) : (
                <>
                  <MaterialIcons
                    name={hasPhoto ? 'check-circle' : 'photo-camera'}
                    size={20}
                    color={hasPhoto ? '#0F131C' : colors.outline}
                  />
                  <Text
                    style={[
                      styles.primaryActionText,
                      hasPhoto ? styles.successActionText : styles.disabledText,
                    ]}
                  >
                    {hasPhoto ? 'Complete Delivery' : 'Photo Required'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}

      {status === 'delivered' && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.secondaryActionButton}
          onPress={onBack}
        >
          <MaterialIcons name="arrow-back" size={18} color={colors.onSurface} />
          <Text style={styles.secondaryActionText}>Back to Orders</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 19, 28, 0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.glassLevel2Border,
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  stickyInstruction: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  stickyWarning: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  primaryActionBtn: {
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 102, 255, 0.35)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledBtn: {
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.65,
  },
  gradientFill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  successActionText: {
    color: '#0F131C',
    fontWeight: '800',
  },
  disabledText: {
    color: colors.outline,
    fontWeight: '600',
  },
  secondaryActionButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.glassLevel2Bg,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionText: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
});
