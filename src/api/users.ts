import { api } from './client';
import { encryptFields, decryptFields } from '@/lib/crypto';
import type { ApiResponse, UserResponse, UpdateProfileRequest } from '@/types/api';

const ENCRYPTED_PROFILE_FIELDS: (keyof UpdateProfileRequest)[] = ['firstName', 'lastName'];
const ENCRYPTED_USER_FIELDS: (keyof UserResponse)[] = ['firstName', 'lastName', 'email', 'phone'];

async function decryptUser<T extends { data: UserResponse | null }>(
  response: { data: T },
): Promise<{ data: T }> {
  if (response.data.data) {
    response.data.data = await decryptFields(response.data.data, ENCRYPTED_USER_FIELDS);
  }
  return response;
}

export const usersApi = {
  getMe: () =>
    api.get<ApiResponse<UserResponse>>('/v1/users/me').then(decryptUser),

  getById: (id: string) =>
    api.get<ApiResponse<UserResponse>>(`/v1/users/${encodeURIComponent(id)}`).then(decryptUser),

  updateMe: async (data: UpdateProfileRequest) => {
    const encrypted = await encryptFields(data, ENCRYPTED_PROFILE_FIELDS);
    return api.put<ApiResponse<UserResponse>>('/v1/users/me', encrypted).then(decryptUser);
  },

  deactivate: () => api.delete<ApiResponse<null>>('/v1/users/me'),
};
