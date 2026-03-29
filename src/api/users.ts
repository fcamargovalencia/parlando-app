import { api } from './client';
import { encryptFields } from '@/lib/crypto';
import type { ApiResponse, UserResponse, UpdateProfileRequest } from '@/types/api';

const ENCRYPTED_PROFILE_FIELDS: (keyof UpdateProfileRequest)[] = ['firstName', 'lastName'];

export const usersApi = {
  getMe: () => api.get<ApiResponse<UserResponse>>('/v1/users/me'),

  getById: (id: string) => api.get<ApiResponse<UserResponse>>(`/v1/users/${encodeURIComponent(id)}`),

  updateMe: async (data: UpdateProfileRequest) => {
    const encrypted = await encryptFields(data, ENCRYPTED_PROFILE_FIELDS);
    return api.put<ApiResponse<UserResponse>>('/v1/users/me', encrypted);
  },

  deactivate: () => api.delete<ApiResponse<null>>('/v1/users/me'),
};
