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

export interface DriverLocationReportResponse {
  success: boolean;
  data: {
    recorded: boolean;
    available: boolean;
    staleAfterSeconds: number;
  };
}

export interface DriverLocationGetResponse {
  success: boolean;
  data: {
    lat: number;
    lng: number;
    ageSeconds: number;
    fresh: boolean;
    available: boolean;
    reachable: boolean;
  };
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

export const driverLocationApi = {
  reportLocation: async (coords: { lat: number; lng: number }): Promise<DriverLocationReportResponse['data']> => {
    const res = await apiClient.post<DriverLocationReportResponse>('/driver/location', coords);
    return res.data;
  },

  getLocation: async (): Promise<DriverLocationGetResponse['data']> => {
    const res = await apiClient.get<DriverLocationGetResponse>('/driver/location');
    return res.data;
  },
};
