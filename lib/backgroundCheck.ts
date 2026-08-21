import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  consent_given: number;
  consent_at?: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  admin_note?: string;
  external_ref?: string;
  order_scope: string;
  submitted_at: string;
  reviewed_at?: string;
}

const BGC_STORAGE_KEY = '@pickuprunner_static_bgc_v1';

const INITIAL_BGC: BackgroundCheck[] = [
  {
    id: 'bgc_sample_101',
    user_id: 'usr_static_driver_101',
    driver_name: 'Alex Driver',
    driver_email: 'driver@pickuprunner.com',
    date_of_birth: '1992-05-15',
    ssn_last4: '4321',
    address: '742 Evergreen Terrace',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    consent_given: 1,
    consent_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    status: 'approved',
    order_scope: ORDER_SCOPE,
    submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    reviewed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
  },
];

async function getStoredBGC(): Promise<BackgroundCheck[]> {
  try {
    const raw = await AsyncStorage.getItem(BGC_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('[backgroundCheck] AsyncStorage error:', err);
  }
  await AsyncStorage.setItem(BGC_STORAGE_KEY, JSON.stringify(INITIAL_BGC));
  return INITIAL_BGC;
}

async function saveStoredBGC(items: BackgroundCheck[]): Promise<void> {
  try {
    await AsyncStorage.setItem(BGC_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('[backgroundCheck] AsyncStorage save error:', err);
  }
}

export function useMyBackgroundCheck(userId: string | undefined) {
  return useQuery({
    queryKey: ['background_check', userId],
    enabled: !!userId,
    queryFn: async () => {
      const items = await getStoredBGC();
      return items.find((b) => b.user_id === userId) ?? null;
    },
    staleTime: 30_000,
  });
}

export function useAllBackgroundChecks() {
  return useQuery({
    queryKey: ['all_background_checks'],
    queryFn: async () => {
      return await getStoredBGC();
    },
    staleTime: 15_000,
  });
}

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
      const items = await getStoredBGC();
      const now = new Date().toISOString();
      const id = data.existingId ?? `bgc-${Date.now()}`;

      const newBgc: BackgroundCheck = {
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
        submitted_at: now,
      };

      const existingIndex = items.findIndex((b) => b.id === id || b.user_id === data.userId);
      if (existingIndex >= 0) {
        items[existingIndex] = newBgc;
      } else {
        items.unshift(newBgc);
      }

      await saveStoredBGC(items);
      return newBgc;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['background_check', vars.userId] });
      qc.invalidateQueries({ queryKey: ['all_background_checks'] });
    },
  });
}

export function useReviewBackgroundCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      adminNote,
      externalRef,
    }: {
      id: string;
      status: 'approved' | 'rejected' | 'in_review';
      adminNote?: string;
      externalRef?: string;
    }) => {
      const items = await getStoredBGC();
      const target = items.find((b) => b.id === id);
      if (!target) throw new Error('Background check record not found');

      target.status = status;
      target.admin_note = adminNote;
      if (externalRef !== undefined) target.external_ref = externalRef;
      target.reviewed_at = new Date().toISOString();

      await saveStoredBGC(items);
      return target;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['background_check', updated.user_id] });
      qc.invalidateQueries({ queryKey: ['all_background_checks'] });
    },
  });
}
