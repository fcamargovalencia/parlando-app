import React from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Button } from '@/components/ui';
import { Colors } from '@/constants/colors';
import type { SubscriptionDetailAction } from '@/reducers/subscription-detail.reducer';

function formatDate(iso: string): string {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

export interface PauseModalProps {
  visible: boolean;
  hasPauseTo: boolean;
  pauseFrom: string | null;
  pauseTo: string | null;
  pauseReason: string;
  isSubmitting: boolean;
  bottomInset: number;
  dispatch: React.Dispatch<SubscriptionDetailAction>;
  onClose: () => void;
  onConfirm: () => void;
}

export function PauseModal({
  visible, hasPauseTo, pauseFrom, pauseTo, pauseReason, isSubmitting, bottomInset, dispatch, onClose, onConfirm,
}: PauseModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: Colors.overlay }}>
        <View className="bg-white rounded-t-3xl px-6 pt-5" style={{ paddingBottom: bottomInset + 24 }}>
          <View className="w-10 h-1 rounded-full bg-neutral-300 self-center mb-5" />
          <Text className="text-lg font-bold text-neutral-900 mb-1">Pausar suscripción</Text>
          <Text className="text-sm text-neutral-500 mb-5">
            Los bookings en ese rango serán cancelados. Al reactivar, se generarán nuevos bookings para el período restante.
          </Text>

          <Text className="text-sm font-medium text-neutral-700 mb-1">Desde *</Text>
          <TouchableOpacity
            onPress={() => dispatch({ type: 'SHOW_PAUSE_FROM_PICKER' })}
            className="border border-neutral-200 rounded-xl px-4 py-3 mb-4"
          >
            <Text className={pauseFrom ? 'text-neutral-800' : 'text-neutral-400'}>
              {pauseFrom ? formatDate(pauseFrom) : 'Seleccionar fecha'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => dispatch({ type: 'TOGGLE_HAS_PAUSE_TO' })}
            className="flex-row items-center gap-2 mb-3"
          >
            <View
              className={`w-4 h-4 rounded border ${hasPauseTo ? 'bg-primary-500 border-primary-500' : 'border-neutral-300'}`}
            />
            <Text className="text-sm text-neutral-700">Tiene fecha de fin</Text>
          </TouchableOpacity>

          {hasPauseTo && (
            <>
              <Text className="text-sm font-medium text-neutral-700 mb-1">Hasta</Text>
              <TouchableOpacity
                onPress={() => dispatch({ type: 'SHOW_PAUSE_TO_PICKER' })}
                className="border border-neutral-200 rounded-xl px-4 py-3 mb-4"
              >
                <Text className={pauseTo ? 'text-neutral-800' : 'text-neutral-400'}>
                  {pauseTo ? formatDate(pauseTo) : 'Seleccionar fecha'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <Text className="text-sm font-medium text-neutral-700 mb-1">Motivo (opcional)</Text>
          <TextInput
            value={pauseReason}
            onChangeText={(v) => dispatch({ type: 'SET_PAUSE_REASON', payload: v })}
            placeholder="¿Por qué pausas la suscripción?"
            className="border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 mb-5"
            multiline
            numberOfLines={2}
          />

          <View className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={onClose}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={!pauseFrom || isSubmitting}
              loading={isSubmitting}
              onPress={onConfirm}
            >
              Pausar
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
