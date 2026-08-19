import React from 'react';
import { StyleSheet, Pressable, Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '@/constants/design';

interface NewOrderSubmitButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function NewOrderSubmitButton({
  onPress,
  loading = false,
  disabled = false,
}: NewOrderSubmitButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [
        styles.wrapper,
        pressed && styles.wrapperPressed,
        (loading || disabled) && styles.wrapperDisabled,
      ]}
    >
      <LinearGradient
        colors={['#1E75FF', colors.primaryContainer, '#004ECC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={colors.onPrimaryContainer} />
        ) : (
          <>
            <MaterialIcons name="check-circle" size={20} color={colors.onPrimaryContainer} />
            <Text style={styles.text}>CREATE ORDER</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    shadowColor: shadows.cobaltGlow.shadowColor,
    shadowOffset: shadows.cobaltGlow.shadowOffset,
    shadowOpacity: shadows.cobaltGlow.shadowOpacity,
    shadowRadius: shadows.cobaltGlow.shadowRadius,
    elevation: 8,
  },
  wrapperPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  wrapperDisabled: {
    opacity: 0.5,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimaryContainer,
    letterSpacing: 1,
  },
});
