import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CustomCard } from '@/components/core';
import { colors } from '@/constants/design';

export interface RouteTimelineCardProps {
  pickupAddress: string;
  deliveryAddress: string;
  distanceMiles: number;
  status: string;
  onNavigatePickup: () => void;
  onNavigateDelivery: () => void;
}

export function RouteTimelineCard({
  pickupAddress,
  deliveryAddress,
  distanceMiles,
  status,
  onNavigatePickup,
  onNavigateDelivery,
}: RouteTimelineCardProps) {
  const isPickupStep = status === 'accepted';
  const isDeliveryStep = status === 'picked_up';

  return (
    <CustomCard variant="glass" style={styles.routeCard}>
      {/* Route Header */}
      <View style={styles.routeHeader}>
        <View style={styles.routeHeaderLeft}>
          <MaterialIcons name="alt-route" size={18} color={colors.primary} />
          <Text style={styles.routeHeaderTitle}>Delivery Route</Text>
        </View>
        {distanceMiles > 0 && (
          <View style={styles.distanceBadge}>
            <MaterialIcons name="straighten" size={13} color={colors.onSurface} />
            <Text style={styles.distanceBadgeText}>{distanceMiles.toFixed(1)} mi total</Text>
          </View>
        )}
      </View>

      {/* Point A: Pickup */}
      <View
        style={[
          styles.timelineRow,
          isPickupStep && styles.activeStopRow,
        ]}
      >
        <View style={styles.timelineIndicatorColumn}>
          <View
            style={[
              styles.timelineNode,
              {
                borderColor: colors.primary,
                backgroundColor: isPickupStep ? colors.primaryAlpha25 : 'rgba(255, 255, 255, 0.06)',
              },
            ]}
          >
            <MaterialIcons name="storefront" size={15} color={colors.primary} />
          </View>
          <View
            style={[
              styles.timelineConnectorLine,
              isPickupStep && { backgroundColor: colors.primary },
            ]}
          />
        </View>

        <View style={styles.timelineContent}>
          <View style={styles.timelineTextGroup}>
            <View style={styles.timelineTagRow}>
              <Text style={[styles.timelineTag, { color: colors.primary }]}>PICKUP</Text>
              {isPickupStep && (
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Next Stop</Text>
                </View>
              )}
            </View>
            <Text style={styles.timelineTitle} numberOfLines={1}>Pickup Runner Store</Text>
            <Text style={styles.timelineAddress}>{pickupAddress || '(not set)'}</Text>
          </View>

          {!!pickupAddress && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.miniMapBtn, isPickupStep && styles.miniMapBtnHighlighted]}
              onPress={onNavigatePickup}
            >
              <MaterialIcons
                name="near-me"
                size={14}
                color={isPickupStep ? colors.background : colors.onSurface}
              />
              <Text
                style={[
                  styles.miniMapBtnText,
                  isPickupStep && styles.miniMapBtnTextHighlighted,
                ]}
              >
                Maps
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View
        style={[
          styles.timelineRow,
          { marginTop: 6 },
          isDeliveryStep && styles.activeStopRow,
        ]}
      >
        <View style={styles.timelineIndicatorColumn}>
          <View
            style={[
              styles.timelineNode,
              {
                borderColor: colors.tertiary,
                backgroundColor: isDeliveryStep ? colors.greenAlpha30 : 'rgba(255, 255, 255, 0.06)',
              },
            ]}
          >
            <MaterialIcons name="location-on" size={15} color={colors.tertiary} />
          </View>
        </View>

        <View style={styles.timelineContent}>
          <View style={styles.timelineTextGroup}>
            <View style={styles.timelineTagRow}>
              <Text style={[styles.timelineTag, { color: colors.tertiary }]}>DROP-OFF</Text>
              {isDeliveryStep && (
                <View style={[styles.activePill, { backgroundColor: colors.greenAlpha15 }]}>
                  <Text style={[styles.activePillText, { color: colors.tertiary }]}>Next Stop</Text>
                </View>
              )}
            </View>
            <Text style={styles.timelineTitle} numberOfLines={1}>Customer Destination</Text>
            <Text style={styles.timelineAddress}>{deliveryAddress || '(not set)'}</Text>
          </View>

          {!!deliveryAddress && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.miniMapBtn, isDeliveryStep && styles.miniMapBtnDelivery]}
              onPress={onNavigateDelivery}
            >
              <MaterialIcons
                name="near-me"
                size={14}
                color={isDeliveryStep ? colors.background : colors.onSurface}
              />
              <Text
                style={[
                  styles.miniMapBtnText,
                  isDeliveryStep && styles.miniMapBtnTextHighlighted,
                ]}
              >
                Maps
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </CustomCard>
  );
}

const styles = StyleSheet.create({
  routeCard: {
    marginHorizontal: 20,
    padding: 16,
    gap: 12,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassLevel2Border,
    marginBottom: 4,
  },
  routeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeHeaderTitle: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.glassLevel2Bg,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  distanceBadgeText: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '600',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  activeStopRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  timelineIndicatorColumn: {
    alignItems: 'center',
    width: 28,
  },
  timelineNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineConnectorLine: {
    width: 2,
    height: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 3,
    borderRadius: 1,
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  timelineTextGroup: {
    flex: 1,
  },
  timelineTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  timelineTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  activePill: {
    backgroundColor: colors.primaryAlpha20,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  activePillText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineTitle: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  timelineAddress: {
    color: colors.outline,
    fontSize: 12,
    lineHeight: 16,
  },
  miniMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: colors.glassLevel2Bg,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
  },
  miniMapBtnHighlighted: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  miniMapBtnDelivery: {
    backgroundColor: colors.tertiary,
    borderColor: colors.tertiary,
  },
  miniMapBtnText: {
    color: colors.onSurface,
    fontSize: 11,
    fontWeight: '700',
  },
  miniMapBtnTextHighlighted: {
    color: colors.background,
  },
});
