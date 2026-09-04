import React from 'react';
import { Linking } from 'react-native';
import { HelpCircle, Mail, Shield, ShieldCheck, FileText } from '@blinkdotnew/mobile-ui';
import { openTerms, openPrivacy } from '@/lib/config';
import { ProfileSection, ItemDivider } from './ProfileSection';
import { ProfileActionRow } from './ProfileActionRow';

export interface ProfileSupportSectionProps {
  supportEmail: string;
  isCustomer?: boolean;
}

export function ProfileSupportSection({ supportEmail, isCustomer = false }: ProfileSupportSectionProps) {
  const handleEmailSupport = () => {
    Linking.openURL(`mailto:${supportEmail}`).catch(() => { });
  };

  return (
    <ProfileSection title="SUPPORT & LEGAL">
      <ProfileActionRow
        icon={
          isCustomer ? (
            <Mail size={18} color="rgba(255, 255, 255, 0.8)" />
          ) : (
            <HelpCircle size={18} color="rgba(255, 255, 255, 0.8)" />
          )
        }
        iconBg="rgba(255, 255, 255, 0.06)"
        title={isCustomer ? 'Contact Support' : 'Help & Support'}
        subtitle={isCustomer ? supportEmail : 'Contact Pickup Runner support'}
        onPress={handleEmailSupport}
        hapticStyle="light"
      />

      <ItemDivider />

      <ProfileActionRow
        icon={
          isCustomer ? (
            <ShieldCheck size={18} color="rgba(255, 255, 255, 0.8)" />
          ) : (
            <Shield size={18} color="rgba(255, 255, 255, 0.8)" />
          )
        }
        iconBg="rgba(255, 255, 255, 0.06)"
        title="Privacy Policy"
        onPress={openPrivacy}
        hapticStyle="medium"
      />

      <ItemDivider />

      <ProfileActionRow
        icon={<FileText size={18} color="rgba(255, 255, 255, 0.8)" />}
        iconBg="rgba(255, 255, 255, 0.06)"
        title="Terms of Service"
        onPress={openTerms}
        hapticStyle="medium"
      />
    </ProfileSection>
  );
}
