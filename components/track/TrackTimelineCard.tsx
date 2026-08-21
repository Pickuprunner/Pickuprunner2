import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/constants/design';

export interface TrackTimelineCardProps {
  status: string;
  driverName?: string | null;
  createdAt?: string;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'Just now';
  const timestamp = new Date(dateStr).getTime();
  if (isNaN(timestamp)) return 'Just now';

  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function TrackTimelineCard({ status, driverName, createdAt }: TrackTimelineCardProps) {
  const isAccepted = status === 'accepted';
  const isPickedUp = status === 'picked_up';
  const isDelivered = status === 'delivered';
  const hasDriver = isAccepted || isPickedUp || isDelivered || !!driverName;
  const inTransit = isPickedUp || isDelivered;

  return (
    <View style={styles.card}>
      <Text style={styles.cardHeaderLabel}>ORDER STATUS PIPELINE</Text>

      <View style={styles.timelineContainer}>
        {/* Step 1: Order Placed */}
        <View style={styles.timelineStep}>
          <View style={[styles.stepDot, styles.stepDotDone]}>
            <MaterialIcons name="check" size={16} color={colors.tertiary} />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Order Placed</Text>
            <Text style={styles.stepSubtitle}>{timeAgo(createdAt)}</Text>
          </View>
        </View>

        <View
          style={[
            styles.timelineConnector,
            hasDriver && styles.timelineConnectorActive,
          ]}
        />

        {/* Step 2: Driver Assigned */}
        <View style={styles.timelineStep}>
          <View
            style={[
              styles.stepDot,
              hasDriver ? styles.stepDotDone : styles.stepDotPending,
            ]}
          >
            {hasDriver ? (
              <MaterialIcons name="check" size={16} color={colors.tertiary} />
            ) : (
              <Text style={styles.stepNumber}>2</Text>
            )}
          </View>
          <View style={styles.stepContent}>
            <Text
              style={[
                styles.stepTitle,
                !hasDriver && styles.stepTitleInactive,
              ]}
            >
              Driver Assigned
            </Text>
            <Text style={styles.stepSubtitle}>
              {driverName ? `${driverName} is on the way to store` : 'Matching nearest driver…'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.timelineConnector,
            inTransit && styles.timelineConnectorActive,
          ]}
        />

        {/* Step 3: Out For Delivery */}
        <View style={styles.timelineStep}>
          <View
            style={[
              styles.stepDot,
              inTransit ? styles.stepDotDone : styles.stepDotPending,
            ]}
          >
            {inTransit ? (
              <MaterialIcons name="check" size={16} color={colors.tertiary} />
            ) : (
              <Text style={styles.stepNumber}>3</Text>
            )}
          </View>
          <View style={styles.stepContent}>
            <Text
              style={[
                styles.stepTitle,
                !inTransit && styles.stepTitleInactive,
              ]}
            >
              Out For Delivery
            </Text>
            <Text style={styles.stepSubtitle}>
              {inTransit ? 'Package picked up · En route to you' : 'Pending pickup from store'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.timelineConnector,
            isDelivered && styles.timelineConnectorActive,
          ]}
        />

        {/* Step 4: Delivered */}
        <View style={styles.timelineStep}>
          <View
            style={[
              styles.stepDot,
              isDelivered ? styles.stepDotDone : styles.stepDotPending,
            ]}
          >
            {isDelivered ? (
              <MaterialIcons name="check" size={16} color={colors.tertiary} />
            ) : (
              <Text style={styles.stepNumber}>4</Text>
            )}
          </View>
          <View style={styles.stepContent}>
            <Text
              style={[
                styles.stepTitle,
                !isDelivered && styles.stepTitleInactive,
              ]}
            >
              Delivered
            </Text>
            <Text style={styles.stepSubtitle}>
              {isDelivered ? 'Order completed & proof uploaded' : 'Estimated arrival soon'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    backgroundColor: colors.glassLevel2Bg,
    padding: 20,
    gap: 16,
  },
  cardHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.outline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepDotDone: {
    backgroundColor: colors.greenAlpha15,
    borderWidth: 1.5,
    borderColor: colors.tertiary,
  },
  stepDotPending: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.outline,
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  stepTitleInactive: {
    color: colors.outline,
  },
  stepSubtitle: {
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
  },
  timelineConnector: {
    width: 2,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: 15,
    marginVertical: 3,
  },
  timelineConnectorActive: {
    backgroundColor: colors.tertiary,
  },
});
