import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { BackgroundCheck } from '@/lib/backgroundCheck';
import { colors, spacing } from '@/constants/design';
import BGCard from './BGCard';
import { AdminSubTabToggle, type SubTabFilter } from './AdminSubTabToggle';

export interface AdminBGReviewPanelProps {
  bgChecks: BackgroundCheck[];
  isSearching?: boolean;
  searchQuery?: string;
}

export default function AdminBGReviewPanel({
  bgChecks,
  isSearching = false,
  searchQuery = '',
}: AdminBGReviewPanelProps) {
  const [subTab, setSubTab] = useState<SubTabFilter>('pending');

  const needsAction = bgChecks.filter((c) => c.status === 'pending' || c.status === 'in_review');
  const resolved = bgChecks.filter((c) => c.status === 'approved' || c.status === 'rejected');

  if (bgChecks.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <MaterialIcons
          name={isSearching ? 'search-off' : 'fingerprint'}
          size={38}
          color={colors.outline}
          style={{ opacity: 0.45 }}
        />
        <Text style={styles.emptyText}>
          {isSearching
            ? `No background checks matching "${searchQuery}"`
            : 'No background check submissions yet.'}
        </Text>
      </View>
    );
  }

  // When searching, hide sub-toggle and display matching search results directly
  if (isSearching) {
    return (
      <View style={styles.container}>
        <View style={styles.group}>
          {bgChecks.map((c) => (
            <BGCard key={c.id} check={c} />
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
        pendingCount={needsAction.length}
        resolvedCount={resolved.length}
      />

      {/* Needs Action / In Review Section */}
      {showPending && (
        <View style={styles.group}>
          {needsAction.length === 0 && subTab === 'pending' ? (
            <View style={styles.emptyCardMini}>
              <MaterialIcons name="fingerprint" size={32} color={colors.outline} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyText}>No background checks pending</Text>
            </View>
          ) : (
            needsAction.map((c) => <BGCard key={c.id} check={c} />)
          )}
        </View>
      )}

      {/* Resolved Checks Section */}
      {showResolved && (
        <View style={styles.group}>
          {resolved.length === 0 && subTab === 'resolved' ? (
            <View style={styles.emptyCardMini}>
              <MaterialIcons name="archive" size={32} color={colors.outline} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyText}>No resolved checks yet</Text>
            </View>
          ) : (
            resolved.map((c) => <BGCard key={c.id} check={c} />)
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
