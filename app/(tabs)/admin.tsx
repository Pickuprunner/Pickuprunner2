import React, { useState } from 'react';
import { ScrollView, RefreshControl, View, Text, StyleSheet } from 'react-native';
import {
  SafeArea,
  YStack,
  XStack,
  SizableText,
  Card,
  Badge,
  AppHeader,
  BlinkToggleGroup,
  Shield,
  ShieldCheck,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
} from '@blinkdotnew/mobile-ui';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_CONFIG } from '@/lib/config';
import { useAllVerifications } from '@/lib/verification';
import { useAllBackgroundChecks } from '@/lib/backgroundCheck';
import AdminVerificationPanel from '@/components/AdminVerificationPanel';
import AdminBGCheckPanel from '@/components/AdminBGCheckPanel';
import AdminDocReviewPanel from '@/components/admin/AdminDocReviewPanel';
import AdminBGReviewPanel from '@/components/admin/AdminBGReviewPanel';

type Tab = 'overview' | 'docs' | 'bgcheck';

const BLUE = APP_CONFIG.PRIMARY_COLOR;
const YELLOW = APP_CONFIG.SECONDARY_COLOR;

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Card
      flex={1}
      padding="$3"
      borderRadius="$4"
      backgroundColor="$color2"
      borderWidth={1}
      borderColor="$color4"
    >
      <YStack gap="$1" alignItems="center">
        {icon}
        <SizableText size="$6" fontWeight="900" color="$color12">{value}</SizableText>
        <SizableText size="$1" color="$color9" textAlign="center" fontWeight="600">{label}</SizableText>
      </YStack>
    </Card>
  );
}

export default function AdminScreen() {
  const { data: verifications = [], isLoading: loadingDocs, refetch: refetchDocs } = useAllVerifications();
  const { data: bgChecks = [], isLoading: loadingBG, refetch: refetchBG } = useAllBackgroundChecks();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const isLoading = loadingDocs || loadingBG;
  const refetch = () => { refetchDocs(); refetchBG(); };

  // Stats
  const pendingDocs = verifications.filter((v) => v.status === 'pending').length;
  const approvedDocs = verifications.filter((v) => v.status === 'approved').length;
  const rejectedDocs = verifications.filter((v) => v.status === 'rejected').length;

  const pendingBG = bgChecks.filter((c) => c.status === 'pending' || c.status === 'in_review').length;
  const approvedBG = bgChecks.filter((c) => c.status === 'approved').length;
  const rejectedBG = bgChecks.filter((c) => c.status === 'rejected').length;

  const totalPending = pendingDocs + pendingBG;

  // Overview: unique drivers across both tables
  const driverMap = new Map<string, {
    name: string;
    email?: string;
    docStatus?: string;
    bgStatus?: string;
  }>();
  verifications.forEach((v) => {
    driverMap.set(v.user_id, { name: v.driver_name, email: v.driver_email, docStatus: v.status });
  });
  bgChecks.forEach((c) => {
    const existing = driverMap.get(c.user_id);
    if (existing) {
      existing.bgStatus = c.status;
    } else {
      driverMap.set(c.user_id, { name: c.driver_name, email: c.driver_email, bgStatus: c.status });
    }
  });
  const drivers = Array.from(driverMap.entries()).map(([uid, d]) => ({ uid, ...d }));

  return (
    <SafeArea>
      <LinearGradient
        colors={[APP_CONFIG.GRADIENT_START, APP_CONFIG.GRADIENT_MID, APP_CONFIG.GRADIENT_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <SizableText size="$7" fontWeight="900" color="white" letterSpacing={-0.5}>
              Admin Panel
            </SizableText>
            <SizableText size="$2" color="rgba(255,255,255,0.65)" marginTop={2}>
              Driver review &amp; approvals
            </SizableText>
          </YStack>
          {totalPending > 0 && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>{totalPending} PENDING</Text>
            </View>
          )}
        </XStack>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={BLUE} />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <YStack padding="$4" gap="$4">

          <BlinkToggleGroup
            options={[
              { label: 'Overview', value: 'overview' },
              { label: `Docs${pendingDocs > 0 ? ` (${pendingDocs})` : ''}`, value: 'docs' },
              { label: `BG Check${pendingBG > 0 ? ` (${pendingBG})` : ''}`, value: 'bgcheck' },
            ]}
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as Tab)}
          />

          {activeTab === 'overview' && (
            <YStack gap="$4">

              <YStack gap="$2">
                <SizableText size="$2" fontWeight="700" color="$color10" letterSpacing={0.5}>
                  DOCUMENT VERIFICATIONS
                </SizableText>
                <XStack gap="$2">
                  <StatCard label="PENDING" value={pendingDocs} color={YELLOW}
                    icon={<Clock size={18} color="$amber9" />} />
                  <StatCard label="APPROVED" value={approvedDocs} color="#16a34a"
                    icon={<CheckCircle size={18} color="$green9" />} />
                  <StatCard label="REJECTED" value={rejectedDocs} color="#dc2626"
                    icon={<XCircle size={18} color="$red9" />} />
                </XStack>
              </YStack>

              <YStack gap="$2">
                <SizableText size="$2" fontWeight="700" color="$color10" letterSpacing={0.5}>
                  BACKGROUND CHECKS
                </SizableText>
                <XStack gap="$2">
                  <StatCard label="PENDING" value={pendingBG} color={YELLOW}
                    icon={<Clock size={18} color="$amber9" />} />
                  <StatCard label="APPROVED" value={approvedBG} color="#16a34a"
                    icon={<ShieldCheck size={18} color="$green9" />} />
                  <StatCard label="REJECTED" value={rejectedBG} color="#dc2626"
                    icon={<XCircle size={18} color="$red9" />} />
                </XStack>
              </YStack>

              <YStack gap="$2">
                <SizableText size="$2" fontWeight="700" color="$color10" letterSpacing={0.5}>
                  ALL DRIVERS ({drivers.length})
                </SizableText>

                {drivers.length === 0 && (
                  <Card padding="$5" borderRadius="$4" backgroundColor="$color2" borderWidth={1} borderColor="$color4">
                    <YStack alignItems="center" gap="$2">
                      <Users size={36} color="$color8" />
                      <SizableText size="$3" color="$color10" textAlign="center">
                        No drivers have submitted documents yet.
                      </SizableText>
                    </YStack>
                  </Card>
                )}

                {drivers.map((d) => {
                  const docOk = d.docStatus === 'approved';
                  const bgOk = d.bgStatus === 'approved';
                  const fullyCleared = docOk && bgOk;
                  const anyRejected = d.docStatus === 'rejected' || d.bgStatus === 'rejected';
                  const statusColor = fullyCleared ? '#16a34a' : anyRejected ? '#dc2626' : '#d97706';
                  const statusLabel = fullyCleared ? 'Cleared' : anyRejected ? 'Action Needed' : 'Pending';
                  const statusVariant = fullyCleared ? 'success' : anyRejected ? 'error' : 'warning';

                  return (
                    <Card
                      key={d.uid}
                      padding="$3"
                      borderRadius="$4"
                      backgroundColor="$color2"
                      borderWidth={1}
                      borderColor={
                        fullyCleared ? 'rgba(22,163,74,0.25)' :
                          anyRejected ? 'rgba(220,38,38,0.25)' :
                            '$color4'
                      }
                    >
                      <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$2">
                        <YStack flex={1} marginRight="$2">
                          <SizableText size="$4" fontWeight="700" color="$color12">{d.name}</SizableText>
                          {d.email ? (
                            <SizableText size="$2" color="$color9">{d.email}</SizableText>
                          ) : null}
                        </YStack>
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                      </XStack>

                      <XStack gap="$3" flexWrap="wrap">
                        <XStack
                          gap="$1" alignItems="center"
                          paddingHorizontal={8} paddingVertical={3}
                          borderRadius={6}
                          backgroundColor={
                            d.docStatus === 'approved' ? 'rgba(22,163,74,0.1)' :
                              d.docStatus === 'rejected' ? 'rgba(220,38,38,0.1)' :
                                d.docStatus ? 'rgba(217,119,6,0.1)' :
                                  'rgba(120,120,130,0.08)'
                          }
                          borderWidth={1}
                          borderColor={
                            d.docStatus === 'approved' ? 'rgba(22,163,74,0.3)' :
                              d.docStatus === 'rejected' ? 'rgba(220,38,38,0.3)' :
                                d.docStatus ? 'rgba(217,119,6,0.3)' :
                                  'rgba(120,120,130,0.2)'
                          }
                        >
                          <FileText size={11}
                            color={
                              d.docStatus === 'approved' ? '$green9' :
                                d.docStatus === 'rejected' ? '$red9' :
                                  d.docStatus ? '$amber9' : '$color8'
                            }
                          />
                          <SizableText size="$1" fontWeight="700"
                            color={
                              d.docStatus === 'approved' ? '$green9' :
                                d.docStatus === 'rejected' ? '$red9' :
                                  d.docStatus ? '$amber9' : '$color8'
                            }
                          >
                            {d.docStatus
                              ? `Docs: ${d.docStatus.replace('_', ' ')}`
                              : 'Docs: not submitted'}
                          </SizableText>
                        </XStack>

                        <XStack
                          gap="$1" alignItems="center"
                          paddingHorizontal={8} paddingVertical={3}
                          borderRadius={6}
                          backgroundColor={
                            d.bgStatus === 'approved' ? 'rgba(22,163,74,0.1)' :
                              d.bgStatus === 'rejected' ? 'rgba(220,38,38,0.1)' :
                                d.bgStatus ? 'rgba(217,119,6,0.1)' :
                                  'rgba(120,120,130,0.08)'
                          }
                          borderWidth={1}
                          borderColor={
                            d.bgStatus === 'approved' ? 'rgba(22,163,74,0.3)' :
                              d.bgStatus === 'rejected' ? 'rgba(220,38,38,0.3)' :
                                d.bgStatus ? 'rgba(217,119,6,0.3)' :
                                  'rgba(120,120,130,0.2)'
                          }
                        >
                          <Shield size={11}
                            color={
                              d.bgStatus === 'approved' ? '$green9' :
                                d.bgStatus === 'rejected' ? '$red9' :
                                  d.bgStatus ? '$amber9' : '$color8'
                            }
                          />
                          <SizableText size="$1" fontWeight="700"
                            color={
                              d.bgStatus === 'approved' ? '$green9' :
                                d.bgStatus === 'rejected' ? '$red9' :
                                  d.bgStatus ? '$amber9' : '$color8'
                            }
                          >
                            {d.bgStatus
                              ? `BG: ${d.bgStatus.replace('_', ' ')}`
                              : 'BG: not submitted'}
                          </SizableText>
                        </XStack>
                      </XStack>
                    </Card>
                  );
                })}
              </YStack>
            </YStack>
          )}

          {activeTab === 'docs' && (
            <YStack gap="$3">
              {verifications.length === 0 ? (
                <Card padding="$5" borderRadius="$4" backgroundColor="$color2" borderWidth={1} borderColor="$color4">
                  <YStack alignItems="center" gap="$2">
                    <FileText size={36} color="$color8" />
                    <SizableText size="$3" color="$color10" textAlign="center">
                      No document submissions yet.
                    </SizableText>
                  </YStack>
                </Card>
              ) : (
                <AdminDocReviewPanel verifications={verifications} />
              )}
            </YStack>
          )}

          {activeTab === 'bgcheck' && (
            <YStack gap="$3">
              {bgChecks.length === 0 ? (
                <Card padding="$5" borderRadius="$4" backgroundColor="$color2" borderWidth={1} borderColor="$color4">
                  <YStack alignItems="center" gap="$2">
                    <Shield size={36} color="$color8" />
                    <SizableText size="$3" color="$color10" textAlign="center">
                      No background check submissions yet.
                    </SizableText>
                  </YStack>
                </Card>
              ) : (
                <AdminBGReviewPanel bgChecks={bgChecks} />
              )}
            </YStack>
          )}

        </YStack>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  alertBadge: {
    backgroundColor: 'rgba(245,196,0,0.15)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(245,196,0,0.5)',
  },
  alertBadgeText: {
    color: '#F5C400',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});