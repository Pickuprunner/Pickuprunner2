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
  rejection_reason?: string;
  order_scope: string;
  submitted_at: string;
  reviewed_at?: string;
}

const VERIF_STORAGE_KEY = '@pickuprunner_static_verifications_v2';

const INITIAL_VERIFICATIONS: DriverVerification[] = [
  {
    id: 'v1',
    user_id: 'u1',
    driver_name: 'Alex Driver',
    driver_email: 'driver@pickuprunner.com',
    license_url: 'https://images.unsplash.com/photo-1519074069444-1ba4fff66d8c?w=500&q=70',
    license_filename: "driver_license.jpg",
    insurance_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=500&q=70',
    insurance_filename: 'insurance_card.pdf',
    status: 'approved',
    order_scope: ORDER_SCOPE,
    submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    reviewed_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
  {
    id: 'v2',
    user_id: 'u2',
    driver_name: 'Marcus Reyes',
    driver_email: 'marcus.r@mailbox.io',
    license_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994ba43?w=500&q=70',
    license_filename: "driver_license.jpg",
    insurance_url: 'https://images.unsplash.com/photo-1561655256-7295ab3b059f?w=500&q=70',
    insurance_filename: 'insurance_card.pdf',
    status: 'pending',
    order_scope: ORDER_SCOPE,
    submitted_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'v3',
    user_id: 'u3',
    driver_name: 'Priya Sharma',
    driver_email: 'priya.sharma@gmail.com',
    license_url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&q=70',
    license_filename: "driver_license.jpg",
    insurance_url: 'https://images.unsplash.com/photo-1554224154-22dec5ec8810?w=500&q=70',
    insurance_filename: 'insurance_card.pdf',
    status: 'rejected',
    admin_note: 'Insurance document is expired. Please upload a current insurance card showing valid coverage dates.',
    order_scope: ORDER_SCOPE,
    submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    reviewed_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'v4',
    user_id: 'u4',
    driver_name: 'Diego Martinez',
    driver_email: 'diego.m@protonmail.com',
    license_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=70',
    license_filename: "driver_license.jpg",
    insurance_url: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=500&q=70',
    insurance_filename: 'insurance_card.pdf',
    status: 'pending',
    order_scope: ORDER_SCOPE,
    submitted_at: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
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

const DRIVER_PROFILES: Record<string, { phone: string; role: string; registeredAt: string; stripeAccountId: string }> = {
  u1: {
    phone: '(555) 218-4471',
    role: 'driver',
    registeredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    stripeAccountId: 'acct_1Q8zXyPRowNr2K',
  },
  u2: {
    phone: '(555) 902-1133',
    role: 'driver',
    registeredAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    stripeAccountId: 'acct_1Q8zXyPR92Md0K',
  },
  u3: {
    phone: '(555) 667-2298',
    role: 'driver',
    registeredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    stripeAccountId: 'acct_1Q8zXyPR73Bn2L',
  },
  u4: {
    phone: '(555) 445-7781',
    role: 'driver',
    registeredAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    stripeAccountId: 'acct_1Q8zXyPR55Xc9P',
  },
};

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
      const p = (userId && DRIVER_PROFILES[userId]) || {
        phone: '(555) 218-4471',
        role: 'driver',
        registeredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
        stripeAccountId: 'acct_1Q8zXyPRowNr2K',
      };
      return {
        id: userId || 'u1',
        email: 'driver@pickuprunner.com',
        displayName: 'Driver User',
        phone: p.phone,
        createdAt: p.registeredAt,
        role: p.role,
        stripeAccountId: p.stripeAccountId,
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
      status: 'pending' | 'approved' | 'rejected';
      adminNote?: string;
    }) => {
      const items = await getStoredVerifications();
      const target = items.find((v) => v.id === id);
      if (!target) throw new Error('Verification record not found');

      target.status = status;
      target.admin_note = adminNote !== undefined ? adminNote : (status === 'pending' ? '' : target.admin_note);
      target.reviewed_at = status === 'pending' ? undefined : new Date().toISOString();

      await saveStoredVerifications(items);
      return target;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['driver_verification', updated.user_id] });
      qc.invalidateQueries({ queryKey: ['all_driver_verifications'] });
    },
  });
}
