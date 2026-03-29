import { api } from './client';
import { encryptFields } from '@/lib/crypto';
import type {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  LogoutRequest,
  VerifyPhoneRequest,
} from '@/types/api';

const ENCRYPTED_REGISTER_FIELDS: (keyof RegisterRequest)[] = [
  'email',
  'phone',
  'password',
  'firstName',
  'lastName',
];

const ENCRYPTED_LOGIN_FIELDS: (keyof LoginRequest)[] = ['email', 'password'];

export const authApi = {
  register: async (data: RegisterRequest) => {
    const encrypted = await encryptFields(data, ENCRYPTED_REGISTER_FIELDS);
    return api.post<ApiResponse<AuthResponse>>('/v1/auth/register', encrypted);
  },

  login: async (data: LoginRequest) => {
    const encrypted = await encryptFields(data, ENCRYPTED_LOGIN_FIELDS);

    return api.post<ApiResponse<AuthResponse>>('/v1/auth/login', encrypted);
  },

  refresh: (refreshToken: string) =>
    api.post<ApiResponse<AuthResponse>>('/v1/auth/refresh', { refreshToken }),

  logout: (data: LogoutRequest) =>
    api.post<ApiResponse<null>>('/v1/auth/logout', data),

  verifyPhone: (data: VerifyPhoneRequest) =>
    api.post<ApiResponse<unknown>>('/v1/auth/verify-phone', data),
};
