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

const BLUE = '#00A8FF';
const GREEN = '#00E297';

export function DeliveryTimeline({ status }: { status: Order['status'] }) {
  const orderKeys = ['pending', 'accepted', 'picked_up', 'delivered'];
  const currentIndex = Math.max(0, orderKeys.indexOf(status));
  const isAllDelivered = status === 'delivered';

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
      
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>DELIVERY PROGRESS</Text>
        <View style={[styles.statusPill, isAllDelivered && styles.statusPillDelivered]}>
          <View style={[styles.statusDot, isAllDelivered && styles.statusDotDelivered]} />
          <Text style={[styles.statusPillText, isAllDelivered && styles.statusPillTextDelivered]}>
            {currentLabel}
          </Text>
        </View>
      </View>

      
      <View style={styles.stepperContainer}>
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex || (isAllDelivered && index === currentIndex);
          const isActive = index === currentIndex && !isAllDelivered;

          return (
            <View key={step.key} style={styles.stepColumn}>
              
              <View style={styles.nodeRow}>
                
                <View
                  style={[
                    styles.connectorHalf,
                    index === 0
                      ? styles.connectorHidden
                      : index <= currentIndex
                        ? styles.connectorCompleted
                        : null,
                  ]}
                />

                {/* Node Circle */}
                <View
                  style={[
                    styles.nodeCircle,
                    isCompleted && styles.nodeCircleCompleted,
                    isActive && styles.nodeCircleActive,
                  ]}
                >
                  {isCompleted ? (
                    <MaterialIcons name="check" size={15} color="#07121E" />
                  ) : (
                    <MaterialIcons
                      name={step.iconName}
                      size={isActive ? 15 : 13}
                      color={isActive ? BLUE : 'rgba(255, 255, 255, 0.35)'}
                    />
                  )}
                </View>

               
                <View
                  style={[
                    styles.connectorHalf,
                    index === STEPS.length - 1
                      ? styles.connectorHidden
                      : index < currentIndex
                        ? styles.connectorCompleted
                        : null,
                  ]}
                />
              </View>

             
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
    backgroundColor: 'rgba(0, 168, 255, 0.12)',
    borderColor: 'rgba(0, 168, 255, 0.35)',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  stepColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  connectorHalf: {
    flex: 1,
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  connectorCompleted: {
    backgroundColor: GREEN,
  },
  connectorHidden: {
    backgroundColor: 'transparent',
  },
  nodeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#111724',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCircleCompleted: {
    backgroundColor: GREEN,
    borderColor: GREEN,
    borderWidth: 1.5,
  },
  nodeCircleActive: {
    backgroundColor: '#071830',
    borderColor: BLUE,
    borderWidth: 2,
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
    fontWeight: '700',
  },
});
