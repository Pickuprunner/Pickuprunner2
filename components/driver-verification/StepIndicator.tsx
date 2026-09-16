import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import {
  Car,
  FileText,
  ShieldCheck,
  Umbrella,
  Check,
} from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';

export interface StepItem {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<any>;
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
  steps?: StepItem[];
  onStepPress?: (stepNumber: number) => void;
  isInteractive?: boolean;
}

const DEFAULT_STEPS: StepItem[] = [
  { title: 'Vehicle', subtitle: 'Make & Address', icon: Car },
  { title: 'License', subtitle: 'State & Photo', icon: FileText },
  { title: 'Check', subtitle: 'FCRA Consent', icon: ShieldCheck },
  { title: 'Insurance', subtitle: 'Policy & VIN', icon: Umbrella },
];

export function StepIndicator({
  currentStep,
  totalSteps = 4,
  steps = DEFAULT_STEPS,
  onStepPress,
  isInteractive = false,
}: StepIndicatorProps) {
  const canPress = isInteractive || Boolean(onStepPress);

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {steps.slice(0, totalSteps).map((step, idx) => {
          const stepNum = idx + 1;
          const isDone = currentStep > stepNum;
          const isActive = currentStep === stepNum;
          const StepIcon = step.icon || DEFAULT_STEPS[idx]?.icon || Car;

          return (
            <React.Fragment key={idx}>
              <TouchableOpacity
                activeOpacity={canPress ? 0.7 : 1}
                disabled={!canPress}
                onPress={() => {
                  if (onStepPress) {
                    if (Platform.OS !== 'web') {
                      Haptics.selectionAsync().catch(() => {});
                    }
                    onStepPress(stepNum);
                  }
                }}
                style={styles.stepItem}
              >
                <View
                  style={[
                    styles.circle,
                    isActive && styles.circleActive,
                    isDone && styles.circleDone,
                  ]}
                >
                  {isDone ? (
                    <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                  ) : (
                    <StepIcon
                      size={19}
                      color={isActive ? '#FFFFFF' : '#8C90A1'}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                  )}
                </View>
                <Text style={styles.stepLabel} numberOfLines={1}>
                  <Text
                    style={[
                      styles.stepNumPrefix,
                      isActive && styles.stepNumPrefixActive,
                      isDone && styles.stepNumPrefixDone,
                    ]}
                  >
                    {`${stepNum}. `}
                  </Text>
                  <Text
                    style={[
                      styles.stepTitle,
                      isActive && styles.stepTitleActive,
                      isDone && styles.stepTitleDone,
                    ]}
                  >
                    {step.title}
                  </Text>
                </Text>
              </TouchableOpacity>

              {idx < totalSteps - 1 && (
                <View
                  style={[
                    styles.line,
                    currentStep > idx && styles.lineActive,
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
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    minWidth: 54,
  },
  circle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#161B26',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  circleActive: {
    backgroundColor: '#0066FF',
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 2,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 0 14px rgba(0, 102, 255, 0.45)',
        } as any)
      : {}),
  },
  circleDone: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
    borderWidth: 1.5,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 0 12px rgba(34, 197, 94, 0.35)',
        } as any)
      : {}),
  },
  stepLabel: {
    marginTop: 8,
    textAlign: 'center',
  },
  stepNumPrefix: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#8C90A1',
  },
  stepNumPrefixActive: {
    color: '#0066FF',
    fontWeight: '700',
  },
  stepNumPrefixDone: {
    color: '#22C55E',
    fontWeight: '600',
  },
  stepPrefixActive: {
    color: '#0066FF',
    fontWeight: '700',
  },
  stepPrefixDone: {
    color: '#22C55E',
    fontWeight: '600',
  },
  stepTitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#8C90A1',
  },
  stepTitleActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  stepTitleDone: {
    color: '#DFE2EF',
    fontWeight: '600',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 3,
    marginTop: 20,
  },
  lineActive: {
    backgroundColor: '#0066FF',
  },
});
