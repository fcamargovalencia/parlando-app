import { useReducer, useCallback } from 'react';
import { authApi } from '@/api/auth';
import { usersApi } from '@/api/users';
import { useAuthStore } from '@/stores/auth-store';
import type { LoginRequest, RegisterRequest, UserResponse } from '@/types/api';

// ── State & Actions ──

interface AuthState {
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOADING' }
  | { type: 'ERROR'; payload: string }
  | { type: 'RESET' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOADING':
      return { loading: true, error: null };
    case 'ERROR':
      return { loading: false, error: action.payload };
    case 'RESET':
      return { loading: false, error: null };
  }
}

export function useAuth() {
  const [state, dispatch] = useReducer(authReducer, { loading: false, error: null });
  const { login: storeLogin, logout: storeLogout } = useAuthStore();

  const login = useCallback(async (data: LoginRequest) => {
    dispatch({ type: 'LOADING' });
    try {
      const { data: res } = await authApi.login(data);
      if (!res.data) throw new Error(res.message || 'Error al iniciar sesión');

      const { accessToken, refreshToken } = res.data;
      let user: UserResponse | null = res.data.user;

      // Fetch full profile if not included in auth response
      if (!user) {
        useAuthStore.getState().setTokens(accessToken, refreshToken);
        const { data: meRes } = await usersApi.getMe();
        user = meRes.data;
      }

      // Block admin/moderator users (they should use the admin panel)
      if (user && (user.role === 'ADMIN' || user.role === 'MODERATOR')) {
        dispatch({ type: 'ERROR', payload: 'Usa el panel de administración para acceder.' });
        return false;
      }

      storeLogin(accessToken, refreshToken, user);
      dispatch({ type: 'RESET' });
      return true;
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? 'Error al iniciar sesión';
      dispatch({ type: 'ERROR', payload: message });
      return false;
    }
  }, [storeLogin]);

  const register = useCallback(async (data: RegisterRequest) => {
    dispatch({ type: 'LOADING' });
    try {
      const { data: res } = await authApi.register(data);
      if (!res.data) throw new Error(res.message || 'Error al registrarse');

      const { accessToken, refreshToken, user } = res.data;
      storeLogin(accessToken, refreshToken, user);
      dispatch({ type: 'RESET' });
      return true;
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? 'Error al registrarse';
      dispatch({ type: 'ERROR', payload: message });
      return false;
    }
  }, [storeLogin]);

  const logout = useCallback(async () => {
    try {
      const { accessToken, refreshToken } = useAuthStore.getState();
      if (accessToken && refreshToken) {
        await authApi.logout({ accessToken, refreshToken });
      }
    } catch {
      // Best-effort logout
    } finally {
      storeLogout();
    }
  }, [storeLogout]);

  const verifyPhone = useCallback(async (otp: string) => {
    dispatch({ type: 'LOADING' });
    try {
      await authApi.verifyPhone({ otp });
      // Re-fetch profile to update verification level
      const { data: meRes } = await usersApi.getMe();
      if (meRes.data) {
        useAuthStore.getState().setUser(meRes.data);
      }
      dispatch({ type: 'RESET' });
      return true;
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? 'Código inválido';
      dispatch({ type: 'ERROR', payload: message });
      return false;
    }
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    ...state,
    login,
    register,
    logout,
    verifyPhone,
    clearError,
  };
}
