// Mock for @react-native-firebase/auth
const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  getIdToken: jest.fn().mockResolvedValue('mock-firebase-id-token'),
};

const authMock = {
  GoogleAuthProvider: {
    credential: jest.fn(() => ({ providerId: 'google.com' })),
  },
  __esModule: true,
};

const authInstanceMock = {
  signInWithCredential: jest.fn().mockResolvedValue({ user: mockUser }),
  signOut: jest.fn().mockResolvedValue(undefined),
  currentUser: null,
};

const auth = jest.fn(() => authInstanceMock);
Object.assign(auth, authMock);

module.exports = auth;
module.exports.default = auth;
module.exports.GoogleAuthProvider = authMock.GoogleAuthProvider;
