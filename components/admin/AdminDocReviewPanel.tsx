import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { DriverVerification } from '@/lib/verification';
import { colors, spacing } from '@/constants/design';
import VerifCard from './VerifCard';
import { AdminSubTabToggle, type SubTabFilter } from './AdminSubTabToggle';

export interface AdminDocReviewPanelProps {
  verifications: DriverVerification[];
  isSearching?: boolean;
  searchQuery?: string;
}

export default function AdminDocReviewPanel({
  verifications,
  isSearching = false,
  searchQuery = '',
}: AdminDocReviewPanelProps) {
  const [subTab, setSubTab] = useState<SubTabFilter>('pending');

  const pending = verifications.filter((v) => v.status === 'pending');
  const rest = verifications.filter((v) => v.status !== 'pending');

  if (verifications.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <MaterialIcons
          name={isSearching ? 'search-off' : 'inbox'}
          size={38}
          color={colors.outline}
          style={{ opacity: 0.45 }}
        />
        <Text style={styles.emptyText}>
          {isSearching
            ? `No documents matching "${searchQuery}"`
            : 'No document submissions yet.'}
        </Text>
      </View>
    );
  }

  // When searching, hide sub-toggle and display matching search results directly
  if (isSearching) {
    return (
      <View style={styles.container}>
        <View style={styles.group}>
          {verifications.map((v) => (
            <VerifCard key={v.id} v={v} />
          ))}
        </View>
      </View>
    );
  }

  const showPending = subTab === 'pending' || subTab === 'all';
  const showResolved = subTab === 'resolved' || subTab === 'all';

  return (
    <View style={styles.container}>
      {/* Fluid Animated Sub-Tab Toggle */}
      <AdminSubTabToggle
        value={subTab}
        onChange={setSubTab}
        pendingCount={pending.length}
        resolvedCount={rest.length}
      />

      {/* Needs Review Section */}
      {showPending && (
        <View style={styles.group}>
          {pending.length === 0 && subTab === 'pending' ? (
            <View style={styles.emptyCardMini}>
              <MaterialIcons name="inbox" size={32} color={colors.outline} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyText}>No documents waiting for review</Text>
            </View>
          ) : (
            pending.map((v) => <VerifCard key={v.id} v={v} />)
          )}
        </View>
      )}

      {/* Reviewed & Resolved Section */}
      {showResolved && (
        <View style={styles.group}>
          {rest.length === 0 && subTab === 'resolved' ? (
            <View style={styles.emptyCardMini}>
              <MaterialIcons name="archive" size={32} color={colors.outline} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyText}>No resolved verifications yet</Text>
            </View>
          ) : (
            rest.map((v) => <VerifCard key={v.id} v={v} />)
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  group: {
    gap: spacing.sm,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyCardMini: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyText: {
    fontSize: 13,
    color: colors.outline,
    textAlign: 'center',
  },
});
