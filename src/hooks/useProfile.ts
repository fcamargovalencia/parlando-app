import { useReducer, useCallback, useEffect } from 'react';
import { usersApi } from '@/api/users';
import { useAuthStore } from '@/stores/auth-store';
import type { UserResponse, UpdateProfileRequest } from '@/types/api';

// ── State & Actions ──

interface ProfileState {
  user: UserResponse | null;
  loading: boolean;
  updating: boolean;
  error: string | null;
}

type ProfileAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: UserResponse }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'UPDATE_START' }
  | { type: 'UPDATE_SUCCESS'; payload: UserResponse }
  | { type: 'UPDATE_ERROR'; payload: string };

function profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, user: action.payload, error: null };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'UPDATE_START':
      return { ...state, updating: true, error: null };
    case 'UPDATE_SUCCESS':
      return { ...state, updating: false, user: action.payload, error: null };
    case 'UPDATE_ERROR':
      return { ...state, updating: false, error: action.payload };
  }
}

export function useProfile() {
  const storeUser = useAuthStore((s) => s.user);
  const setStoreUser = useAuthStore((s) => s.setUser);

  const [state, dispatch] = useReducer(profileReducer, {
    user: storeUser,
    loading: false,
    updating: false,
    error: null,
  });

  const fetchProfile = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const { data: res } = await usersApi.getMe();
      if (!res.data) throw new Error('No se pudo obtener el perfil');
      dispatch({ type: 'FETCH_SUCCESS', payload: res.data });
      setStoreUser(res.data);
    } catch (err: any) {
      dispatch({
        type: 'FETCH_ERROR',
        payload: err?.response?.data?.message ?? 'Error al cargar perfil',
      });
    }
  }, [setStoreUser]);

  const updateProfile = useCallback(
    async (data: UpdateProfileRequest) => {
      dispatch({ type: 'UPDATE_START' });
      try {
        const { data: res } = await usersApi.updateMe(data);
        if (!res.data) throw new Error('No se pudo actualizar el perfil');
        dispatch({ type: 'UPDATE_SUCCESS', payload: res.data });
        setStoreUser(res.data);
        return true;
      } catch (err: any) {
        dispatch({
          type: 'UPDATE_ERROR',
          payload: err?.response?.data?.message ?? 'Error al actualizar perfil',
        });
        return false;
      }
    },
    [setStoreUser],
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    ...state,
    fetchProfile,
    updateProfile,
  };
}
