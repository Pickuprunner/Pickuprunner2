import { getApiBaseUrl } from '@/lib/apiClient';
import { useAuthStore } from '@/store/useAuthStore';

export interface UploadPhotoPayload {
  file: {
    uri: string;
    name?: string;
    type?: string;
  };
  orderId: string;
  path?: string;
}

export interface DeliveryUploadPhotoResponse {
  url: string;
  publicUrl?: string;
  orderId: string;
  attached: boolean;
}

export const deliveryApi = {
  uploadPhoto: async (payload: UploadPhotoPayload): Promise<DeliveryUploadPhotoResponse> => {
    const baseUrl = getApiBaseUrl();
    const token = useAuthStore.getState().token;

    const rawFileName = payload.file.name || `delivery_${payload.orderId}_${Date.now()}.jpg`;
    const cleanFileName =
      rawFileName.includes('/') || rawFileName.includes(':')
        ? `delivery_${payload.orderId}_${Date.now()}.jpg`
        : rawFileName;
    const fileType = payload.file.type || 'image/jpeg';
    const storagePath = payload.path || `delivery-photos/${payload.orderId}/${cleanFileName}`;

    const formData = new FormData();
    formData.append('file', {
      uri: payload.file.uri,
      name: cleanFileName,
      type: fileType,
    } as any);
    formData.append('orderId', payload.orderId);
    formData.append('path', storagePath);

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response = await fetch(`${baseUrl}/delivery`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 404) {
      response = await fetch(`${baseUrl}/delivery-photo`, {
        method: 'POST',
        headers,
        body: formData,
      });
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Failed to upload photo');
    }

    return data as DeliveryUploadPhotoResponse;
  },

  getPhotoUrl: async (orderId: string): Promise<string | null> => {
    try {
      const baseUrl = getApiBaseUrl();
      const token = useAuthStore.getState().token;
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let response = await fetch(`${baseUrl}/delivery/${orderId}`, {
        method: 'GET',
        headers,
      });

      if (response.status === 404) {
        response = await fetch(`${baseUrl}/delivery-photo/${orderId}`, {
          method: 'GET',
          headers,
        });
      }

      if (!response.ok) return null;
      const data = await response.json();
      return data?.url || null;
    } catch {
      return null;
    }
  },

  verifyId: async (
    orderId: string,
    file: { uri: string; name?: string; type?: string }
  ): Promise<VerifyIdResponse> => {
    const baseUrl = getApiBaseUrl();
    const token = useAuthStore.getState().token;

    const formData = new FormData();
    const fileName = file.name || `id_${orderId}_${Date.now()}.jpg`;
    const fileType = file.type || 'image/jpeg';

    formData.append('customer_id_photo', {
      uri: file.uri,
      name: fileName,
      type: fileType,
    } as any);
    formData.append('orderId', orderId);

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}/delivery/verify-id`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      const err: any = new Error(
        data?.rejectionReason || data?.error || data?.message || 'ID Verification Failed'
      );
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data as VerifyIdResponse;
  },
};

export interface VerifyIdResponse {
  orderId: string;
  customerVerified: boolean;
  verdict: 'PASSED' | 'REJECTED' | 'FAILED';
  rejectionReason?: string;
  customerName?: string;
  customerAge?: number;
  isOverMinAge?: boolean;
  isExpired?: boolean;
  idType?: string;
  details?: {
    customerAge?: number;
    isOverMinAge?: boolean;
    isExpired?: boolean;
    idType?: string;
    tamperSignsDetected?: boolean;
    fraudNotes?: string;
  };
  error?: string;
  message?: string;
}

