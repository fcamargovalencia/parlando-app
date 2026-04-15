import { api } from './client';
import { encryptFields, decryptFields } from '@/lib/crypto';
import type {
  ApiResponse,
  UserResponse,
  UpdateProfileRequest,
  EmergencyContactResponse,
  CreateEmergencyContactRequest,
  UpdateEmergencyContactRequest,
} from '@/types/api';

const ENCRYPTED_PROFILE_FIELDS: (keyof UpdateProfileRequest)[] = ['firstName', 'lastName'];
const ENCRYPTED_USER_FIELDS: (keyof UserResponse)[] = ['firstName', 'lastName', 'email', 'phone'];
const ENCRYPTED_EMERGENCY_CONTACT_FIELDS: (keyof EmergencyContactResponse)[] = [
  'name',
  'phone',
  'relationship',
];

async function decryptUser<T extends { data: UserResponse | null; }>(
  response: { data: T; },
): Promise<{ data: T; }> {
  if (response.data.data) {
    response.data.data = await decryptFields(response.data.data, ENCRYPTED_USER_FIELDS);
  }
  return response;
}

async function decryptEmergencyContact(
  contact: EmergencyContactResponse,
): Promise<EmergencyContactResponse> {
  try {
    return await decryptFields(contact, ENCRYPTED_EMERGENCY_CONTACT_FIELDS);
  } catch {
    // Si algo falla en descifrado, mantenemos el objeto para no romper la UI.
    return contact;
  }
}

async function decryptEmergencyContactResponse<
  T extends { data: EmergencyContactResponse | null; },
>(response: { data: T; }): Promise<{ data: T; }> {
  if (response.data.data) {
    response.data.data = await decryptEmergencyContact(response.data.data);
  }
  return response;
}

async function decryptEmergencyContactsResponse<
  T extends { data: EmergencyContactResponse[] | null; },
>(response: { data: T; }): Promise<{ data: T; }> {
  if (response.data.data) {
    response.data.data = await Promise.all(response.data.data.map(decryptEmergencyContact));
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

  getEmergencyContacts: () =>
    api
      .get<ApiResponse<EmergencyContactResponse[]>>('/v1/users/me/emergency-contacts')
      .then(decryptEmergencyContactsResponse),

  getEmergencyContactById: (id: string) =>
    api
      .get<ApiResponse<EmergencyContactResponse>>(
        `/v1/users/me/emergency-contacts/${encodeURIComponent(id)}`,
      )
      .then(decryptEmergencyContactResponse),

  createEmergencyContact: (data: CreateEmergencyContactRequest) =>
    api
      .post<ApiResponse<EmergencyContactResponse>>('/v1/users/me/emergency-contacts', data)
      .then(decryptEmergencyContactResponse),

  updateEmergencyContact: (id: string, data: UpdateEmergencyContactRequest) =>
    api.put<ApiResponse<EmergencyContactResponse>>(
      `/v1/users/me/emergency-contacts/${encodeURIComponent(id)}`,
      data,
    ).then(decryptEmergencyContactResponse),

  deleteEmergencyContact: (id: string) =>
    api.delete<ApiResponse<null>>(`/v1/users/me/emergency-contacts/${encodeURIComponent(id)}`),

  deactivate: () => api.delete<ApiResponse<null>>('/v1/users/me'),
};
