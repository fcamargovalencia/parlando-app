/**
 * Tests for useAuth.googleSignIn integration behavior:
 * - Calls authApi.googleSignIn with the Firebase ID token
 * - SIGN_IN_CANCELLED: returns false, sets no error
 * - Network/backend failure: sets error state
 *
 * The googleAuthService is mocked here so we control the native layer.
 */

// Mock the native service so no real Firebase calls are made
jest.mock('@/services/auth/googleAuthService', () => ({
  signInWithGoogle: jest.fn().mockResolvedValue({ firebaseIdToken: 'mock-firebase-id-token' }),
  signOutGoogle: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/api/auth', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    sendOtp: jest.fn(),
    verifyPhone: jest.fn(),
    googleSignIn: jest.fn(),
    requestPasswordReset: jest.fn(),
    confirmPasswordReset: jest.fn(),
    resendEmailVerification: jest.fn(),
    verifyEmail: jest.fn(),
  },
}));

jest.mock('@/api/users', () => ({
  usersApi: {
    getMe: jest.fn().mockResolvedValue({ data: { data: null } }),
  },
}));

jest.mock('@/stores/auth-store', () => {
  const storeMock = {
    accessToken: null,
    refreshToken: null,
    user: null,
    setTokens: jest.fn(),
    setUser: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: () => false,
    persist: { clearStorage: jest.fn() },
  };
  return {
    useAuthStore: Object.assign(
      jest.fn((selector?: any) => (selector ? selector(storeMock) : storeMock)),
      { getState: jest.fn(() => storeMock) },
    ),
  };
});

jest.mock('@/lib/notifications', () => ({
  registerForPushNotifications: jest.fn().mockResolvedValue(undefined),
  unregisterPushToken: jest.fn().mockResolvedValue(undefined),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '../../src/hooks/useAuth';

const { authApi } = require('@/api/auth');
const googleAuthService = require('@/services/auth/googleAuthService');

const mockUser = {
  id: '1',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  provider: 'LOCAL',
  emailVerified: false,
  role: 'PASSENGER',
};

describe('useAuth.googleSignIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authApi.googleSignIn.mockResolvedValue({
      data: {
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: mockUser,
        },
      },
    });
    googleAuthService.signInWithGoogle.mockResolvedValue({
      firebaseIdToken: 'mock-firebase-id-token',
    });
  });

  it('calls authApi.googleSignIn with the Firebase ID token', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.googleSignIn();
    });

    expect(authApi.googleSignIn).toHaveBeenCalledWith({
      firebaseIdToken: 'mock-firebase-id-token',
    });
  });

  it('returns false and sets no error on SIGN_IN_CANCELLED', async () => {
    const cancelError = Object.assign(new Error('cancelled'), {
      code: 'SIGN_IN_CANCELLED',
    });
    googleAuthService.signInWithGoogle.mockRejectedValueOnce(cancelError);

    const { result } = renderHook(() => useAuth());

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.googleSignIn();
    });

    expect(returnValue).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error state on network/backend failure', async () => {
    googleAuthService.signInWithGoogle.mockRejectedValueOnce(
      new Error('Network request failed'),
    );

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.googleSignIn();
    });

    expect(result.current.error).toBeTruthy();
  });
});

