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

export interface UploadPhotoResponse {
  url: string;
  publicUrl?: string;
  orderId: string;
  attached: boolean;
}

export const deliveryApi = {
  uploadPhoto: async (payload: UploadPhotoPayload): Promise<UploadPhotoResponse> => {
    const baseUrl = getApiBaseUrl();
    const token = useAuthStore.getState().token;

    const formData = new FormData();
    const fileName = payload.file.name || `delivery_${payload.orderId}_${Date.now()}.jpg`;
    const fileType = payload.file.type || 'image/jpeg';
    const storagePath = payload.path || `delivery-photos/${payload.orderId}/${fileName}`;

    formData.append('file', {
      uri: payload.file.uri,
      name: fileName,
      type: fileType,
    } as any);
    formData.append('orderId', payload.orderId);
    formData.append('path', storagePath);

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}/delivery-photo`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Failed to upload photo');
    }

    return data as UploadPhotoResponse;
  },
};
