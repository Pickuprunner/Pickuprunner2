import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/lib/apiClient';

export type DocStatus = 'not_submitted' | 'pending' | 'in_review' | 'approved' | 'rejected';

export interface DriverVerification {
  licenseStatus: DocStatus;
  licenseFrontUrl?: string | null;
  licenseBackUrl?: string | null;
  insuranceStatus: DocStatus;
  insuranceUrl?: string | null;
  reviewedAt?: string;
  notes?: string;
}

export interface DriverBackgroundCheck {
  status: DocStatus;
  consentGiven: boolean;
  ssnLast4?: string;
  dob?: string;
  submittedAt?: string;
  completedAt?: string;
}

export interface DriverEarnings {
  totalEarningsCents: number;
  totalTipsCents: number;
  completedDeliveries: number;
  pendingPayoutCents: number;
}

interface DriverStoreState {
  verification: DriverVerification;
  backgroundCheck: DriverBackgroundCheck;
  earnings: DriverEarnings;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  toggleOnline: () => void;
  submitLicense: (frontUrl: string, backUrl: string) => void;
  submitInsurance: (insuranceUrl: string) => void;
  submitBackgroundCheck: (consent: boolean, ssnLast4: string, dob?: string) => void;
  setDocStatus: (docType: 'license' | 'insurance' | 'bgCheck', status: DocStatus) => void;
  addDeliveryEarnings: (earningsCents: number, tipCents: number) => void;
  resetDriverStore: () => void;
}

const DEFAULT_VERIFICATION: DriverVerification = {
  licenseStatus: 'approved',
  licenseFrontUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500',
  insuranceStatus: 'approved',
  insuranceUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500',
};

const DEFAULT_BG_CHECK: DriverBackgroundCheck = {
  status: 'approved',
  consentGiven: true,
  ssnLast4: '4321',
  completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
};

const DEFAULT_EARNINGS: DriverEarnings = {
  totalEarningsCents: 14850,
  totalTipsCents: 4750,
  completedDeliveries: 12,
  pendingPayoutCents: 3250,
};

export const useDriverStore = create<DriverStoreState>()(
  persist(
    (set) => ({
      verification: DEFAULT_VERIFICATION,
      backgroundCheck: DEFAULT_BG_CHECK,
      earnings: DEFAULT_EARNINGS,
      isOnline: true,

      setIsOnline: (online: boolean) => {
        set({ isOnline: online });
        apiClient.patch('/users/me', { isOnline: online }).catch(() => {});
      },
      toggleOnline: () => {
        set((state) => {
          const nextVal = !state.isOnline;
          apiClient.patch('/users/me', { isOnline: nextVal }).catch(() => {});
          return { isOnline: nextVal };
        });
      },

      submitLicense: (licenseFrontUrl, licenseBackUrl) =>
        set((state) => ({
          verification: {
            ...state.verification,
            licenseFrontUrl,
            licenseBackUrl,
            licenseStatus: 'pending',
          },
        })),

      submitInsurance: (insuranceUrl) =>
        set((state) => ({
          verification: {
            ...state.verification,
            insuranceUrl,
            insuranceStatus: 'pending',
          },
        })),

      submitBackgroundCheck: (consentGiven, ssnLast4, dob) =>
        set((state) => ({
          backgroundCheck: {
            status: 'in_review',
            consentGiven,
            ssnLast4,
            dob,
            submittedAt: new Date().toISOString(),
          },
        })),

      setDocStatus: (docType, status) =>
        set((state) => {
          if (docType === 'license') {
            return { verification: { ...state.verification, licenseStatus: status } };
          }
          if (docType === 'insurance') {
            return { verification: { ...state.verification, insuranceStatus: status } };
          }
          return { backgroundCheck: { ...state.backgroundCheck, status } };
        }),

      addDeliveryEarnings: (earningsCents, tipCents) =>
        set((state) => ({
          earnings: {
            totalEarningsCents: state.earnings.totalEarningsCents + earningsCents,
            totalTipsCents: state.earnings.totalTipsCents + tipCents,
            completedDeliveries: state.earnings.completedDeliveries + 1,
            pendingPayoutCents: state.earnings.pendingPayoutCents + earningsCents + tipCents,
          },
        })),

      resetDriverStore: () =>
        set({
          verification: DEFAULT_VERIFICATION,
          backgroundCheck: DEFAULT_BG_CHECK,
          earnings: DEFAULT_EARNINGS,
        }),
    }),
    {
      name: 'driver-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
