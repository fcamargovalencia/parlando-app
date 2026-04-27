import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, ShieldAlert } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import type { EdgeInsets } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  onClose: () => void;
  universityName: string;
  universityId: string | undefined;
  hasPendingVerification: boolean;
  insets: EdgeInsets;
}

export function StudentVerificationModal({
  visible,
  onClose,
  universityName,
  universityId,
  hasPendingVerification,
  insets,
}: Props) {
  const router = useRouter();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: Colors.overlay }}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        style={{
          backgroundColor: Colors.white,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
          paddingTop: 20,
        }}
      >
        <View className="w-10 h-1 rounded-full bg-neutral-200 self-center mb-5" />

        <View className="flex-row items-center gap-3 mb-4">
          <View className="w-12 h-12 rounded-2xl bg-red-50 items-center justify-center">
            <ShieldAlert size={24} color={Colors.semantic.error} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">
              Verificación estudiantil requerida
            </Text>
            <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={2}>
              Esta ruta es exclusiva para estudiantes verificados de {universityName}
            </Text>
          </View>
        </View>

        {hasPendingVerification ? (
          <View className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center gap-2 mb-1">
              <Clock size={16} color={Colors.semantic.warning} />
              <Text className="text-sm font-semibold text-yellow-800">En revisión</Text>
            </View>
            <Text className="text-xs text-yellow-700 leading-4">
              Tu verificación está en revisión. Recibirás una notificación cuando sea aprobada.
            </Text>
          </View>
        ) : (
          <>
            <Text className="text-sm text-neutral-600 leading-5 mb-5">
              Para suscribirte necesitas verificar tu condición de estudiante universitario.
              El proceso es rápido: solo necesitas tu carnet y tu correo institucional.
            </Text>
            <TouchableOpacity
              onPress={() => {
                onClose();
                router.push(
                  universityId
                    ? { pathname: '/student-verification/submit', params: { universityId } }
                    : '/student-verification/submit',
                );
              }}
              activeOpacity={0.85}
              className="bg-primary-500 rounded-2xl py-4 items-center mb-3"
            >
              <Text className="text-base font-bold text-white">Verificar ahora</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="py-3 items-center">
          <Text className="text-sm font-medium text-neutral-500">Cerrar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
