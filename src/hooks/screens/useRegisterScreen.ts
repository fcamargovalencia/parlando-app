import { useReducer, useCallback } from 'react';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuth } from '@/hooks/useAuth';
import { APP } from '@/constants/config';
import {
  registerFormReducer,
  initialRegisterFormState,
  type RegisterFormField,
} from '@/reducers/register-form.reducer';

export function useRegisterScreen() {
  const router = useRouter();
  const { loading, error, register, clearError } = useAuth();
  const [state, dispatch] = useReducer(registerFormReducer, initialRegisterFormState);

  const updateField = useCallback((field: RegisterFormField, value: string) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  const validate = useCallback((): boolean => {
    const { fields } = state;
    const errors: Partial<Record<RegisterFormField, string>> = {};
    if (!fields.firstName.trim()) errors.firstName = 'Nombre requerido';
    if (!fields.lastName.trim()) errors.lastName = 'Apellido requerido';
    if (!fields.email.includes('@')) errors.email = 'Email inválido';
    if (!/^\d{10}$/.test(fields.phone)) errors.phone = 'Ingresa 10 dígitos';
    if (fields.password.length < 8) errors.password = 'Mínimo 8 caracteres';
    if (fields.password !== fields.confirmPassword)
      errors.confirmPassword = 'Las contraseñas no coinciden';
    dispatch({ type: 'SET_ERRORS', errors });
    return Object.keys(errors).length === 0;
  }, [state]);

  const handleRegister = useCallback(async () => {
    if (!validate()) return;
    const { fields } = state;
    const success = await register({
      firstName: fields.firstName.trim(),
      lastName: fields.lastName.trim(),
      email: fields.email.trim().toLowerCase(),
      phone: `${APP.PHONE_PREFIX}${fields.phone}`,
      password: fields.password,
    });
    if (success) {
      Toast.show({
        type: 'success',
        text1: '¡Bienvenido a ParlAndo!',
        text2: 'Revisa tu email para verificar tu cuenta.',
      });
      router.replace('/(auth)/verify-phone');
    }
  }, [validate, state, register, router]);

  return {
    fields: state.fields,
    errors: state.errors,
    loading,
    error,
    clearError,
    updateField,
    handleRegister,
  };
}
