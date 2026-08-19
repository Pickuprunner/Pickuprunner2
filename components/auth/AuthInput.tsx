import React, { forwardRef } from 'react';
import { TextInput } from 'react-native';
import { CustomInput, CustomInputProps } from '@/components/core/CustomInput';

export interface AuthInputProps extends CustomInputProps {
  icon?: React.ReactNode;
}

export const AuthInput = forwardRef<TextInput, AuthInputProps>(
  ({ icon, leftIcon, ...props }, ref) => {
    return (
      <CustomInput
        ref={ref}
        variant="rounded"
        leftIcon={leftIcon || icon}
        {...props}
      />
    );
  }
);

AuthInput.displayName = 'AuthInput';

export default AuthInput;
