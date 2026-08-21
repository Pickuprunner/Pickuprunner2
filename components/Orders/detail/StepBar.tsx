import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '@/constants/design';

export const STEP_INDEX_MAP: Record<string, number> = {
  pending: 0,
  accepted: 1,
  picked_up: 2,
  delivered: 3,
};

export const STEPS = [
  { label: 'Accept', index: 0 },
  { label: 'Pick Up', index: 1 },
  { label: 'Deliver', index: 2 },
];

export function StepBar({ status }: { status: string }) {
  const currentStep = STEP_INDEX_MAP[status] ?? 0;

  return (
    <View style={styles.stepBarContainer}>
      <View style={styles.stepBar}>
        {STEPS.map((step, idx) => {
          const isDone = currentStep > step.index;
          const isActive = currentStep === step.index;

          return (
            <React.Fragment key={step.label}>
              {idx > 0 && (
                <View
                  style={[
                    styles.stepLine,
                    {
                      backgroundColor:
                        currentStep >= step.index
                          ? colors.tertiary
                          : 'rgba(255, 255, 255, 0.08)',
                    },
                  ]}
                />
              )}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isDone
                      ? styles.stepDone
                      : isActive
                      ? styles.stepActive
                      : styles.stepFuture,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNum,
                      isDone || isActive
                        ? { color: colors.background }
                        : { color: colors.outline },
                    ]}
                  >
                    {isDone ? '✓' : step.index + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isDone
                      ? { color: colors.tertiary }
                      : isActive
                      ? { color: colors.secondary, fontWeight: '700' }
                      : { color: colors.outline },
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepBarContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: colors.glassLevel2Bg,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    marginBottom: 20,
    borderRadius: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: {
    backgroundColor: colors.tertiary,
  },
  stepActive: {
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  stepFuture: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '800',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
