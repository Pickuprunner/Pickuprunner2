import React from 'react';
import { RefreshCw } from '@blinkdotnew/mobile-ui';
import { ProfileSection } from './ProfileSection';
import { ProfileActionRow } from './ProfileActionRow';

export interface ProfileSwitchRoleSectionProps {
  currentRole: 'driver' | 'customer';
  onChooseRoleAgain: () => void;
}

export function ProfileSwitchRoleSection({
  currentRole,
  onChooseRoleAgain,
}: ProfileSwitchRoleSectionProps) {
  const isDriver = currentRole === 'driver';

  return (
    <ProfileSection title="SWITCH MODE">
      <ProfileActionRow
        icon={<RefreshCw size={18} color="rgba(255, 255, 255, 0.75)" />}
        iconBg="rgba(255, 255, 255, 0.06)"
        title="Choose Role Again"
        subtitle={isDriver ? 'Switch between Driver and Customer' : 'Select role onboarding screen'}
        onPress={onChooseRoleAgain}
      />
    </ProfileSection>
  );
}
