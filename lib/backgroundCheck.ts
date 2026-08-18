import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blink } from './blink';
import { ORDER_SCOPE } from './config';

export interface BackgroundCheck {
  id: string;
  user_id: string;
  driver_name: string;
  driver_email?: string;
  date_of_birth: string;
  ssn_last4: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  consent_given: number; // SQLite 0/1
  consent_at?: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  admin_note?: string;
  external_ref?: string;  // Checkr/Sterling case ID if you use one
  order_scope: string;
  submitted_at: string;
  reviewed_at?: string;
}

/** Current driver's own background check record */
export function useMyBackgroundCheck(userId: string | undefined) {
  return useQuery({
    queryKey: ['background_check', userId],
    enabled: !!userId,
    queryFn: async () => {
      const rows = await blink.db.backgroundChecks.list({
        where: { user_id: userId! },
        limit: 1,
      });
      return (rows[0] as BackgroundCheck) ?? null;
    },
    staleTime: 30_000,
  });
}

/** All background checks (admin) */
export function useAllBackgroundChecks() {
  return useQuery({
    queryKey: ['all_background_checks'],
    queryFn: async () => {
      try {
        const rows = await blink.db.backgroundChecks.list({
          where: { order_scope: ORDER_SCOPE },
          orderBy: { submitted_at: 'desc' },
        });
        return rows as BackgroundCheck[];
      } catch (err) {
        console.warn('[useAllBackgroundChecks] query failed:', err);
        return [] as BackgroundCheck[];
      }
    },
    staleTime: 15_000,
    retry: false,
  });
}

/** Submit or resubmit a background check authorization */
export function useSubmitBackgroundCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      userId: string;
      driverName: string;
      driverEmail?: string;
      dateOfBirth: string;
      ssnLast4: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      existingId?: string;
    }) => {
      const now = new Date().toISOString();
      const id = data.existingId ?? `bgc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      if (data.existingId) {
        return blink.db.backgroundChecks.update(id, {
          date_of_birth: data.dateOfBirth,
          ssn_last4: data.ssnLast4,
          address: data.address,
          city: data.city,
          state: data.state,
          zip: data.zip,
          consent_given: 1,
          consent_at: now,
          status: 'pending',
          admin_note: null,
          submitted_at: now,
        }) as Promise<BackgroundCheck>;
      }

      return blink.db.backgroundChecks.create({
        id,
        user_id: data.userId,
        driver_name: data.driverName,
        driver_email: data.driverEmail,
        date_of_birth: data.dateOfBirth,
        ssn_last4: data.ssnLast4,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        consent_given: 1,
        consent_at: now,
        status: 'pending',
        order_scope: ORDER_SCOPE,
      }) as Promise<BackgroundCheck>;
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['background_check', vars.userId] });
      qc.invalidateQueries({ queryKey: ['all_background_checks'] });
    },
  });
}

/** Admin: update status + note + optional external ref */
export function useReviewBackgroundCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      status: 'in_review' | 'approved' | 'rejected';
      adminNote?: string;
      externalRef?: string;
    }) => {
      return blink.db.backgroundChecks.update(data.id, {
        status: data.status,
        admin_note: data.adminNote ?? null,
        external_ref: data.externalRef ?? null,
        reviewed_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all_background_checks'] });
      qc.invalidateQueries({ queryKey: ['background_check'] });
    },
  });
}
