import React, { useReducer, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, User } from 'lucide-react-native';
import { Screen, Button, Input, Card, Avatar } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/auth-store';
import { Colors } from '@/constants/colors';
import Toast from 'react-native-toast-message';

// ── Form Reducer ──

interface ProfileFormState {
  firstName: string;
  lastName: string;
  profilePhotoUrl: string;
}

type ProfileFormAction =
  | { type: 'SET'; field: keyof ProfileFormState; value: string; }
  | { type: 'INIT'; payload: ProfileFormState; };

function formReducer(state: ProfileFormState, action: ProfileFormAction): ProfileFormState {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value };
    case 'INIT':
      return action.payload;
  }
}

export default function EditProfileScreen() {
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

  const setField = (field: keyof ProfileFormState, value: string) =>
    dispatch({ type: 'SET', field, value });

  const hasChanges =
    form.firstName !== (user?.firstName || '') ||
    form.lastName !== (user?.lastName || '') ||
    form.profilePhotoUrl !== (user?.profilePhotoUrl || '');

  const handleSave = async () => {
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
      Toast.show({
        type: 'success',
        text1: 'Perfil actualizado',
      });
      router.back();
    }
  };

  return (
    <Screen safe={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-6 pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View className="items-center mb-8">
            <View className="relative">
              <Avatar
                size="xl"
                uri={user?.profilePhotoUrl}
                firstName={user?.firstName || ''}
                lastName={user?.lastName || ''}
              />
              <TouchableOpacity
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary-600 items-center justify-center border-3 border-white"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                }}
                activeOpacity={0.7}
              >
                <Camera size={18} color="white" />
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-neutral-400 mt-3">
              Toca la cámara para cambiar tu foto
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4 mb-6">
            <Input
              label="Nombre"
              placeholder="Tu nombre"
              value={form.firstName}
              onChangeText={(v) => setField('firstName', v)}
              autoCapitalize="words"
            />

            <Input
              label="Apellido"
              placeholder="Tu apellido"
              value={form.lastName}
              onChangeText={(v) => setField('lastName', v)}
              autoCapitalize="words"
            />
          </View>

          {/* Read-only Info */}
          <Text className="text-base font-semibold text-neutral-800 mb-3">
            Información de la cuenta
          </Text>
          <Card className="mb-6">
            <View className="py-2">
              <Text className="text-xs text-neutral-400 mb-0.5">Correo electrónico</Text>
              <Text className="text-sm text-neutral-600">{user?.email || '-'}</Text>
            </View>
            <View className="h-px bg-neutral-100 my-2" />
            <View className="py-2">
              <Text className="text-xs text-neutral-400 mb-0.5">Teléfono</Text>
              <Text className="text-sm text-neutral-600">{user?.phone || '-'}</Text>
            </View>
            <View className="h-px bg-neutral-100 my-2" />
            <View className="py-2">
              <Text className="text-xs text-neutral-400 mb-0.5">Rol</Text>
              <Text className="text-sm text-neutral-600 capitalize">{user?.role?.toLowerCase() || '-'}</Text>
            </View>
          </Card>

          {/* Error */}
          {error && (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          )}

          {/* Save */}
          <Button
            onPress={handleSave}
            loading={updating}
            disabled={!hasChanges}
            size="lg"
            className="w-full"
          >
            Guardar cambios
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
