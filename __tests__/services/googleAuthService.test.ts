/**
 * Tests for googleAuthService — the low-level wrapper around
 * GoogleSignin + Firebase Auth.
 *
 * Native module mocks live in __mocks__/.
 */

import { signInWithGoogle } from '../../src/services/auth/googleAuthService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';

describe('googleAuthService.signInWithGoogle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a firebaseIdToken and email on success', async () => {
    const result = await signInWithGoogle();
    expect(result.firebaseIdToken).toBe('mock-firebase-id-token');
    expect(result.email).toBe('test@example.com');
  });

  it('calls GoogleSignin.hasPlayServices before sign-in', async () => {
    await signInWithGoogle();
    expect(GoogleSignin.hasPlayServices).toHaveBeenCalledWith({
      showPlayServicesUpdateDialog: true,
    });
  });

  it('calls GoogleSignin.signIn to open account picker', async () => {
    await signInWithGoogle();
    expect(GoogleSignin.signIn).toHaveBeenCalled();
  });

  it('throws when signIn returns no idToken', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({ data: { idToken: null } });

    await expect(signInWithGoogle()).rejects.toThrow('No se obtuvo ID token de Google');
  });

  it('propagates SIGN_IN_CANCELLED error so callers can handle it', async () => {
    const cancelError = Object.assign(new Error('cancelled'), {
      code: 'SIGN_IN_CANCELLED',
    });
    (GoogleSignin.signIn as jest.Mock).mockRejectedValueOnce(cancelError);

    await expect(signInWithGoogle()).rejects.toMatchObject({
      code: 'SIGN_IN_CANCELLED',
    });
  });

  it('creates a Firebase credential with the Google idToken', async () => {
    await signInWithGoogle();
    expect((auth as any).GoogleAuthProvider.credential).toHaveBeenCalledWith(
      'mock-google-id-token',
    );
  });
});
