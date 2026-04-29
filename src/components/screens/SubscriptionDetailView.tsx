import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
import { PauseModal } from '@/components/subscription/PauseModal';
import { ResumeModal } from '@/components/subscription/ResumeModal';
import { CancelModal } from '@/components/subscription/CancelModal';
import { BookingDetailModal } from '@/components/subscription/BookingDetailModal';
import { Colors } from '@/constants/colors';
import { formatCurrency } from '@/lib/utils';
import type { RoutineSubscriptionResponse, RoutineBookingResponse, RecurrenceDay } from '@/types/api';
import type { SubscriptionDetailState, SubscriptionDetailAction } from '@/reducers/subscription-detail.reducer';

const DAY_LABELS: Record<RecurrenceDay, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mié', THU: 'Jue', FRI: 'Vie', SAT: 'Sáb', SUN: 'Dom',
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

      <PauseModal
        visible={activeModal === 'pause'}
        hasPauseTo={hasPauseTo}
        pauseFrom={pauseFrom}
        pauseTo={pauseTo}
        pauseReason={pauseReason}
        isSubmitting={isSubmitting}
        bottomInset={insets.bottom}
        dispatch={dispatch}
        onClose={handlers.closeModal}
        onConfirm={handlers.handlePause}
      />

      <ResumeModal
        visible={activeModal === 'resume'}
        isSubmitting={isSubmitting}
        bottomInset={insets.bottom}
        onClose={handlers.closeModal}
        onConfirm={handlers.handleResume}
      />

      <CancelModal
        visible={activeModal === 'cancel'}
        isSubmitting={isSubmitting}
        cancelReason={cancelReason}
        bottomInset={insets.bottom}
        dispatch={dispatch}
        onClose={handlers.closeModal}
        onConfirm={handlers.handleCancel}
      />

      <BookingDetailModal
        visible={activeModal === 'bookingDetail' && selectedBooking !== null}
        selectedBooking={selectedBooking}
        isSubmitting={isSubmitting}
        overrideName={overrideName}
        overrideLat={overrideLat}
        overrideLng={overrideLng}
        bottomInset={insets.bottom}
        dispatch={dispatch}
        onClose={handlers.closeModal}
        onOverride={handlers.handleOverridePickup}
      />

      {/* Date pickers */}
      <DatePickerModal
        visible={showPauseFromPicker}
        mode="date"
        title="Pausar desde"
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
        title="Pausar hasta"
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
