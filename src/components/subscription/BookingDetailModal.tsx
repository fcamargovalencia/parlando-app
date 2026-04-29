import React from 'react';
import { View, Text, Modal, TextInput } from 'react-native';
import { Clock } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { Colors } from '@/constants/colors';
import type { RoutineBookingResponse } from '@/types/api';
import type { SubscriptionDetailAction } from '@/reducers/subscription-detail.reducer';

const BOOKING_STATUS_LABEL: Record<string, string> = {
  ACCEPTED: 'Confirmado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'No se presentó',
};

function formatDate(iso: string): string {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function parseISO(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export interface BookingDetailModalProps {
  visible: boolean;
  selectedBooking: RoutineBookingResponse | null;
  isSubmitting: boolean;
  overrideName: string;
  overrideLat: string;
  overrideLng: string;
  bottomInset: number;
  dispatch: React.Dispatch<SubscriptionDetailAction>;
  onClose: () => void;
  onOverride: () => void;
}

export function BookingDetailModal({
  visible, selectedBooking, isSubmitting, overrideName, overrideLat, overrideLng, bottomInset, dispatch, onClose, onOverride,
}: BookingDetailModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: Colors.overlay }}>
        <View className="bg-white rounded-t-3xl px-6 pt-5" style={{ paddingBottom: bottomInset + 24 }}>
          <View className="w-10 h-1 rounded-full bg-neutral-300 self-center mb-5" />
          {selectedBooking && (
            <>
              <Text className="text-lg font-bold text-neutral-900 mb-4">
                Viaje del {formatDate(selectedBooking.occurrenceDate)}
              </Text>

              <View className="gap-2 mb-5">
                <View className="flex-row items-center gap-2">
                  <Clock size={14} color={Colors.neutral[500]} />
                  <Text className="text-sm text-neutral-700">
                    Ocurrencia: {formatDate(selectedBooking.occurrenceDate)}
                  </Text>
                </View>
                <View className="bg-neutral-100 rounded-xl px-3 py-2 mt-1">
                  <Text className="text-sm font-medium text-neutral-700">
                    Estado: {BOOKING_STATUS_LABEL[selectedBooking.status] ?? selectedBooking.status}
                  </Text>
                </View>
              </View>

              {selectedBooking.status === 'ACCEPTED' &&
                (parseISO(selectedBooking.occurrenceDate).getTime() - Date.now()) /
                (1000 * 60 * 60) >= 2 && (
                  <View className="border border-neutral-200 rounded-2xl p-4 gap-3 mb-4">
                    <Text className="text-sm font-semibold text-neutral-800">
                      Cambiar punto de recogida para este día
                    </Text>
                    <TextInput
                      value={overrideName}
                      onChangeText={(v) => dispatch({ type: 'SET_OVERRIDE_NAME', payload: v })}
                      placeholder="Nombre del punto"
                      className="border border-neutral-200 rounded-xl px-3 py-2.5 text-sm text-neutral-800"
                    />
                    <View className="flex-row gap-2">
                      <TextInput
                        value={overrideLat}
                        onChangeText={(v) => dispatch({ type: 'SET_OVERRIDE_LAT', payload: v })}
                        placeholder="Latitud"
                        keyboardType="decimal-pad"
                        className="flex-1 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm text-neutral-800"
                      />
                      <TextInput
                        value={overrideLng}
                        onChangeText={(v) => dispatch({ type: 'SET_OVERRIDE_LNG', payload: v })}
                        placeholder="Longitud"
                        keyboardType="decimal-pad"
                        className="flex-1 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm text-neutral-800"
                      />
                    </View>
                    <Button
                      disabled={isSubmitting || !overrideName.trim() || !overrideLat || !overrideLng}
                      loading={isSubmitting}
                      onPress={onOverride}
                    >
                      Enviar cambio
                    </Button>
                  </View>
                )}

              <Button variant="outline" onPress={onClose}>
                Cerrar
              </Button>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
