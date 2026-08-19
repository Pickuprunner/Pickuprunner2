import React from 'react';
import { CustomInput, CustomInputProps } from '@/components/core/CustomInput';

export interface AuthInputProps extends CustomInputProps {
  icon?: React.ReactNode;
}

export function AuthInput({ icon, leftIcon, ...props }: AuthInputProps) {
  return (
    <CustomInput
      variant="rounded"
      leftIcon={leftIcon || icon}
      {...props}
    />
  );
}

export default AuthInput;
