import React from 'react';
import { View, Text, Modal } from 'react-native';
import { Button } from '@/components/ui';
import { Colors } from '@/constants/colors';

export interface ResumeModalProps {
  visible: boolean;
  isSubmitting: boolean;
  bottomInset: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function ResumeModal({ visible, isSubmitting, bottomInset, onClose, onConfirm }: ResumeModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: Colors.overlay }}>
        <View className="bg-white rounded-t-3xl px-6 pt-5" style={{ paddingBottom: bottomInset + 24 }}>
          <View className="w-10 h-1 rounded-full bg-neutral-300 self-center mb-5" />
          <Text className="text-lg font-bold text-neutral-900 mb-2">¿Reactivar suscripción?</Text>
          <Text className="text-sm text-neutral-500 mb-6">
            Se generarán nuevos bookings para las próximas ocurrencias.
          </Text>
          <View className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={onClose}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={isSubmitting}
              loading={isSubmitting}
              onPress={onConfirm}
            >
              Reactivar
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
