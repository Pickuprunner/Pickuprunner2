import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Switch, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CustomInput } from '@/components/core';
import { APP_CONFIG, IS_STORE_BUILD } from '@/lib/config';
import { colors, spacing, typography } from '@/constants/design';

const GOLD = '#FFE399';
const GREEN = '#00E297';

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

interface RouteItemsCardProps {
  pickupAddress: string;
  onPickupAddressChange: (val: string) => void;
  deliveryAddress: string;
  onDeliveryAddressChange: (val: string) => void;
  items: string;
  onItemsChange: (val: string) => void;
  hasAlcohol?: boolean;
  onHasAlcoholChange?: (val: boolean) => void;
  miles?: string;
  mileageCents?: number;
  calculating?: boolean;
}

export function RouteItemsCard({
  pickupAddress,
  onPickupAddressChange,
  deliveryAddress,
  onDeliveryAddressChange,
  items,
  onItemsChange,
  hasAlcohol = false,
  onHasAlcoholChange,
  miles = '',
  mileageCents = 0,
  calculating = false,
}: RouteItemsCardProps) {
  const isPickupLocked = APP_CONFIG.LOCK_PICKUP_ADDRESS && IS_STORE_BUILD;
  const milesNum = parseFloat(miles);
  const hasValidMiles = isFinite(milesNum) && milesNum > 0;

  const haptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>ROUTE & ITEMS</Text>

      <View style={styles.content}>
        {IS_STORE_BUILD && (
          <View style={styles.storeBanner}>
            <View style={styles.storeHeaderRow}>
              <View style={styles.storeIconCircle}>
                <MaterialIcons name="store" size={20} color={GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.storeTitle}>{APP_CONFIG.STORE_NAME}</Text>
                <Text style={styles.storeSubtitle}>{APP_CONFIG.STORE_TYPE}</Text>
              </View>
            </View>
            <View style={styles.storeDetailRow}>
              <MaterialIcons name="place" size={14} color={colors.outline} />
              <Text style={styles.storeDetailText}>{APP_CONFIG.STORE_ADDRESS}</Text>
            </View>
          </View>
        )}

        <CustomInput
          label={isPickupLocked ? 'PICKUP ADDRESS (STORE DEFAULT)' : 'PICKUP ADDRESS'}
          placeholder="Where to pick up"
          value={pickupAddress}
          onChangeText={isPickupLocked ? undefined : onPickupAddressChange}
          editable={!isPickupLocked}
          autoCapitalize="words"
          returnKeyType="next"
          leftIcon={<MaterialIcons name="place" size={18} color={colors.secondaryContainer} />}
          rightIcon={
            isPickupLocked ? (
              <MaterialIcons name="lock-outline" size={16} color={colors.outline} />
            ) : undefined
          }
          status={pickupAddress.trim().length >= 5 ? 'success' : 'default'}
        />

        <CustomInput
          label="DELIVERY ADDRESS *"
          placeholder="Where to drop off"
          value={deliveryAddress}
          onChangeText={onDeliveryAddressChange}
          autoCapitalize="words"
          returnKeyType="next"
          leftIcon={<MaterialIcons name="navigation" size={18} color={colors.primaryContainer} />}
          status={deliveryAddress.trim().length >= 5 ? 'success' : 'default'}
        />

        <CustomInput
          label="ORDER ITEMS *"
          placeholder="e.g. 2 grocery bags, milk & bread, order #1042..."
          value={items}
          onChangeText={onItemsChange}
          multiline
          numberOfLines={3}
          autoCapitalize="sentences"
          leftIcon={<MaterialIcons name="inventory-2" size={18} color={colors.outline} />}
          status={items.trim().length >= 3 ? 'success' : 'default'}
        />

        <Pressable
          onPress={() => {
            haptic();
            onHasAlcoholChange?.(!hasAlcohol);
          }}
          style={[
            styles.alcoholCard,
            hasAlcohol && styles.alcoholCardActive,
          ]}
        >
          <View style={styles.alcoholIconCircle}>
            <MaterialIcons
              name="wine-bar"
              size={20}
              color={hasAlcohol ? GOLD : '#8C90A1'}
            />
          </View>
          <View style={styles.alcoholTextCol}>
            <Text style={styles.alcoholTitle}>Order includes alcohol</Text>
            <Text style={styles.alcoholSubtitle}>Driver will require 21+ ID at delivery</Text>
          </View>
          <Switch
            value={hasAlcohol}
            onValueChange={(val) => {
              haptic();
              onHasAlcoholChange?.(val);
            }}
            trackColor={{
              false: 'rgba(255, 255, 255, 0.12)',
              true: 'rgba(255, 227, 153, 0.45)',
            }}
            thumbColor={hasAlcohol ? GOLD : '#FFFFFF'}
          />
        </Pressable>

        <View style={styles.distanceSection}>
          <Text style={styles.inputSectionLabel}>ROUTE DISTANCE</Text>
          {calculating ? (
            <View style={styles.distanceBox}>
              <ActivityIndicator size="small" color={GOLD} />
              <Text style={styles.distanceTextMuted}>Calculating route distance…</Text>
            </View>
          ) : hasValidMiles ? (
            <View style={[styles.distanceBox, styles.distanceBoxSuccess]}>
              <MaterialIcons name="navigation" size={18} color={GREEN} />
              <Text style={styles.distanceValueText}>{milesNum.toFixed(1)} miles</Text>
              <Text style={styles.distanceDot}>·</Text>
              <Text
                style={[
                  styles.distanceSurchargeText,
                  mileageCents > 0 ? { color: GOLD } : { color: GREEN },
                ]}
              >
                {mileageCents > 0 ? `+${fmt(mileageCents)} mileage surcharge` : 'Free mileage'}
              </Text>
            </View>
          ) : (
            <View style={styles.distanceBox}>
              <MaterialIcons name="navigation" size={18} color={colors.outline} />
              <Text style={styles.distanceTextMuted}>
                {pickupAddress?.trim() && deliveryAddress?.trim()
                  ? 'Enter full street address to calculate route distance'
                  : 'Enter pickup and delivery addresses to estimate distance'}
              </Text>
            </View>
          )}
          <Text style={styles.distanceFootnote}>
            First {APP_CONFIG.FREE_MILES} miles free · $2.00/mile thereafter
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.labelMd,
    color: colors.outline,
    marginBottom: spacing.md,
    marginLeft: 2,
    letterSpacing: 1,
  },
  content: {
    gap: spacing.md,
  },
  storeBanner: {
    backgroundColor: '#141824',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  storeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 227, 153, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  storeSubtitle: {
    fontSize: 12,
    color: '#8C90A1',
    marginTop: 1,
  },
  storeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storeDetailText: {
    fontSize: 12.5,
    color: '#C2C6D8',
    flex: 1,
  },
  distanceSection: {
    gap: 6,
  },
  inputSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.outline,
    letterSpacing: 0.8,
  },
  distanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  distanceBoxSuccess: {
    backgroundColor: 'rgba(0, 226, 151, 0.06)',
    borderColor: 'rgba(0, 226, 151, 0.3)',
  },
  distanceValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  distanceDot: {
    color: '#8C90A1',
    fontSize: 14,
  },
  distanceSurchargeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  distanceTextMuted: {
    fontSize: 12.5,
    color: '#8C90A1',
    flex: 1,
  },
  distanceFootnote: {
    fontSize: 11,
    color: '#8C90A1',
    marginLeft: 4,
  },
  alcoholCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  alcoholCardActive: {
    backgroundColor: 'rgba(255, 227, 153, 0.08)',
    borderColor: 'rgba(255, 227, 153, 0.35)',
  },
  alcoholIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alcoholTextCol: {
    flex: 1,
  },
  alcoholTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DFE2EF',
  },
  alcoholSubtitle: {
    fontSize: 11,
    color: '#8C90A1',
    marginTop: 2,
  },
});
