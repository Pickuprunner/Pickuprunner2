import React from 'react';
import { LogOut, LogIn, Trash2 } from '@blinkdotnew/mobile-ui';
import { router } from 'expo-router';
import { ProfileSection, ItemDivider } from './ProfileSection';
import { ProfileActionRow } from './ProfileActionRow';

const GREEN = '#22C55E';
const RED = '#EF4444';

export interface ProfileAccountSectionProps {
  isAuthenticated: boolean;
  onSignOut: () => void;
  isDriver?: boolean;
}

export function ProfileAccountSection({
  isAuthenticated,
  onSignOut,
  isDriver = false,
}: ProfileAccountSectionProps) {
  return (
    <ProfileSection title="ACCOUNT">
      {isAuthenticated ? (
        <>
          <ProfileActionRow
            icon={<LogOut size={18} color={RED} />}
            iconBg="rgba(239, 68, 68, 0.12)"
            title="Sign Out"
            titleColor={RED}
            subtitle={isDriver ? 'End current driver session' : 'Log out of current account'}
            onPress={onSignOut}
            showChevron={false}
            hapticStyle="heavy"
          />

          <ItemDivider />

          <ProfileActionRow
            icon={<Trash2 size={18} color="#F87171" />}
            iconBg="rgba(239, 68, 68, 0.08)"
            title="Delete Account"
            titleColor="#F87171"
            subtitle={isDriver ? 'Permanently remove driver data' : 'Permanently remove account data'}
            onPress={() => router.push('/delete-account')}
            showChevron={false}
            hapticStyle="medium"
          />
        </>
      ) : (
        <ProfileActionRow
          icon={<LogIn size={18} color={GREEN} />}
          iconBg="rgba(34, 197, 94, 0.15)"
          title="Sign In / Create Account"
          titleColor={GREEN}
          subtitle={
            isDriver
              ? 'Unlock full syncing and driver features'
              : 'Save delivery history & sync across devices'
          }
          onPress={() => router.push('/sign-in')}
          hapticStyle="medium"
        />
      )}
    </ProfileSection>
  );
}
