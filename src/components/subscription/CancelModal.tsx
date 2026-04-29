import React from 'react';
import { View, Text, Modal, TextInput } from 'react-native';
import { Button } from '@/components/ui';
import { Colors } from '@/constants/colors';
import type { SubscriptionDetailAction } from '@/reducers/subscription-detail.reducer';

export interface CancelModalProps {
  visible: boolean;
  isSubmitting: boolean;
  cancelReason: string;
  bottomInset: number;
  dispatch: React.Dispatch<SubscriptionDetailAction>;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelModal({
  visible, isSubmitting, cancelReason, bottomInset, dispatch, onClose, onConfirm,
}: CancelModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: Colors.overlay }}>
        <View className="bg-white rounded-t-3xl px-6 pt-5" style={{ paddingBottom: bottomInset + 24 }}>
          <View className="w-10 h-1 rounded-full bg-neutral-300 self-center mb-5" />
          <Text className="text-lg font-bold text-neutral-900 mb-1">Cancelar suscripción</Text>
          <Text className="text-sm text-neutral-500 mb-5">
            Se cancelarán todas las ocurrencias futuras. Esta acción no se puede deshacer.
          </Text>
          <Text className="text-sm font-medium text-neutral-700 mb-1">Motivo (opcional)</Text>
          <TextInput
            value={cancelReason}
            onChangeText={(v) => dispatch({ type: 'SET_CANCEL_REASON', payload: v })}
            placeholder="Ej: Ya no necesito el servicio"
            className="border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 mb-5"
            multiline
            numberOfLines={2}
          />
          <View className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={onClose}>
              Volver
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              disabled={isSubmitting}
              loading={isSubmitting}
              onPress={onConfirm}
            >
              Cancelar suscripción
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
