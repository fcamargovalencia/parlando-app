import { useReducer, useCallback, useEffect } from 'react';
import { verificationsApi } from '@/api/verifications';
import type {
  IdentityVerificationResponse,
  SubmitVerificationRequest,
} from '@/types/api';

// ── State & Actions ──

interface VerificationsState {
  verifications: IdentityVerificationResponse[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
}

type VerificationsAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: IdentityVerificationResponse[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS'; payload: IdentityVerificationResponse }
  | { type: 'SUBMIT_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

function verificationsReducer(
  state: VerificationsState,
  action: VerificationsAction,
): VerificationsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, verifications: action.payload, error: null };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
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

export function useVerifications() {
  const [state, dispatch] = useReducer(verificationsReducer, {
    verifications: [],
    loading: false,
    submitting: false,
    error: null,
  });

  const fetchVerifications = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const { data: res } = await verificationsApi.getMine();
      dispatch({ type: 'FETCH_SUCCESS', payload: res.data ?? [] });
    } catch (err: any) {
      dispatch({
        type: 'FETCH_ERROR',
        payload: err?.response?.data?.message ?? 'Error al cargar verificaciones',
      });
    }
  }, []);

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

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  return {
    ...state,
    fetchVerifications,
    submitVerification,
    clearError,
  };
}
