import { apiClient } from '@/lib/apiClient';
import { User } from '@/store/useAuthStore';

export interface UpdateProfilePayload {
  displayName?: string;
  phone?: string;
}

export interface UserResponse {
  success?: boolean;
  message?: string;
  data: {
    user: User;
  };
}

export interface UsersListResponse {
  success?: boolean;
  data: {
    users: User[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface UploadPhotoResponse {
  success?: boolean;
  data: {
    photoUrl: string;
    user: User;
  };
}

export interface DeletePhotoResponse {
  success?: boolean;
  message?: string;
  data?: {
    photoUrl: null;
    user: User;
  };
}

export type PhotoInput =
  | File
  | Blob
  | {
      uri: string;
      name?: string;
      type?: string;
    };

export const usersApi = {
  getMe: async (): Promise<User> => {
    const res = await apiClient.get<UserResponse>('/users/me');
    return res.data.user;
  },

  updateMe: async (payload: UpdateProfilePayload): Promise<User> => {
    const res = await apiClient.patch<UserResponse>('/users/me', payload);
    return res.data.user;
  },

  uploadPhoto: async (fileInput: PhotoInput): Promise<{ photoUrl: string; user: User }> => {
    const formData = new FormData();
    if (typeof File !== 'undefined' && fileInput instanceof File) {
      formData.append('file', fileInput);
    } else if (typeof Blob !== 'undefined' && fileInput instanceof Blob) {
      formData.append('file', fileInput, 'photo.jpg');
    } else if (typeof fileInput === 'object' && 'uri' in fileInput) {
      const fileName = fileInput.name || `avatar_${Date.now()}.jpg`;
      const fileType = fileInput.type || 'image/jpeg';
      formData.append('file', {
        uri: fileInput.uri,
        name: fileName,
        type: fileType,
      } as any);
    } else {
      throw new Error('Invalid file input');
    }

    const res = await apiClient.post<UploadPhotoResponse>('/users/me/photo', formData);
    return res.data;
  },

  deletePhoto: async (): Promise<DeletePhotoResponse> => {
    return apiClient.del<DeletePhotoResponse>('/users/me/photo');
  },

  list: (params?: { role?: string; status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.role) query.append('role', params.role);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return apiClient.get<UsersListResponse>(`/users${qs ? `?${qs}` : ''}`);
  },

  getById: async (id: string): Promise<User> => {
    const res = await apiClient.get<UserResponse>(`/users/${id}`);
    return res.data.user;
  },

  updateRole: async (id: string, role: 'customer' | 'driver' | 'admin'): Promise<User> => {
    const res = await apiClient.patch<UserResponse>(`/users/${id}/role`, { role });
    return res.data.user;
  },

  updateStatus: async (id: string, status: 'active' | 'suspended' | 'pending'): Promise<User> => {
    const res = await apiClient.patch<UserResponse>(`/users/${id}/status`, { status });
    return res.data.user;
  },

  deleteMe: async (): Promise<{ success: boolean; message: string }> => {
    return apiClient.del<{ success: boolean; message: string }>('/users/me');
  },

  deleteUser: async (id: string, force = false): Promise<{ success: boolean; message: string }> => {
    return apiClient.del<{ success: boolean; message: string }>(`/users/${id}`, {
      body: force ? JSON.stringify({ force: true }) : undefined,
    });
  },
};

