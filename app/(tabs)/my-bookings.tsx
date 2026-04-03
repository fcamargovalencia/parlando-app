import React, { useCallback, useEffect, useReducer, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Ticket,
  Clock,
  DollarSign,
  ChevronRight,
} from 'lucide-react-native';
import { Screen, Badge, Card, EmptyState, Spinner, FilterTabs } from '@/components/ui';
import { TripTypeIcon } from '@/components/TripTypeIcon';
import { Colors } from '@/constants/colors';
import { BOOKING_STATUS_BADGE } from '@/constants/trips';
import { bookingsApi } from '@/api/bookings';
import { formatCurrency, getTripTypeLabel, formatDeparture } from '@/lib/utils';
import type { BookingResponse, BookingStatus } from '@/types/api';
import Toast from 'react-native-toast-message';



type FilterKey = 'active' | 'past';

const FILTERS: { key: FilterKey; label: string; statuses: BookingStatus[]; }[] = [
  { key: 'active', label: 'Activas', statuses: ['PENDING', 'ACCEPTED', 'BOARDED'] },
  { key: 'past', label: 'Pasadas', statuses: ['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'] },
];


// ── State ──

interface State {
  bookings: BookingResponse[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  cancelling: string | null;
}

type Action =
  | { type: 'FETCH_START'; refreshing?: boolean; }
  | { type: 'FETCH_SUCCESS'; payload: BookingResponse[]; }
  | { type: 'FETCH_ERROR'; payload: string; }
  | { type: 'CANCEL_START'; id: string; }
  | { type: 'CANCEL_SUCCESS'; id: string; }
  | { type: 'CANCEL_ERROR'; };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: !action.refreshing, refreshing: action.refreshing ?? false, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, refreshing: false, bookings: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, refreshing: false, error: action.payload };
    case 'CANCEL_START':
      return { ...state, cancelling: action.id };
    case 'CANCEL_SUCCESS':
      return {
        ...state,
        cancelling: null,
        bookings: state.bookings.map((b) =>
          b.id === action.id ? { ...b, status: 'CANCELLED' } : b,
        ),
      };
    case 'CANCEL_ERROR':
      return { ...state, cancelling: null };
  }
}

// ── Booking card ──

function BookingCard({
  booking,
  cancelling,
  onPress,
  onCancel,
}: {
  booking: BookingResponse;
  cancelling: boolean;
  onPress: () => void;
  onCancel: () => void;
}) {
  const config = BOOKING_STATUS_BADGE[booking.status];
  const trip = booking.trip;
  const canCancel = booking.status === 'PENDING' || booking.status === 'ACCEPTED';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Card className="mb-3">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-1.5">
            <TripTypeIcon type={trip?.tripType} size={14} />
            <Text className="text-xs font-medium text-neutral-500">
              {trip ? getTripTypeLabel(trip.tripType) : 'Viaje'}
            </Text>
          </View>
          <Badge label={config.label} variant={config.variant} />
        </View>

        {/* Route */}
        {trip && (
          <View className="flex-row items-start mb-3">
            <View className="items-center mr-3 pt-1">
              <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: Colors.primary[500] }} />
              <View className="w-0.5 h-5 my-1" style={{ backgroundColor: Colors.neutral[200] }} />
              <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: Colors.accent[500] }} />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                {trip.originName}
              </Text>
              <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                {trip.destinationName}
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.neutral[300]} />
          </View>
        )}

        {/* Meta */}
        <View className="flex-row flex-wrap gap-x-4 gap-y-1.5 mb-1">
          {trip && (
            <>
              <View className="flex-row items-center gap-1">
                <Clock size={13} color={Colors.neutral[400]} />
                <Text className="text-xs text-neutral-500">{formatDeparture(trip.departureAt)}</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <DollarSign size={13} color={Colors.neutral[400]} />
                <Text className="text-xs font-semibold text-neutral-700">
                  {formatCurrency(trip.pricePerSeat * booking.seatsBooked, trip.currency)}
                </Text>
              </View>
            </>
          )}
          <View className="flex-row items-center gap-1">
            <Text className="text-xs text-neutral-400">
              {booking.seatsBooked} {booking.seatsBooked === 1 ? 'asiento' : 'asientos'}
            </Text>
          </View>
        </View>

        {/* Cancel link */}
        {canCancel && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); onCancel(); }}
            disabled={cancelling}
            className="mt-2 self-start"
          >
            <Text className={`text-sm font-medium ${cancelling ? 'text-neutral-400' : 'text-red-500'}`}>
              {cancelling ? 'Cancelando...' : 'Cancelar reserva'}
            </Text>
          </TouchableOpacity>
        )}
      </Card>
    </TouchableOpacity>
  );
}

// ── Screen ──

export default function MyBookingsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('active');
  const [state, dispatch] = useReducer(reducer, {
    bookings: [],
    loading: true,
    refreshing: false,
    error: null,
    cancelling: null,
  });

  const load = useCallback(async (refreshing = false) => {
    dispatch({ type: 'FETCH_START', refreshing });
    try {
      const { data: res } = await bookingsApi.getMine();
      const rawData = (res as any)?.data;
      const bookings: BookingResponse[] = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(rawData?.content)
            ? rawData.content
            : [];
      dispatch({ type: 'FETCH_SUCCESS', payload: bookings });
    } catch (err: any) {
      dispatch({ type: 'FETCH_ERROR', payload: err?.response?.data?.message ?? 'Error al cargar tus reservas' });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = (booking: BookingResponse) => {
    const origin = booking.trip?.originName ?? '–';
    const dest = booking.trip?.destinationName ?? '–';
    Alert.alert(
      'Cancelar reserva',
      `¿Seguro que quieres cancelar tu reserva de ${origin} a ${dest}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            dispatch({ type: 'CANCEL_START', id: booking.id });
            try {
              await bookingsApi.cancel(booking.id);
              dispatch({ type: 'CANCEL_SUCCESS', id: booking.id });
              Toast.show({ type: 'success', text1: 'Reserva cancelada' });
            } catch (err: any) {
              dispatch({ type: 'CANCEL_ERROR' });
              Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo cancelar la reserva');
            }
          },
        },
      ],
    );
  };

  const filtered = state.bookings
    .filter((b) => FILTERS.find((f) => f.key === activeFilter)!.statuses.includes(b.status))
    .sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return activeFilter === 'active' ? db - da : db - da;
    });

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <Text className="text-2xl font-bold text-neutral-900">Mis reservas</Text>
        <Text className="text-sm text-neutral-500 mt-1">Cupos que has solicitado como pasajero</Text>
      </View>

      {/* Filter tabs */}
      <FilterTabs
        tabs={FILTERS.map((f) => ({
          key: f.key,
          label: f.label,
          count: state.bookings.filter((b) => f.statuses.includes(b.status)).length,
        }))}
        active={activeFilter}
        onSelect={setActiveFilter}
      />

      {/* Content */}
      {state.loading ? (
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      ) : state.error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-neutral-500 text-center mb-3">{state.error}</Text>
          <TouchableOpacity onPress={() => load()}>
            <Text className="text-sm font-semibold text-primary-600">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          contentContainerClassName="px-6 pb-8"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={state.refreshing} onRefresh={() => load(true)} tintColor={Colors.primary[500]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Ticket size={56} color={Colors.neutral[300]} />}
              title={activeFilter === 'active' ? 'Sin reservas activas' : 'Sin reservas pasadas'}
              description={
                activeFilter === 'active'
                  ? 'Busca un viaje y reserva tu cupo.'
                  : 'Aquí aparecerán tus reservas completadas o canceladas.'
              }
              actionLabel={activeFilter === 'active' ? 'Buscar viaje' : undefined}
              onAction={activeFilter === 'active' ? () => router.push('/(tabs)/home') : undefined}
            />
          }
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              cancelling={state.cancelling === item.id}
              onPress={() => item.trip && router.push({ pathname: '/trip/[id]', params: { id: item.tripId } })}
              onCancel={() => handleCancel(item)}
            />
          )}
        />
      )}
    </Screen>
  );
}
