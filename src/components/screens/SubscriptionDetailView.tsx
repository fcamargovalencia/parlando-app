import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Pause,
  Play,
  User,
  X,
  XCircle,
} from 'lucide-react-native';
import { Button, Card, CardHeader, DatePickerModal, Spinner } from '@/components/ui';
import { SubscriptionStatusBadge } from '@/components/routine/SubscriptionStatusBadge';
import { RoutineCalendarView } from '@/components/routine/RoutineCalendarView';
import { Colors } from '@/constants/colors';
import { formatCurrency } from '@/lib/utils';
import type { RoutineSubscriptionResponse, RoutineBookingResponse, RecurrenceDay } from '@/types/api';
import type { SubscriptionDetailState, SubscriptionDetailAction } from '@/reducers/subscription-detail.reducer';

const DAY_LABELS: Record<RecurrenceDay, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mié', THU: 'Jue', FRI: 'Vie', SAT: 'Sáb', SUN: 'Dom',
};

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

function dateToISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseISO(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

interface Props {
  uiState: SubscriptionDetailState;
  dispatch: React.Dispatch<SubscriptionDetailAction>;
  subscription: RoutineSubscriptionResponse;
  bookings: RoutineBookingResponse[];
  handlers: {
    handlePause: () => void;
    handleResume: () => void;
    handleCancel: () => void;
    handleOverridePickup: () => void;
    openPauseModal: () => void;
    openResumeModal: () => void;
    openCancelModal: () => void;
    openBookingDetail: (booking: RoutineBookingResponse) => void;
    closeModal: () => void;
  };
}

export function SubscriptionDetailView({ uiState, dispatch, subscription, bookings, handlers }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const now = useMemo(() => new Date(), []);

  const {
    activeModal, selectedBooking, isSubmitting,
    pauseFrom, pauseTo, pauseReason, hasPauseTo,
    showPauseFromPicker, showPauseToPicker,
    cancelReason, overrideName, overrideLat, overrideLng,
  } = uiState;

  const trip = subscription.routineTrip;
  const { status, subscribedDays, startDate, endDate, seatsRequired, pickupType, customPickupName } = subscription;

  const canPause = status === 'ACCEPTED';
  const canResume = status === 'PAUSED';
  const canCancel = status === 'PENDING' || status === 'ACCEPTED' || status === 'PAUSED';

  return (
    <View className="flex-1 bg-neutral-50" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-neutral-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={22} color={Colors.dark.DEFAULT} />
        </TouchableOpacity>
        <Text className="flex-1 text-base font-semibold text-neutral-900" numberOfLines={1}>
          {trip ? `${trip.originName} → ${trip.destinationName}` : 'Detalle de suscripción'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View className="bg-white px-4 py-4 border-b border-neutral-100">
          <SubscriptionStatusBadge status={status} showDescription />
        </View>

        {trip && (
          <View className="mx-4 mt-4">
            <Card>
              <CardHeader title="Ruta" />
              <View className="gap-3">
                <View className="flex-row items-start gap-2">
                  <MapPin size={15} color={Colors.primary[500]} />
                  <View className="flex-1">
                    <Text className="text-xs text-neutral-400">Origen</Text>
                    <Text className="text-sm font-medium text-neutral-800">{trip.originName}</Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-2">
                  <MapPin size={15} color={Colors.accent[500]} />
                  <View className="flex-1">
                    <Text className="text-xs text-neutral-400">Destino</Text>
                    <Text className="text-sm font-medium text-neutral-800">{trip.destinationName}</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  <Clock size={14} color={Colors.neutral[500]} />
                  <Text className="text-sm text-neutral-600">
                    {trip.departureTime} → {trip.requiredArrivalTime}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Calendar size={14} color={Colors.neutral[500]} />
                  <View className="flex-row flex-wrap gap-1">
                    {subscribedDays.map((d) => (
                      <View key={d} className="bg-primary-50 px-2 py-0.5 rounded-full">
                        <Text className="text-xs font-medium text-primary-700">{DAY_LABELS[d]}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </Card>
          </View>
        )}

        <View className="mx-4 mt-3">
          <Card>
            <CardHeader title="Detalles" />
            <View className="gap-3">
              <View className="flex-row items-start gap-2">
                <MapPin size={14} color={Colors.neutral[500]} />
                <View className="flex-1">
                  <Text className="text-xs text-neutral-400">Punto de recogida</Text>
                  <Text className="text-sm text-neutral-800">
                    {pickupType === 'WAYPOINT'
                      ? 'Parada predefinida de la ruta'
                      : pickupType === 'SUGGESTED' && customPickupName
                        ? customPickupName
                        : 'Origen de la ruta'}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-start gap-2">
                <Calendar size={14} color={Colors.neutral[500]} />
                <View className="flex-1">
                  <Text className="text-xs text-neutral-400">Período</Text>
                  <Text className="text-sm text-neutral-800">
                    Desde {formatDate(startDate)}
                    {endDate ? ` · Hasta ${formatDate(endDate)}` : ' · Sin fecha de fin'}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <User size={14} color={Colors.neutral[500]} />
                <Text className="text-sm text-neutral-700">
                  {seatsRequired} cupo{seatsRequired > 1 ? 's' : ''}
                  {trip
                    ? `  ·  ${formatCurrency(trip.pricePerSeat * seatsRequired, trip.currency)} / día`
                    : ''}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <View className="mx-4 mt-3">
          <Card>
            <CardHeader title="Próximos 14 días" />
            {bookings.length === 0 && status === 'PENDING' ? (
              <Text className="text-sm text-neutral-400 text-center py-2">
                Los bookings se generarán cuando el conductor acepte tu solicitud.
              </Text>
            ) : (
              <RoutineCalendarView
                bookings={bookings}
                daysAhead={14}
                onPressBooking={handlers.openBookingDetail}
              />
            )}
          </Card>
        </View>

        {(canPause || canResume || canCancel) && (
          <View className="mx-4 mt-4 gap-2">
            {canPause && (
              <Button
                variant="outline"
                icon={<Pause size={16} color={Colors.primary[600]} />}
                onPress={handlers.openPauseModal}
              >
                Pausar suscripción
              </Button>
            )}
            {canResume && (
              <Button
                variant="outline"
                icon={<Play size={16} color={Colors.semantic.success} />}
                onPress={handlers.openResumeModal}
              >
                Reactivar suscripción
              </Button>
            )}
            {canCancel && (
              <Button
                variant="danger"
                icon={<X size={16} color="#fff" />}
                onPress={handlers.openCancelModal}
              >
                Cancelar suscripción
              </Button>
            )}
          </View>
        )}
      </ScrollView>

      {/* Pause Modal */}
      <Modal
        visible={activeModal === 'pause'}
        transparent
        animationType="slide"
        onRequestClose={handlers.closeModal}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: Colors.overlay }}>
          <View className="bg-white rounded-t-3xl px-6 pt-5" style={{ paddingBottom: insets.bottom + 24 }}>
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
              <Button variant="outline" className="flex-1" onPress={handlers.closeModal}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={!pauseFrom || isSubmitting}
                loading={isSubmitting}
                onPress={handlers.handlePause}
              >
                Pausar
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Resume Modal */}
      <Modal
        visible={activeModal === 'resume'}
        transparent
        animationType="slide"
        onRequestClose={handlers.closeModal}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: Colors.overlay }}>
          <View className="bg-white rounded-t-3xl px-6 pt-5" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="w-10 h-1 rounded-full bg-neutral-300 self-center mb-5" />
            <Text className="text-lg font-bold text-neutral-900 mb-2">¿Reactivar suscripción?</Text>
            <Text className="text-sm text-neutral-500 mb-6">
              Se generarán nuevos bookings para las próximas ocurrencias.
            </Text>
            <View className="flex-row gap-3">
              <Button variant="outline" className="flex-1" onPress={handlers.closeModal}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={isSubmitting}
                loading={isSubmitting}
                onPress={handlers.handleResume}
              >
                Reactivar
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        visible={activeModal === 'cancel'}
        transparent
        animationType="slide"
        onRequestClose={handlers.closeModal}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: Colors.overlay }}>
          <View className="bg-white rounded-t-3xl px-6 pt-5" style={{ paddingBottom: insets.bottom + 24 }}>
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
              <Button variant="outline" className="flex-1" onPress={handlers.closeModal}>
                Volver
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={isSubmitting}
                loading={isSubmitting}
                onPress={handlers.handleCancel}
              >
                Cancelar suscripción
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Booking Detail Modal */}
      <Modal
        visible={activeModal === 'bookingDetail' && selectedBooking !== null}
        transparent
        animationType="slide"
        onRequestClose={handlers.closeModal}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: Colors.overlay }}>
          <View className="bg-white rounded-t-3xl px-6 pt-5" style={{ paddingBottom: insets.bottom + 24 }}>
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
                      Recogida estimada: {selectedBooking.estimatedPickupTime}
                    </Text>
                  </View>
                  {selectedBooking.pickupName && (
                    <View className="flex-row items-center gap-2">
                      <MapPin size={14} color={Colors.neutral[500]} />
                      <Text className="text-sm text-neutral-700">{selectedBooking.pickupName}</Text>
                    </View>
                  )}
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
                        onPress={handlers.handleOverridePickup}
                      >
                        Enviar cambio
                      </Button>
                    </View>
                  )}

                <Button variant="outline" onPress={handlers.closeModal}>
                  Cerrar
                </Button>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Date pickers */}
      <DatePickerModal
        visible={showPauseFromPicker}
        mode="date"
        value={pauseFrom ? parseISO(pauseFrom) : now}
        minimumDate={now}
        onConfirm={(d) => {
          dispatch({ type: 'SET_PAUSE_FROM', payload: dateToISO(d) });
          dispatch({ type: 'HIDE_PICKERS' });
        }}
        onCancel={() => dispatch({ type: 'HIDE_PICKERS' })}
      />
      <DatePickerModal
        visible={showPauseToPicker}
        mode="date"
        value={pauseTo ? parseISO(pauseTo) : now}
        minimumDate={pauseFrom ? parseISO(pauseFrom) : now}
        onConfirm={(d) => {
          dispatch({ type: 'SET_PAUSE_TO', payload: dateToISO(d) });
          dispatch({ type: 'HIDE_PICKERS' });
        }}
        onCancel={() => dispatch({ type: 'HIDE_PICKERS' })}
      />
    </View>
  );
}

interface LoadingProps {
  error: string | null;
}

export function SubscriptionDetailLoading() {
  return (
    <View className="flex-1 items-center justify-center bg-neutral-50">
      <Spinner />
    </View>
  );
}

export function SubscriptionDetailError({ error }: LoadingProps) {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center bg-neutral-50 px-6">
      <XCircle size={48} color={Colors.semantic.error} />
      <Text className="text-base font-semibold text-neutral-800 mt-3">Error al cargar</Text>
      <Text className="text-sm text-neutral-500 text-center mt-1">{error}</Text>
      <Button variant="outline" onPress={() => router.back()} className="mt-4">
        Volver
      </Button>
    </View>
  );
}
