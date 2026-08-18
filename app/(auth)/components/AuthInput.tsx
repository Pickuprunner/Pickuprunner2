import React from 'react';
import {
  TextInput,
  Pressable,
  Platform,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { YStack, XStack, SizableText, Eye, EyeOff } from '@blinkdotnew/mobile-ui';
import { colors, spacing, borderRadius } from '@/constants/design';

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
    <YStack gap="$1" width="100%">
      <SizableText size="$2" fontWeight="700" color="$color10">
        {label}
      </SizableText>
      <XStack
        alignItems="center"
        backgroundColor="$color3"
        borderRadius={borderRadius.DEFAULT}
        borderWidth={1.5}
        borderColor={error ? '$red8' : '$color5'}
        paddingHorizontal="$4"
        gap="$2"
      >
        {icon}
        <TextInput
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={isPassword && !showPassword}
          style={[
            styles.input,
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
            style,
          ]}
          {...props}
        />
        {isPassword && onTogglePassword && (
          <Pressable onPress={onTogglePassword} hitSlop={8}>
            {showPassword ? (
              <EyeOff size={18} color="$color9" />
            ) : (
              <Eye size={18} color="$color9" />
            )}
          </Pressable>
        )}
      </XStack>
      {hint && (
        <SizableText size="$1" color="$color9" paddingLeft="$1">
          {hint}
        </SizableText>
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: colors.text,
  },
});
