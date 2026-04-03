import { useReducer, useCallback, useEffect, useRef } from 'react';
import { verificationsApi } from '@/api/verifications';
import { usersApi } from '@/api/users';
import { useAuthStore } from '@/stores/auth-store';
import type {
  IdentityVerificationResponse,
  SubmitVerificationRequest,
} from '@/types/api';

const POLL_INTERVAL = 30_000; // 30 seconds

// Survives component unmounts so the full-screen spinner never shows again
// after verifications have been loaded at least once.
let _moduleInitialized = false;

// ── State & Actions ──

interface VerificationsState {
  verifications: IdentityVerificationResponse[];
  initialized: boolean;
  loading: boolean;
  refreshing: boolean;
  submitting: boolean;
  error: string | null;
}

type VerificationsAction =
  | { type: 'FETCH_START'; silent?: boolean; }
  | { type: 'FETCH_SUCCESS'; payload: IdentityVerificationResponse[]; }
  | { type: 'FETCH_ERROR'; payload: string; }
  | { type: 'SUBMIT_START'; }
  | { type: 'SUBMIT_SUCCESS'; payload: IdentityVerificationResponse; }
  | { type: 'SUBMIT_ERROR'; payload: string; }
  | { type: 'CLEAR_ERROR'; };

function verificationsReducer(
  state: VerificationsState,
  action: VerificationsAction,
): VerificationsState {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        loading: action.silent ? state.loading : true,
        refreshing: action.silent ? state.refreshing : state.initialized,
        error: null,
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        refreshing: false,
        initialized: true,
        verifications: action.payload,
        error: null,
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false, refreshing: false, error: action.payload };
    case 'SUBMIT_START':
      return { ...state, submitting: true, error: null };
    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        submitting: false,
        verifications: [...state.verifications, action.payload],
        error: null,
      };
    case 'SUBMIT_ERROR':
      return { ...state, submitting: false, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
  }
}

interface FetchVerificationsOptions {
  silent?: boolean;
}

export function useVerifications() {
  const setStoreUser = useAuthStore((s) => s.setUser);
  const prevStatusesRef = useRef<Record<string, string>>({});

  const [state, dispatch] = useReducer(verificationsReducer, {
    verifications: [],
    initialized: _moduleInitialized,
    loading: false,
    refreshing: false,
    submitting: false,
    error: null,
  });

  const fetchVerifications = useCallback(async (options?: FetchVerificationsOptions) => {
    dispatch({ type: 'FETCH_START', silent: options?.silent });

    try {
      const { data: res } = await verificationsApi.getMine();
      const rawData = (res as any)?.data;
      const newVerifications: IdentityVerificationResponse[] = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.data)
          ? rawData.data
          : [];
      _moduleInitialized = true;
      dispatch({ type: 'FETCH_SUCCESS', payload: newVerifications });

      // Detect status changes from previous fetch
      const prev = prevStatusesRef.current;
      const hasStatusChanged = newVerifications.some(
        (v: IdentityVerificationResponse) => prev[v.id] !== undefined && prev[v.id] !== v.status,
      );

      // Update snapshot
      prevStatusesRef.current = Object.fromEntries(
        newVerifications.map((v: IdentityVerificationResponse) => [v.id, v.status]),
      );

      // Sync profile when a verification status changed so verificationLevel reflects the update
      if (hasStatusChanged) {
        try {
          const { data: userRes } = await usersApi.getMe();
          if (userRes.data) setStoreUser(userRes.data);
        } catch {
          // ignore profile refresh errors silently
        }
      }
    } catch (err: any) {
      const backendMessage = err?.response?.data?.message
        ?? err?.response?.data?.error
        ?? err?.message;
      dispatch({
        type: 'FETCH_ERROR',
        payload: backendMessage ?? 'Error al cargar verificaciones',
      });
    }
  }, [setStoreUser]);

  const submitVerification = useCallback(async (data: SubmitVerificationRequest) => {
    dispatch({ type: 'SUBMIT_START' });
    try {
      const { data: res } = await verificationsApi.submit(data);
      if (!res.data) throw new Error('Error al enviar verificación');
      dispatch({ type: 'SUBMIT_SUCCESS', payload: res.data });
      return true;
    } catch (err: any) {
      dispatch({
        type: 'SUBMIT_ERROR',
        payload: err?.response?.data?.message ?? 'Error al enviar verificación',
      });
      return false;
    }
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  // Poll while there are PENDING verifications so status + verificationLevel updates are detected
  useEffect(() => {
    const hasPending = state.verifications.some((v) => v.status === 'PENDING');
    if (!hasPending) return;

    const id = setInterval(() => {
      void fetchVerifications({ silent: true });
    }, POLL_INTERVAL);

    return () => clearInterval(id);
  }, [state.verifications, fetchVerifications]);

  return {
    ...state,
    fetchVerifications,
    submitVerification,
    clearError,
  };
}
