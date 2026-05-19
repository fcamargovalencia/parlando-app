import { api } from './client';
import { encryptFields, decryptFields } from '@/lib/crypto';
import type {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  LogoutRequest,
  UserResponse,
  VerifyPhoneRequest,
  GoogleSignInRequest,
  PasswordResetRequestPayload,
  PasswordResetConfirmPayload,
} from '@/types/api';

const ENCRYPTED_REGISTER_FIELDS: (keyof RegisterRequest)[] = [
  'email',
  'phone',
  'password',
  'firstName',
  'lastName',
];

const ENCRYPTED_LOGIN_FIELDS: (keyof LoginRequest)[] = ['email', 'password'];
const ENCRYPTED_USER_FIELDS: (keyof UserResponse)[] = ['firstName', 'lastName', 'email', 'phone'];

async function decryptAuthUser<T extends { data: AuthResponse | null; }>(
  response: { data: T; },
): Promise<{ data: T; }> {
  if (response.data.data?.user) {
    response.data.data.user = await decryptFields(response.data.data.user, ENCRYPTED_USER_FIELDS);
  }
  return response;
}

export const authApi = {
  register: async (data: RegisterRequest) => {
    const encrypted = await encryptFields(data, ENCRYPTED_REGISTER_FIELDS);
    return api.post<ApiResponse<AuthResponse>>('/v1/auth/register', encrypted).then(decryptAuthUser);
  },

  login: async (data: LoginRequest) => {
    const encrypted = await encryptFields(data, ENCRYPTED_LOGIN_FIELDS);
    return api.post<ApiResponse<AuthResponse>>('/v1/auth/login', encrypted).then(decryptAuthUser);
  },

  refresh: (refreshToken: string) =>
    api.post<ApiResponse<AuthResponse>>('/v1/auth/refresh', { refreshToken }),

  logout: (data: LogoutRequest) =>
    api.post<ApiResponse<null>>('/v1/auth/logout', data),

  sendOtp: () =>
    api.post<ApiResponse<null>>('/v1/auth/send-otp'),

  verifyPhone: (data: VerifyPhoneRequest) =>
    api.post<ApiResponse<unknown>>('/v1/auth/verify-phone', data),

  googleSignIn: (data: GoogleSignInRequest) =>
    api.post<ApiResponse<AuthResponse>>('/v1/auth/google', data).then(decryptAuthUser),

  requestPasswordReset: (data: PasswordResetRequestPayload) =>
    api.post<ApiResponse<null>>('/v1/auth/password-reset/request', data),

  confirmPasswordReset: (data: PasswordResetConfirmPayload) =>
    api.post<ApiResponse<null>>('/v1/auth/password-reset/confirm', data),

  resendEmailVerification: () =>
    api.post<ApiResponse<null>>('/v1/auth/verify-email/send'),

  verifyEmail: (token: string) =>
    api.get<ApiResponse<null>>('/v1/auth/verify-email', {
      params: { token },
      // The backend may return 302 (redirect to deep link) on success;
      // treat any 2xx or 3xx as a successful verification.
      validateStatus: (status) => status >= 200 && status < 400,
    }),
};
