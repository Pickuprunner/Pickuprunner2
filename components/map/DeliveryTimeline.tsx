import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Order } from '@/lib/orders';

export function DeliveryTimeline({ status }: { status: Order['status'] }) {
  const steps = [
    { key: 'pending', label: 'CONFIRMED' },
    { key: 'accepted', label: 'ACCEPTED' },
    { key: 'picked_up', label: 'PICKED UP' },
    { key: 'delivered', label: 'DELIVERED' },
  ];

  const getStepState = (stepKey: string) => {
    const order = ['pending', 'accepted', 'picked_up', 'delivered'];
    const currentIndex = order.indexOf(status);
    const stepIndex = order.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'upcoming';
  };

  return (
    <View style={styles.timelineContainer}>
      <View style={styles.timelineTrack}>
        <View
          style={[
            styles.timelineFill,
            {
              width:
                status === 'pending'
                  ? '15%'
                  : status === 'accepted'
                    ? '45%'
                    : status === 'picked_up'
                      ? '75%'
                      : '100%',
            },
          ]}
        />
      </View>

      <View style={styles.timelineNodesRow}>
        {steps.map((step) => {
          const state = getStepState(step.key);
          return (
            <View key={step.key} style={styles.timelineNodeItem}>
              <View
                style={[
                  styles.timelineNode,
                  state === 'completed' && styles.nodeCompleted,
                  state === 'active' && styles.nodeActive,
                ]}
              >
                {state === 'completed' ? (
                  <Text style={styles.nodeCheck}>✓</Text>
                ) : state === 'active' ? (
                  <View style={styles.nodeInnerDot} />
                ) : null}
              </View>
              <Text
                style={[
                  styles.timelineNodeLabel,
                  state === 'completed' && styles.nodeLabelCompleted,
                  state === 'active' && styles.nodeLabelActive,
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
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  timelineTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    position: 'relative',
    marginBottom: 8,
  },
  timelineFill: {
    height: '100%',
    backgroundColor: '#0066FF',
    borderRadius: 2,
  },
  timelineNodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineNodeItem: {
    alignItems: 'center',
    width: '23%',
  },
  timelineNode: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1E2434',
    borderWidth: 2,
    borderColor: '#333D54',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  nodeCompleted: {
    backgroundColor: '#0066FF',
    borderColor: '#0066FF',
  },
  nodeActive: {
    backgroundColor: '#0F131C',
    borderColor: '#0066FF',
    borderWidth: 2,
  },
  nodeInnerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0066FF',
  },
  nodeCheck: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  timelineNodeLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  nodeLabelCompleted: {
    color: '#94A3B8',
  },
  nodeLabelActive: {
    color: '#0066FF',
    fontWeight: '900',
  },
});
