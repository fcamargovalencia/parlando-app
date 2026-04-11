import { useReducer, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/auth-store';
import Toast from 'react-native-toast-message';

// ── Form Reducer ──

interface ProfileFormState {
  firstName: string;
  lastName: string;
  profilePhotoUrl: string;
}

type ProfileFormAction =
  | { type: 'SET'; field: keyof ProfileFormState; value: string }
  | { type: 'INIT'; payload: ProfileFormState };

function formReducer(state: ProfileFormState, action: ProfileFormAction): ProfileFormState {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value };
    case 'INIT':
      return action.payload;
  }
}

// ── Hook ──

export function useEditProfile() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { updateProfile, updating, error } = useProfile();

  const [form, dispatch] = useReducer(formReducer, {
    firstName: '',
    lastName: '',
    profilePhotoUrl: '',
  });

  useEffect(() => {
    if (user) {
      dispatch({
        type: 'INIT',
        payload: {
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          profilePhotoUrl: user.profilePhotoUrl || '',
        },
      });
    }
  }, [user]);

  const setField = useCallback(
    (field: keyof ProfileFormState, value: string) =>
      dispatch({ type: 'SET', field, value }),
    [],
  );

  const hasChanges = useMemo(
    () =>
      form.firstName !== (user?.firstName ?? '') ||
      form.lastName !== (user?.lastName ?? '') ||
      form.profilePhotoUrl !== (user?.profilePhotoUrl ?? ''),
    [form, user],
  );

  const handleSave = useCallback(async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Campos requeridos',
        text2: 'Nombre y apellido son obligatorios.',
      });
      return;
    }

    const success = await updateProfile({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      profilePhotoUrl: form.profilePhotoUrl || undefined,
    });

    if (success) {
      Toast.show({ type: 'success', text1: 'Perfil actualizado' });
      router.back();
    }
  }, [form, updateProfile, router]);

  return {
    user,
    form,
    setField,
    hasChanges,
    updating,
    error,
    handleSave,
  };
}
