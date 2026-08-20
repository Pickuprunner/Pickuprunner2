import React, { forwardRef, useState, useRef, useImperativeHandle } from 'react';
import {
  TextInput,
  View,
  Text,
  Pressable,
  Platform,
  StyleSheet,
  ActivityIndicator,
  TextInputProps,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type InputVariant = 'pill' | 'rounded' | 'square';
export type InputStatus = 'default' | 'success' | 'error';

export interface CustomInputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | boolean;
  status?: InputStatus;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  clearable?: boolean;
  onClear?: () => void;
  loading?: boolean;
  variant?: InputVariant;
  focusBorderColor?: string;
  focusGlowColor?: string;
  borderColor?: string;
  backgroundColor?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  wrapperStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  errorStyle?: StyleProp<TextStyle>;
  hintStyle?: StyleProp<TextStyle>;
}

export const CustomInput = forwardRef<TextInput, CustomInputProps>(
  (
    {
      label,
      hint,
      error,
      status = 'default',
      leftIcon,
      rightIcon,
      isPassword = false,
      showPassword: propShowPassword,
      onTogglePassword,
      clearable = false,
      onClear,
      loading = false,
      variant = 'rounded',
      focusBorderColor = '#F4C300',
      focusGlowColor = 'rgba(244, 195, 0, 0.35)',
      borderColor = 'rgba(255, 255, 255, 0.12)',
      backgroundColor,
      disabled = false,
      containerStyle,
      wrapperStyle,
      inputStyle,
      labelStyle,
      errorStyle,
      hintStyle,
      value,
      onChangeText,
      onFocus,
      onBlur,
      placeholderTextColor = '#6B7280',
      style,
      ...restProps
    },
    ref
  ) => {
    const inputRef = useRef<TextInput>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [internalShowPassword, setInternalShowPassword] = useState(false);

    useImperativeHandle(ref, () => inputRef.current as TextInput);

    const isPasswordVisible =
      propShowPassword !== undefined ? propShowPassword : internalShowPassword;

    const togglePasswordVisibility = () => {
      if (onTogglePassword) {
        onTogglePassword();
      } else {
        setInternalShowPassword((prev) => !prev);
      }
    };

    const isError = Boolean(error) || status === 'error';
    const isSuccess = status === 'success' && !isError;
    const errorMessage = typeof error === 'string' ? error : undefined;
    const hasValue = Boolean(value && value.length > 0);
    const isEditable = !disabled && restProps.editable !== false;

    const handleFocus = (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const handleClear = () => {
      onChangeText?.('');
      onClear?.();
    };

    const handleWrapperPress = () => {
      if (isEditable && inputRef.current) {
        inputRef.current.focus();
      }
    };

    const getBorderRadius = () => {
      switch (variant) {
        case 'pill':
          return 9999;
        case 'square':
          return 8;
        case 'rounded':
        default:
          return 14;
      }
    };

    const getBgColor = () => {
      if (backgroundColor) return backgroundColor;
      if (isFocused) {
        if (isError) return 'rgba(255, 77, 79, 0.08)';
        return '#181C28';
      }
      if (errorMessage) return 'rgba(255, 77, 79, 0.06)';
      return '#151821';
    };

    const getDynamicWrapperStyle = (): ViewStyle => {
      if (isFocused) {
        if (isError) {
          return {
            borderColor: '#FF4D4F',
            ...(Platform.OS === 'web'
              ? ({
                  boxShadow: '0 0 12px rgba(255, 77, 79, 0.40)',
                } as any)
              : {}),
          };
        }

        return {
          borderColor: focusBorderColor,
          ...(Platform.OS === 'web'
            ? ({
                boxShadow: `0 0 14px ${focusGlowColor}`,
              } as any)
            : {}),
        };
      }

      if (errorMessage) {
        return {
          borderColor: '#FF4D4F',
        };
      }

      return {
        borderColor,
      };
    };

    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}

        <Pressable
          onPress={handleWrapperPress}
          accessible={false}
          style={[
            styles.wrapper,
            {
              borderRadius: getBorderRadius(),
              backgroundColor: getBgColor(),
            },
            getDynamicWrapperStyle(),
            restProps.multiline && styles.multilineWrapper,
            disabled && styles.disabledWrapper,
            wrapperStyle,
          ]}
        >
          {leftIcon && (
            <View
              style={[
                styles.leftIconContainer,
                restProps.multiline && styles.multilineLeftIcon,
              ]}
            >
              {leftIcon}
            </View>
          )}

          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholderTextColor={placeholderTextColor}
            secureTextEntry={isPassword && !isPasswordVisible}
            editable={isEditable}
            onFocus={handleFocus}
            onBlur={handleBlur}
            returnKeyType={restProps.returnKeyType || (restProps.multiline ? 'default' : 'done')}
            blurOnSubmit={restProps.blurOnSubmit ?? !restProps.multiline}
            style={[
              styles.input,
              restProps.multiline && styles.multilineInput,
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
              disabled && styles.disabledInput,
              inputStyle,
              style,
            ]}
            {...restProps}
          />

          {loading ? (
            <ActivityIndicator
              size="small"
              color={focusBorderColor}
              style={styles.rightAction}
            />
          ) : (
            <View style={styles.rightContainer}>
              {clearable && hasValue && (
                <Pressable
                  onPress={handleClear}
                  hitSlop={10}
                  style={styles.rightAction}
                  accessibilityLabel="Clear text"
                >
                  <Ionicons name="close-circle" size={18} color="#8C90A1" />
                </Pressable>
              )}

              {isSuccess && !isPassword && !rightIcon && (
                <View style={styles.rightAction}>
                  <Ionicons name="checkmark-circle" size={19} color="#00E297" />
                </View>
              )}

              {isPassword && (
                <Pressable
                  onPress={togglePasswordVisibility}
                  hitSlop={12}
                  style={styles.toggleTextBtn}
                  accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      {
                        color: !isFocused
                          ? '#8C90A1'
                          : isError
                          ? '#FF4D4F'
                          : isSuccess
                          ? '#00E297'
                          : focusBorderColor || '#DFE2EF',
                      },
                    ]}
                  >
                    {isPasswordVisible ? 'HIDE' : 'SHOW'}
                  </Text>
                </Pressable>
              )}

              {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
            </View>
          )}
        </Pressable>

        {isError && errorMessage ? (
          <Text style={[styles.errorText, errorStyle]}>{errorMessage}</Text>
        ) : hint ? (
          <Text style={[styles.hintText, hintStyle]}>{hint}</Text>
        ) : null}
      </View>
    );
  }
);

CustomInput.displayName = 'CustomInput';

export default CustomInput;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C90A1',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
    minHeight: 52,
  },
  multilineWrapper: {
    height: 'auto',
    minHeight: 96,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#DFE2EF',
    height: '100%',
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  leftIconContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multilineLeftIcon: {
    marginTop: 2,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  rightIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightAction: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTextBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  disabledWrapper: {
    opacity: 0.5,
    backgroundColor: '#0F131C',
  },
  disabledInput: {
    color: '#8C90A1',
  },
  errorText: {
    fontSize: 12,
    color: '#FF4D4F',
    marginLeft: 4,
    marginTop: 2,
  },
  hintText: {
    fontSize: 12,
    color: '#8C90A1',
    marginLeft: 4,
    marginTop: 2,
  },
});
