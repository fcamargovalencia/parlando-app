// Mock for @react-native-google-signin/google-signin
export const GoogleSignin = {
  configure: jest.fn(),
  hasPlayServices: jest.fn().mockResolvedValue(true),
  signIn: jest.fn().mockResolvedValue({
    data: { idToken: 'mock-google-id-token' },
  }),
  signOut: jest.fn().mockResolvedValue(undefined),
  isSignedIn: jest.fn().mockResolvedValue(false),
  revokeAccess: jest.fn().mockResolvedValue(undefined),
};

export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
};
