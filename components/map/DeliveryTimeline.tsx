import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Order } from '@/lib/orders';

interface StepConfig {
  key: string;
  label: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
}

const STEPS: StepConfig[] = [
  { key: 'pending', label: 'Confirmed', iconName: 'receipt-long' },
  { key: 'accepted', label: 'Accepted', iconName: 'person-pin' },
  { key: 'picked_up', label: 'In Transit', iconName: 'local-shipping' },
  { key: 'delivered', label: 'Delivered', iconName: 'where-to-vote' },
];

const BLUE = '#0066FF';
const GREEN = '#00E297';

export function DeliveryTimeline({ status }: { status: Order['status'] }) {
  const orderKeys = ['pending', 'accepted', 'picked_up', 'delivered'];
  const currentIndex = Math.max(0, orderKeys.indexOf(status));
  const isAllDelivered = currentIndex === 3;

  const currentLabel =
    currentIndex === 0
      ? 'Order Placed'
      : currentIndex === 1
        ? 'Driver Assigned'
        : currentIndex === 2
          ? 'On The Way'
          : 'Delivered';

  return (
    <View style={styles.timelineContainer}>
      {/* Header with Title & Active Status Pill */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>DELIVERY PROGRESS</Text>
        <View style={[styles.statusPill, isAllDelivered && styles.statusPillDelivered]}>
          <View style={[styles.statusDot, isAllDelivered && styles.statusDotDelivered]} />
          <Text style={[styles.statusPillText, isAllDelivered && styles.statusPillTextDelivered]}>
            {currentLabel}
          </Text>
        </View>
      </View>

      {/* Stepper with strictly separated nodes & connector lines */}
      <View style={styles.stepperContainer}>
        {/* Row of Circles & Intermediary Line Segments */}
        <View style={styles.circlesRow}>
          {STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isActive = index === currentIndex;

            return (
              <React.Fragment key={step.key}>
                <View
                  style={[
                    styles.nodeCircle,
                    isCompleted && styles.nodeCircleCompleted,
                    isActive && styles.nodeCircleActive,
                  ]}
                >
                  <MaterialIcons
                    name={step.iconName}
                    size={14}
                    color={
                      isCompleted
                        ? GREEN
                        : isActive
                          ? BLUE
                          : 'rgba(255, 255, 255, 0.28)'
                    }
                  />
                </View>

                {/* Connector line strictly between adjacent nodes */}
                {index < STEPS.length - 1 && (
                  <View
                    style={[
                      styles.connectorLine,
                      index < currentIndex && styles.connectorCompleted,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Row of Labels underneath */}
        <View style={styles.labelsRow}>
          {STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isActive = index === currentIndex;

            return (
              <View key={step.key} style={styles.labelCol}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.stepLabel,
                    isCompleted && styles.labelCompleted,
                    isActive && styles.labelActive,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timelineContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8C90A1',
    letterSpacing: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 102, 255, 0.12)',
    borderColor: 'rgba(0, 102, 255, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BLUE,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: BLUE,
    letterSpacing: 0.2,
  },
  statusPillDelivered: {
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderColor: 'rgba(0, 226, 151, 0.3)',
  },
  statusDotDelivered: {
    backgroundColor: GREEN,
  },
  statusPillTextDelivered: {
    color: GREEN,
  },
  stepperContainer: {
    width: '100%',
    gap: 6,
  },
  circlesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  nodeCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#131824',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCircleCompleted: {
    backgroundColor: 'rgba(0, 226, 151, 0.12)',
    borderColor: GREEN,
    borderWidth: 1.5,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  nodeCircleActive: {
    backgroundColor: 'rgba(0, 102, 255, 0.14)',
    borderColor: BLUE,
    borderWidth: 2,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 7,
  },
  connectorLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 4,
    borderRadius: 1,
  },
  connectorCompleted: {
    backgroundColor: GREEN,
    height: 2.5,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  labelCol: {
    flex: 1,
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  labelCompleted: {
    color: GREEN,
    fontWeight: '700',
  },
  labelActive: {
    color: BLUE,
    fontWeight: '800',
  },
});
