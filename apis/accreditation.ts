import { apiClient, getApiBaseUrl } from '@/lib/apiClient';
import { useAuthStore } from '@/store/useAuthStore';

export type AccreditationStatus =
  | 'not_started'
  | 'in_progress'
  | 'under_review'
  | 'approved'
  | 'rejected';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type BackgroundStatus = 'not_started' | 'in_review' | 'approved' | 'rejected';
export type DocumentType = 'license_front' | 'license_back' | 'insurance_card';

export type EligibilityCode =
  | 'not_started'
  | 'in_progress'
  | 'under_review'
  | 'rejected'
  | 'license_not_approved'
  | 'license_expired'
  | 'insurance_not_approved'
  | 'insurance_expired'
  | 'background_not_approved'
  | null;

export interface DriverProfileData {
  id?: string;
  userId?: string;
  isSubmitted?: boolean;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number | string;
  vehicleColor?: string;
  vehiclePlate?: string;
  vehicleVin?: string;

  streetAddress?: string;
  aptSuite?: string;
  city?: string;
  state?: string;
  postalCode?: string;

  legalName?: string;
  dateOfBirth?: string;
  licenseState?: string;
  licenseNumber?: string;
  licenseExpirationDate?: string;
  licenseStatus?: ReviewStatus;

  insuranceCompany?: string;
  insuranceNaicNumber?: string;
  insurancePolicyNumber?: string;
  insuranceEffectiveDate?: string;
  insuranceExpirationDate?: string;
  insuranceStatus?: ReviewStatus;

  backgroundConsentAt?: string;
  backgroundDisclosureVersion?: string;
  backgroundStatus?: BackgroundStatus;

  accreditationStatus?: AccreditationStatus;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  documents?: {
    licenseFront?: boolean;
    licenseBack?: boolean;
    insuranceCard?: boolean;
  };
}

export interface AccreditationResponseData {
  profile: DriverProfileData;
  steps: {
    license: ReviewStatus;
    insurance: ReviewStatus;
    backgroundCheck: BackgroundStatus;
  };
  eligibility: {
    eligible: boolean;
    code: EligibilityCode;
    reason: string | null;
  };
  missing: string[];
}

export interface AccreditationApiResponse {
  success: boolean;
  data: AccreditationResponseData;
  message?: string;
}

export interface SaveStepResponse {
  success: boolean;
  message?: string;
  data: {
    profile: DriverProfileData;
    missing: string[];
  };
}

export interface UploadDocResponse {
  success: boolean;
  message?: string;
  data: {
    type: DocumentType;
    uploaded: boolean;
    sizeBytes: number;
  };
}

export interface ViewDocResponse {
  success: boolean;
  data: {
    type: string;
    url: string;
    expiresInSeconds: number;
  };
}

export interface ConsentResponse {
  success: boolean;
  message?: string;
  data: {
    backgroundStatus: BackgroundStatus;
    consentAt: string;
    disclosureVersion: string;
  };
}

export const accreditationApi = {
  getAccreditation: async (): Promise<AccreditationApiResponse> => {
    return apiClient.get<AccreditationApiResponse>('/driver/accreditation');
  },

  saveStep: async (
    step: 'vehicle' | 'license' | 'insurance',
    payload: Record<string, any>
  ): Promise<SaveStepResponse> => {
    return apiClient.patch<SaveStepResponse>(`/driver/accreditation/${step}`, payload);
  },

  uploadDocument: async (
    type: DocumentType,
    file: { uri: string; name?: string; type?: string }
  ): Promise<UploadDocResponse> => {
    const baseUrl = getApiBaseUrl();
    const token = useAuthStore.getState().token;

    const formData = new FormData();
    const fileName = file.name || `${type}_${Date.now()}.jpg`;
    const mimeType = file.type || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    formData.append('file', {
      uri: file.uri,
      name: fileName,
      type: mimeType,
    } as any);
    formData.append('type', type);

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}/driver/accreditation/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || data?.message || `Failed to upload ${type}`);
    }

    return data as UploadDocResponse;
  },

  getDocumentUrl: async (type: DocumentType): Promise<ViewDocResponse> => {
    return apiClient.get<ViewDocResponse>(`/driver/accreditation/documents/${type}`);
  },

  recordConsent: async (payload: { authorized: boolean; legalName?: string }): Promise<ConsentResponse> => {
    return apiClient.post<ConsentResponse>('/driver/accreditation/consent', payload);
  },

  submit: async (): Promise<AccreditationApiResponse> => {
    return apiClient.post<AccreditationApiResponse>('/driver/accreditation/submit', {});
  },
};
