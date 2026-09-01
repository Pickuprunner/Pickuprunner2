import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, ShieldAlert, Clock, AlertTriangle } from '@blinkdotnew/mobile-ui';
import { ProfileActionRow } from './ProfileActionRow';

const GREEN = '#22C55E';
const GOLD_ACCENT = '#E5A93C';
const RED = '#EF4444';
const TEXT_MUTED = '#94A3B8';

export type DocStatus = 'approved' | 'rejected' | 'pending' | 'in_review' | undefined;

export interface StatusCfg {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}

export function getStatusCfg(s: DocStatus): StatusCfg {
  switch (s) {
    case 'approved':
      return {
        label: 'Approved',
        color: GREEN,
        bg: 'rgba(34, 197, 94, 0.12)',
        border: 'rgba(34, 197, 94, 0.35)',
        icon: <CheckCircle size={15} color={GREEN} />,
      };
    case 'rejected':
      return {
        label: 'Action Needed',
        color: RED,
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.35)',
        icon: <ShieldAlert size={15} color={RED} />,
      };
    case 'in_review':
    case 'pending':
      return {
        label: 'In Review',
        color: GOLD_ACCENT,
        bg: 'rgba(229, 169, 60, 0.12)',
        border: 'rgba(229, 169, 60, 0.35)',
        icon: <Clock size={15} color={GOLD_ACCENT} />,
      };
    default:
      return {
        label: 'Required',
        color: TEXT_MUTED,
        bg: 'rgba(148, 163, 184, 0.1)',
        border: 'rgba(148, 163, 184, 0.25)',
        icon: <AlertTriangle size={15} color={TEXT_MUTED} />,
      };
  }
}

export interface DocStatusItemProps {
  title: string;
  subtitle: string;
  status: DocStatus;
  onPress?: () => void;
}

export function DocStatusItem({ title, subtitle, status, onPress }: DocStatusItemProps) {
  const cfg = getStatusCfg(status);

  return (
    <ProfileActionRow
      icon={cfg.icon}
      iconBg={cfg.bg}
      iconBorder={cfg.border}
      title={title}
      subtitle={subtitle}
      onPress={onPress}
      hapticStyle="light"
      rightControl={
        <View style={styles.rightGroup}>
          <View style={[styles.docStatusPill, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Text style={[styles.docStatusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  docStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
});
