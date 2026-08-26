import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  accreditationApi,
  DocumentType,
} from '@/apis/accreditation';
import { useAuthStore } from '@/store/useAuthStore';

export const ACCREDITATION_QUERY_KEY = ['driver-accreditation'];

export function useDriverAccreditation() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ACCREDITATION_QUERY_KEY,
    queryFn: async () => {
      if (!token) return null;
      const res = await accreditationApi.getAccreditation();
      return res.data;
    },
    enabled: !!token,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useSaveAccreditationStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      step,
      payload,
    }: {
      step: 'vehicle' | 'license' | 'insurance';
      payload: Record<string, any>;
    }) => {
      const res = await accreditationApi.saveStep(step, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCREDITATION_QUERY_KEY });
    },
  });
}

export function useUploadAccreditationDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      type,
      file,
    }: {
      type: DocumentType;
      file: { uri: string; name?: string; type?: string };
    }) => {
      const res = await accreditationApi.uploadDocument(type, file);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCREDITATION_QUERY_KEY });
    },
  });
}

export function useRecordAccreditationConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { authorized: boolean; legalName?: string }) => {
      const res = await accreditationApi.recordConsent(payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCREDITATION_QUERY_KEY });
    },
  });
}

export function useSubmitAccreditation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await accreditationApi.submit();
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCREDITATION_QUERY_KEY });
    },
  });
}

export function useDevPassAccreditation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mockPayload: {
      vehicle: Record<string, any>;
      license: Record<string, any>;
      insurance: Record<string, any>;
      legalName: string;
    }) => {
      try {
        await accreditationApi.saveStep('vehicle', mockPayload.vehicle);
        await accreditationApi.saveStep('license', mockPayload.license);
        await accreditationApi.recordConsent({
          authorized: true,
          legalName: mockPayload.legalName,
        });
        await accreditationApi.saveStep('insurance', mockPayload.insurance);
        const submitRes = await accreditationApi.submit().catch(() => null);
        return submitRes?.data || null;
      } catch (err) {
        console.warn('[dev-pass] backend pass failed, local fallback:', err);
        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCREDITATION_QUERY_KEY });
    },
  });
}
