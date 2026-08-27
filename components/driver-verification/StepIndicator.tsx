import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from '@blinkdotnew/mobile-ui';
import { colors, borderRadius, spacing } from '@/constants/design';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
  steps?: { title: string; subtitle?: string }[];
}

const DEFAULT_STEPS = [
  { title: 'Vehicle', subtitle: 'Make & Address' },
  { title: 'License', subtitle: 'State & Photo' },
  { title: 'Check', subtitle: 'FCRA Consent' },
  { title: 'Insurance', subtitle: 'Policy & VIN' },
  { title: 'Review', subtitle: 'Approval' },
];

export function StepIndicator({
  currentStep,
  totalSteps = 5,
  steps = DEFAULT_STEPS,
}: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {steps.slice(0, totalSteps).map((step, idx) => {
          const stepNum = idx + 1;
          const isDone = currentStep > stepNum;
          const isActive = currentStep === stepNum;

          return (
            <React.Fragment key={idx}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.circle,
                    isDone && styles.circleDone,
                    isActive && styles.circleActive,
                  ]}
                >
                  {isDone ? (
                    <Check size={14} color="#0F131C" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNum,
                        isActive && styles.stepNumActive,
                      ]}
                    >
                      {stepNum}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    (isActive || isDone) && styles.stepLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {step.title}
                </Text>
              </View>

              {idx < totalSteps - 1 && (
                <View
                  style={[
                    styles.line,
                    currentStep > stepNum && styles.lineDone,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.gutter,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  circleActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  circleDone: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  stepNumActive: {
    color: colors.onPrimaryContainer,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.outline,
  },
  stepLabelActive: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 4,
    marginBottom: 16,
  },
  lineDone: {
    backgroundColor: '#22C55E',
  },
});
