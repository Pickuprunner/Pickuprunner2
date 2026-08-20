import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Lock } from '@blinkdotnew/mobile-ui';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius } from '@/constants/design';
import { CustomInput, InputVariant } from '@/components/core/CustomInput';
import { checkPasswordRequirements, PasswordCheckResult } from '@/lib/validation';

export interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  placeholder?: string;
  showRequirements?: boolean;
  onValidityChange?: (isValid: boolean) => void;
  variant?: InputVariant;
  accentColor?: string;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  autoFocus?: boolean;
  error?: string | boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

const RING_SIZE = 26;
const STROKE_WIDTH = 3;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CircularMeter({ metCount, total = 5 }: { metCount: number; total?: number }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(metCount);

  const isComplete = metCount >= total;
  const progress = Math.min(Math.max(metCount / total, 0), 1);
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const getColor = () => {
    if (metCount <= 0) return 'rgba(255, 255, 255, 0.2)';
    if (metCount <= 2) return '#EF4444';
    if (metCount === 3) return '#F59E0B';
    if (metCount === 4) return '#F4C300';
    return '#00E297';
  };

  const ringColor = getColor();

  useEffect(() => {
    if (prevCount.current !== metCount) {
      prevCount.current = metCount;
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.08,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [metCount, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.ringWrapper,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {/* Background Track */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth={STROKE_WIDTH}
          fill={isComplete ? '#00E297' : 'none'}
        />
        {/* Animated Progress Arc */}
        {!isComplete && (
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={ringColor}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            rotation="-90"
          />
        )}
      </Svg>

      {isComplete && (
        <View style={styles.ringCenter}>
          <Ionicons name="checkmark" size={15} color="#0F131C" />
        </View>
      )}
    </Animated.View>
  );
}

export function PasswordInput({
  value,
  onChangeText,
  label = 'PASSWORD',
  placeholder = '••••••••',
  showRequirements = false,
  onValidityChange,
  variant = 'rounded',
  accentColor = colors.primaryContainer,
  onSubmitEditing,
  returnKeyType = 'done',
  autoFocus = false,
  error,
  onFocus,
  onBlur,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const check: PasswordCheckResult = checkPasswordRequirements(value);

  const criteria = [
    { label: '8+ characters', met: check.hasMinLength },
    { label: '1 uppercase (A-Z)', met: check.hasUpper },
    { label: '1 lowercase (a-z)', met: check.hasLower },
    { label: '1 number (0-9)', met: check.hasNumber },
    { label: '1 special character', met: check.hasSpecial },
  ];

  const metCount = criteria.filter((c) => c.met).length;
  const unmetCriteria = criteria.filter((c) => !c.met);

  useEffect(() => {
    onValidityChange?.(check.isValid);
  }, [check.isValid, onValidityChange]);

  const handleChangeText = (text: string) => {
    if (Platform.OS !== 'web' && text.length > value.length) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onChangeText(text);
  };

  const getBorderColor = () => {
    if (!showRequirements || value.length === 0) return accentColor;
    if (metCount <= 2) return '#EF4444';
    if (metCount === 3) return '#F59E0B';
    if (metCount === 4) return '#F4C300';
    return '#00E297';
  };

  const getInputStatus = () => {
    if (error) return 'error';
    if (!showRequirements || value.length === 0) return 'default';
    if (check.isValid) return 'success';
    return 'default';
  };

  return (
    <View style={styles.container}>
      <CustomInput
        label={label}
        value={value}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        isPassword
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword((prev) => !prev)}
        leftIcon={<Lock size={20} color={colors.onSurfaceVariant} />}
        status={getInputStatus()}
        variant={variant}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        autoFocus={autoFocus}
        onFocus={onFocus}
        onBlur={onBlur}
        focusBorderColor={getBorderColor()}
      />

      {showRequirements && value.length > 0 && (
        <View style={styles.requirementsContainer}>
          <View style={styles.inlineRow}>
            <CircularMeter metCount={metCount} total={5} />

            {unmetCriteria.length === 0 ? (
              <Text style={styles.headerTitleMet}>Strong password</Text>
            ) : (
              <View style={styles.criteriaWrap}>
                {unmetCriteria.map((item, idx) => (
                  <View key={idx} style={styles.chip}>
                    <Text style={styles.asterisk}>*</Text>
                    <Text style={styles.chipText}>{item.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default PasswordInput;

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  requirementsContainer: {
    paddingHorizontal: 2,
    paddingTop: 6,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  headerTitleMet: {
    color: '#00E297',
    fontWeight: '700',
    fontSize: 13,
  },
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  criteriaWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  asterisk: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
    marginTop: -1,
  },
  chipText: {
    fontSize: 11.5,
    color: colors.onSurface,
    fontWeight: '500',
  },
});
