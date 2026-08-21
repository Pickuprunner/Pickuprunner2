import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/constants/design';

export interface TrackTestToolbarProps {
  testBusy: boolean;
  hasDriver: boolean;
  onAssignDriver: () => void;
  onCompleteDelivery: () => void;
}

export function TrackTestToolbar({
  testBusy,
  hasDriver,
  onAssignDriver,
  onCompleteDelivery,
}: TrackTestToolbarProps) {
  return (
    <View style={styles.testControlsCard}>
      <View style={styles.testControlsHeader}>
        <MaterialIcons name="bolt" size={15} color={colors.secondary} />
        <Text style={styles.testControlsTitle}>DEMO & SIMULATION CONTROLS</Text>
      </View>

      <View style={styles.testBtnRow}>
        <TouchableOpacity
          onPress={onAssignDriver}
          disabled={testBusy || hasDriver}
          style={[
            styles.testBtn,
            hasDriver ? styles.testBtnDisabled : styles.testBtnBlue,
          ]}
        >
          {testBusy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.testBtnBlueText}>
              {hasDriver ? '✓ Driver Assigned' : 'Assign Test Driver'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onCompleteDelivery}
          disabled={testBusy}
          style={[styles.testBtn, styles.testBtnGreen]}
        >
          <Text style={styles.testBtnGreenText}>Complete Delivery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  testControlsCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.accentAlpha30,
    backgroundColor: colors.accentAlpha12,
    padding: 16,
    gap: 12,
  },
  testControlsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testControlsTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  testBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  testBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnBlue: {
    backgroundColor: colors.primaryAlpha20,
    borderWidth: 1,
    borderColor: colors.primaryAlpha40,
  },
  testBtnBlueText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  testBtnGreen: {
    backgroundColor: colors.greenAlpha15,
    borderWidth: 1,
    borderColor: colors.greenAlpha40,
  },
  testBtnGreenText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.tertiary,
  },
  testBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
});
