import { useReducer, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { usersApi } from '@/api/users';
import { extractApiError } from '@/lib/utils';
import Toast from 'react-native-toast-message';

// ── State & Actions ──

interface ChangePasswordState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  submitting: boolean;
  error: string | null;
}

type ChangePasswordAction =
  | { type: 'SET'; field: keyof Pick<ChangePasswordState, 'currentPassword' | 'newPassword' | 'confirmPassword'>; value: string; }
  | { type: 'SUBMIT_START'; }
  | { type: 'SUBMIT_SUCCESS'; }
  | { type: 'SUBMIT_ERROR'; payload: string; };

function reducer(state: ChangePasswordState, action: ChangePasswordAction): ChangePasswordState {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value, error: null };
    case 'SUBMIT_START':
      return { ...state, submitting: true, error: null };
    case 'SUBMIT_SUCCESS':
      return { ...state, submitting: false, error: null };
    case 'SUBMIT_ERROR':
      return { ...state, submitting: false, error: action.payload };
  }
}

// ── Hook ──

export function useChangePassword() {
  const router = useRouter();

  const [state, dispatch] = useReducer(reducer, {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    submitting: false,
    error: null,
  });

  const setField = useCallback(
    (field: keyof Pick<ChangePasswordState, 'currentPassword' | 'newPassword' | 'confirmPassword'>, value: string) =>
      dispatch({ type: 'SET', field, value }),
    [],
  );

  const handleSubmit = useCallback(async () => {
    const { currentPassword, newPassword, confirmPassword } = state;

    if (!currentPassword || !newPassword || !confirmPassword) {
      dispatch({ type: 'SUBMIT_ERROR', payload: 'Todos los campos son obligatorios.' });
      return;
    }

    if (newPassword.length < 8) {
      dispatch({ type: 'SUBMIT_ERROR', payload: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      dispatch({ type: 'SUBMIT_ERROR', payload: 'Las contraseñas nuevas no coinciden.' });
      return;
    }

    if (newPassword === currentPassword) {
      dispatch({ type: 'SUBMIT_ERROR', payload: 'La nueva contraseña debe ser diferente a la actual.' });
      return;
    }

    dispatch({ type: 'SUBMIT_START' });
    try {
      await usersApi.changePassword({ currentPassword, newPassword });
      dispatch({ type: 'SUBMIT_SUCCESS' });
      Toast.show({
        type: 'success',
        text1: 'Contraseña actualizada',
        text2: 'Tu contraseña ha sido cambiada exitosamente.',
      });
      router.back();
    } catch (err) {
      dispatch({
        type: 'SUBMIT_ERROR',
        payload: extractApiError(err, 'Error al cambiar la contraseña.'),
      });
    }
  }, [state, router]);

  return {
    form: {
      currentPassword: state.currentPassword,
      newPassword: state.newPassword,
      confirmPassword: state.confirmPassword,
    },
    submitting: state.submitting,
    error: state.error,
    setField,
    handleSubmit,
  };
}
