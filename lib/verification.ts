import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const VERIF_STORAGE_KEY = '@pickuprunner_static_verifications_v1';

const INITIAL_VERIFICATIONS: DriverVerification[] = [
  {
    id: 'verif_sample_101',
    user_id: 'usr_static_driver_101',
    driver_name: 'Alex Driver',
    driver_email: 'driver@pickuprunner.com',
    license_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=500',
    license_filename: 'driver_license.jpg',
    insurance_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=500',
    insurance_filename: 'auto_insurance.pdf',
    status: 'approved',
    order_scope: ORDER_SCOPE,
    submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    reviewed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
  },
];

async function getStoredVerifications(): Promise<DriverVerification[]> {
  try {
    const raw = await AsyncStorage.getItem(VERIF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('[verification] AsyncStorage error:', err);
  }
  await AsyncStorage.setItem(VERIF_STORAGE_KEY, JSON.stringify(INITIAL_VERIFICATIONS));
  return INITIAL_VERIFICATIONS;
}

async function saveStoredVerifications(items: DriverVerification[]): Promise<void> {
  try {
    await AsyncStorage.setItem(VERIF_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('[verification] AsyncStorage save error:', err);
  }
}

export function useMyVerification(userId: string | undefined) {
  return useQuery({
    queryKey: ['driver_verification', userId],
    enabled: !!userId,
    queryFn: async () => {
      const items = await getStoredVerifications();
      return items.find((v) => v.user_id === userId) ?? null;
    },
    staleTime: 30_000,
  });
}

export function useDriverProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['driver_profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      return {
        id: userId || 'usr_static_driver_101',
        email: 'driver@pickuprunner.com',
        displayName: 'Alex Driver',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        phone: '(555) 987-6543',
        createdAt: new Date().toISOString(),
        role: 'driver',
        stripeAccountId: 'acct_static_12345',
      };
    },
    staleTime: 60_000,
  });
}

export function useAllVerifications() {
  return useQuery({
    queryKey: ['all_driver_verifications'],
    queryFn: async () => {
      return await getStoredVerifications();
    },
    staleTime: 15_000,
  });
}

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
      const items = await getStoredVerifications();
      const now = new Date().toISOString();
      const id = data.existingId ?? `verif-${Date.now()}`;

      const newVerif: DriverVerification = {
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
        submitted_at: now,
      };

      const existingIndex = items.findIndex((v) => v.id === id || v.user_id === data.userId);
      if (existingIndex >= 0) {
        items[existingIndex] = newVerif;
      } else {
        items.unshift(newVerif);
      }

      await saveStoredVerifications(items);
      return newVerif;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['driver_verification', vars.userId] });
      qc.invalidateQueries({ queryKey: ['all_driver_verifications'] });
    },
  });
}

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
      const items = await getStoredVerifications();
      const target = items.find((v) => v.id === id);
      if (!target) throw new Error('Verification record not found');

      target.status = status;
      target.admin_note = adminNote;
      target.reviewed_at = new Date().toISOString();

      await saveStoredVerifications(items);
      return target;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['driver_verification', updated.user_id] });
      qc.invalidateQueries({ queryKey: ['all_driver_verifications'] });
    },
  });
}
