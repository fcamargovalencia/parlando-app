import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { APP } from '@/constants/config';
import type { Role, UserResponse } from '@/types/api';

// ── SecureStore-backed storage adapter for Zustand ──
const secureStoreAdapter = {
  getItem: (name: string) => {
    return SecureStore.getItemAsync(name);
  },
  setItem: (name: string, value: string) => {
    return SecureStore.setItemAsync(name, value);
  },
  removeItem: (name: string) => {
    return SecureStore.deleteItemAsync(name);
  },
};

// ── Auth State ──

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserResponse | null;
  hasOnboarded: boolean;

  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: UserResponse) => void;
  login: (accessToken: string, refreshToken: string, user: UserResponse | null) => void;
  logout: () => void;
  completeOnboarding: () => void;
  isAuthenticated: () => boolean;
  hasRole: (...roles: Role[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hasOnboarded: false,

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      login: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user }),

      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null }),

      completeOnboarding: () => set({ hasOnboarded: true }),

      isAuthenticated: () => !!get().accessToken,

      hasRole: (...roles) => {
        const user = get().user;
        return !!user && roles.includes(user.role);
      },
    }),
    {
      name: APP.STORE_KEY,
      storage: createJSONStorage(() => secureStoreAdapter),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        hasOnboarded: state.hasOnboarded,
      }),
    },
  ),
);
