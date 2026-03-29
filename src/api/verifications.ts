import { api } from './client';
import { encryptFields } from '@/lib/crypto';
import type {
  ApiResponse,
  IdentityVerificationResponse,
  SubmitVerificationRequest,
  DocumentType,
} from '@/types/api';

const ENCRYPTED_FIELDS: (keyof SubmitVerificationRequest)[] = ['documentNumber'];

export const verificationsApi = {
  submit: async (data: SubmitVerificationRequest) => {
    const encrypted = await encryptFields(data, ENCRYPTED_FIELDS);
    return api.post<ApiResponse<IdentityVerificationResponse>>('/v1/verifications', encrypted);
  },

  getMine: () =>
    api.get<ApiResponse<IdentityVerificationResponse[]>>('/v1/verifications/me'),

  getById: (id: string) =>
    api.get<ApiResponse<IdentityVerificationResponse>>(
      `/v1/verifications/${encodeURIComponent(id)}`,
    ),

  getMineByType: (type: DocumentType) =>
    api.get<ApiResponse<IdentityVerificationResponse>>(
      `/v1/verifications/me/${encodeURIComponent(type)}`,
    ),
};
