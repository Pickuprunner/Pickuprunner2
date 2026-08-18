import React from 'react';
import {
  TextInput,
  Pressable,
  Platform,
  StyleSheet,
  TextInputProps,
  View,
  Text,
} from 'react-native';
import { Eye, EyeOff } from '@blinkdotnew/mobile-ui';
import { colors, borderRadius, spacing } from '@/constants/design';

interface AuthInputProps extends TextInputProps {
  label: string;
  icon?: React.ReactNode;
  isPassword?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  error?: boolean;
  hint?: string;
}

export function AuthInput({
  label,
  icon,
  isPassword = false,
  showPassword = false,
  onTogglePassword,
  error = false,
  hint,
  style,
  ...props
}: AuthInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          error && styles.inputWrapperError,
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          placeholderTextColor={colors.outline}
          secureTextEntry={isPassword && !showPassword}
          style={[
            styles.input,
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
            style,
          ]}
          {...props}
        />
        {isPassword && onTogglePassword && (
          <Pressable onPress={onTogglePassword} hitSlop={8} style={styles.eyeBtn}>
            {showPassword ? (
              <EyeOff size={18} color={colors.outline} />
            ) : (
              <Eye size={18} color={colors.outline} />
            )}
          </Pressable>
        )}
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

export default AuthInput;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.outline,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassLevel2Bg,
    borderRadius: borderRadius.DEFAULT,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    paddingHorizontal: spacing.gutter,
    height: 54,
  },
  inputWrapperError: {
    borderColor: 'rgba(239, 68, 68, 0.6)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  iconContainer: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 15,
    color: colors.onSurface,
  },
  eyeBtn: {
    padding: 4,
  },
  hint: {
    fontSize: 12,
    color: colors.outline,
    paddingLeft: 2,
  },
});
