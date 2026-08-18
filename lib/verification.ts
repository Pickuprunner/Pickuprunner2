import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blink } from './blink';
import { ORDER_SCOPE } from './config';

export interface DriverVerification {
  id: string;
  user_id: string;
  driver_name: string;
  driver_email?: string;
  license_url?: string;
  license_filename?: string;
  insurance_url?: string;
  insurance_filename?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  order_scope: string;
  submitted_at: string;
  reviewed_at?: string;
}

/** Fetch the current driver's own verification record */
export function useMyVerification(userId: string | undefined) {
  return useQuery({
    queryKey: ['driver_verification', userId],
    enabled: !!userId,
    queryFn: async () => {
      const rows = await blink.db.driverVerifications.list({
        where: { user_id: userId! },
        limit: 1,
      });
      return (rows[0] as DriverVerification) ?? null;
    },
    staleTime: 30_000,
  });
}

/** Fetch a driver's user profile (phone, avatar, join date) */
export function useDriverProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['driver_profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      try {
        const users = await blink.db.users.list({ where: { id: userId! }, limit: 1 });
        const user = users[0] as any;
        if (!user) return null;
        let metadata: any = {};
        try {
          metadata = typeof user.metadata === 'string' ? JSON.parse(user.metadata) : (user.metadata || {});
        } catch {}
        return {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          phone: user.phone,
          createdAt: user.created_at,
          role: user.role,
          stripeAccountId: metadata?.stripeAccountId ?? null,
        };
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });
}

/** Fetch ALL verifications for this scope (admin use) */
export function useAllVerifications() {
  return useQuery({
    queryKey: ['all_driver_verifications'],
    queryFn: async () => {
      try {
        const rows = await blink.db.driverVerifications.list({
          where: { order_scope: ORDER_SCOPE },
          orderBy: { submitted_at: 'desc' },
        });
        return rows as DriverVerification[];
      } catch (err) {
        console.warn('[useAllVerifications] query failed:', err);
        return [] as DriverVerification[];
      }
    },
    staleTime: 15_000,
    retry: false,
  });
}

/** Submit or update a verification */
export function useSubmitVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      userId: string;
      driverName: string;
      driverEmail?: string;
      licenseUrl: string;
      licenseFilename: string;
      insuranceUrl: string;
      insuranceFilename: string;
      existingId?: string;
    }) => {
      const id = data.existingId ?? `dv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      if (data.existingId) {
        return blink.db.driverVerifications.update(id, {
          license_url: data.licenseUrl,
          license_filename: data.licenseFilename,
          insurance_url: data.insuranceUrl,
          insurance_filename: data.insuranceFilename,
          status: 'pending',
          admin_note: undefined,
          submitted_at: new Date().toISOString(),
        }) as Promise<DriverVerification>;
      }
      return blink.db.driverVerifications.create({
        id,
        user_id: data.userId,
        driver_name: data.driverName,
        driver_email: data.driverEmail,
        license_url: data.licenseUrl,
        license_filename: data.licenseFilename,
        insurance_url: data.insuranceUrl,
        insurance_filename: data.insuranceFilename,
        status: 'pending',
        order_scope: ORDER_SCOPE,
      }) as Promise<DriverVerification>;
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: ['driver_verification', vars.userId] });
      qc.invalidateQueries({ queryKey: ['all_driver_verifications'] });
    },
  });
}

/** Admin: approve or reject a verification */
export function useReviewVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      adminNote,
    }: {
      id: string;
      status: 'approved' | 'rejected';
      adminNote?: string;
    }) => {
      return blink.db.driverVerifications.update(id, {
        status,
        admin_note: adminNote ?? null,
        reviewed_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all_driver_verifications'] });
      qc.invalidateQueries({ queryKey: ['driver_verification'] });
    },
  });
}
