import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SwipeSlider } from '@/components/core';
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
            Swipe to accept and start this order
          </Text>
          <SwipeSlider
            key="slider-accept"
            title="Slide to Accept"
            completedTitle="Order Accepted"
            onSwipeComplete={onAccept}
            disabled={atCapacity}
            variant="primary"
          />
        </>
      )}

      {status === 'accepted' && (
        <>
          <Text style={styles.stickyInstruction} numberOfLines={1}>
            Collect order at store & confirm below
          </Text>
          <SwipeSlider
            key="slider-pickup"
            title="Slide to Confirm Pickup"
            completedTitle="Pickup Confirmed"
            onSwipeComplete={onPickUp}
            disabled={false}
            variant="primary"
            icon="inventory"
          />
        </>
      )}

      {status === 'picked_up' && (
        <>
          {!hasPhoto && (
            <Text style={styles.stickyWarning} numberOfLines={1}>
              Photo required to unlock delivery
            </Text>
          )}
          <SwipeSlider
            key="slider-deliver"
            title="Slide to Complete Delivery"
            completedTitle="Delivery Completed"
            lockedTitle="Photo Required"
            onSwipeComplete={onDeliver}
            disabled={uploadingPhoto || !hasPhoto}
            variant="primary"
            completedIcon="check-circle"
          />
        </>
      )}

      {status === 'delivered' && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.secondaryActionButton}
          onPress={onBack}
        >
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
  secondaryActionButton: {
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
  secondaryActionText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
});
