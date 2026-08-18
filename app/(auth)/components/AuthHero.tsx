import React from 'react';
import { YStack, SizableText } from '@blinkdotnew/mobile-ui';

interface AuthHeroProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  iconBorderColor?: string;
  title: string;
  subtitle: string;
}

export function AuthHero({
  icon,
  iconBgColor = 'rgba(245, 196, 0, 0.12)',
  iconBorderColor = 'rgba(245, 196, 0, 0.4)',
  title,
  subtitle,
}: AuthHeroProps) {
  return (
    <YStack alignItems="center" gap="$3" marginBottom="$8">
      <YStack
        width={72}
        height={72}
        borderRadius={36}
        backgroundColor={iconBgColor}
        alignItems="center"
        justifyContent="center"
        borderWidth={2}
        borderColor={iconBorderColor}
      >
        {icon}
      </YStack>
      <YStack alignItems="center" gap="$1">
        <SizableText size="$8" fontWeight="800" color="$color12" textAlign="center">
          {title}
        </SizableText>
        <SizableText size="$3" color="$color10" textAlign="center" paddingHorizontal="$4">
          {subtitle}
        </SizableText>
      </YStack>
    </YStack>
  );
}
