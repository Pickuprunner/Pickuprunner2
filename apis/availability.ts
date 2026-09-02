import { apiClient } from '@/lib/apiClient';

export interface DriverAvailabilityResponse {
  success: boolean;
  data: {
    available: boolean;
  };
}

export interface SetDriverAvailabilityPayload {
  available: boolean;
}

export const driverAvailabilityApi = {
  getAvailability: async (): Promise<boolean> => {
    const res = await apiClient.get<DriverAvailabilityResponse>('/driver/availability');
    return Boolean(res?.data?.available);
  },

  setAvailability: async (available: boolean): Promise<boolean> => {
    const res = await apiClient.post<DriverAvailabilityResponse>('/driver/availability', {
      available,
    });
    return Boolean(res?.data?.available);
  },
};
