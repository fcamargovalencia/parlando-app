import React, { useCallback, useEffect, useReducer } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Route,
  Clock,
  Users,
  DollarSign,
  MapPin,
  Luggage,
  GraduationCap as StudentsIcon,
  Star,
} from 'lucide-react-native';
import { Screen, Badge, Card, EmptyState, Spinner, FilterTabs } from '@/components/ui';
import { TripTypeIcon } from '@/components/TripTypeIcon';
import { Colors } from '@/constants/colors';
import { TRIP_STATUS_BADGE } from '@/constants/trips';
import { tripsApi } from '@/api/trips';
import { formatCurrency, getTripTypeLabel, formatDeparture } from '@/lib/utils';
import type { TripResponse, TripStatus } from '@/types/api';
import Toast from 'react-native-toast-message';

// ── Filters ──

type FilterKey = 'active' | 'past' | 'cancelled';

const FILTERS: { key: FilterKey; label: string; statuses: TripStatus[]; }[] = [
  { key: 'active', label: 'Activos', statuses: ['DRAFT', 'PUBLISHED', 'IN_PROGRESS'] },
  { key: 'past', label: 'Pasados', statuses: ['COMPLETED'] },
  { key: 'cancelled', label: 'Cancelados', statuses: ['CANCELLED'] },
];

// ── State ──

interface State {
  trips: TripResponse[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  cancelling: string | null; // trip id being cancelled
}

type Action =
  | { type: 'FETCH_START'; refreshing?: boolean; }
  | { type: 'FETCH_SUCCESS'; payload: TripResponse[]; }
  | { type: 'FETCH_ERROR'; payload: string; }
  | { type: 'CANCEL_START'; id: string; }
  | { type: 'CANCEL_SUCCESS'; id: string; }
  | { type: 'CANCEL_ERROR'; };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        loading: !action.refreshing,
        refreshing: action.refreshing ?? false,
        error: null,
      };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, refreshing: false, trips: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, refreshing: false, error: action.payload };
    case 'CANCEL_START':
      return { ...state, cancelling: action.id };
    case 'CANCEL_SUCCESS':
      return {
        ...state,
        cancelling: null,
        trips: state.trips.map((t) =>
          t.id === action.id ? { ...t, status: 'CANCELLED' } : t,
        ),
      };
    case 'CANCEL_ERROR':
      return { ...state, cancelling: null };
  }
}



// ── Trip Card ──

interface TripCardProps {
  trip: TripResponse;
  cancelling: boolean;
  onPress: () => void;
  onCancel: () => void;
  onRatePassengers: () => void;
}

function TripCard({ trip, cancelling, onPress, onCancel, onRatePassengers }: TripCardProps) {
  const badge = TRIP_STATUS_BADGE[trip.status] ?? { label: trip.status, variant: 'neutral' as const };
  const canCancel = trip.status === 'DRAFT' || trip.status === 'PUBLISHED';
  const stopCount = trip.waypoints?.filter((w) => w.isPickupPoint).length ?? 0;
  const isCompleted = trip.status === 'COMPLETED';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card className="mb-3">
        {/* Top row: type + badge */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-1.5">
            <TripTypeIcon type={trip.tripType} size={16} />
            <Text className="text-sm font-medium text-neutral-600">
              {getTripTypeLabel(trip.tripType)}
            </Text>
          </View>
          <Badge label={badge.label} variant={badge.variant} />
        </View>

        {/* Route */}
        <View className="flex-row items-start mb-3">
          <View className="items-center mr-3 pt-1">
            <View className="w-2.5 h-2.5 rounded-full bg-primary-500" />
            <View className="w-0.5 h-8 bg-neutral-200 my-1" />
            <View className="w-2.5 h-2.5 rounded-full bg-accent-500" />
          </View>
          <View className="flex-1 gap-3">
            <View>
              <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
                {trip.originName}
              </Text>
              {!!trip.originSubtitle && (
                <Text className="text-sm text-neutral-500" numberOfLines={1}>
                  {trip.originSubtitle}
                </Text>
              )}
            </View>
            <View>
              <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
                {trip.destinationName}
              </Text>
              {!!trip.destinationSubtitle && (
                <Text className="text-sm text-neutral-500" numberOfLines={1}>
                  {trip.destinationSubtitle}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Meta row */}
        <View className="flex-row flex-wrap mb-3 -mx-1">
          <View className="w-1/2 px-1 mb-2 flex-row items-center gap-1">
            <Clock size={14} color={Colors.neutral[400]} />
            <Text className="text-sm text-neutral-600">{formatDeparture(trip.departureAt)}</Text>
          </View>
          <View className="w-1/2 px-1 mb-2 flex-row items-center gap-1">
            <Users size={14} color={Colors.neutral[400]} />
            <Text className="text-sm text-neutral-600">
              {trip.availableSeats} asientos
            </Text>
          </View>
          <View className="w-1/2 px-1 mb-2 flex-row items-center gap-1">
            <DollarSign size={14} color={Colors.neutral[400]} />
            <Text className="text-sm text-neutral-600">
              {formatCurrency(trip.pricePerSeat, trip.currency)} / asiento
            </Text>
          </View>
          {stopCount > 0 && (
            <View className="w-1/2 px-1 mb-2 flex-row items-center gap-1">
              <MapPin size={14} color={Colors.neutral[400]} />
              <Text className="text-sm text-neutral-600">
                {stopCount} {stopCount === 1 ? 'parada' : 'paradas'}
              </Text>
            </View>
          )}
          {trip.allowsLuggage && (
            <View className="w-1/2 px-1 mb-2 flex-row items-center gap-1">
              <Luggage size={14} color={Colors.neutral[400]} />
              <Text className="text-sm text-neutral-600">Equipaje permitido</Text>
            </View>
          )}
          {trip.studentsOnly && (
            <View className="w-1/2 px-1 mb-2 flex-row items-center gap-1">
              <StudentsIcon size={14} color="#3B82F6" />
              <Text className="text-sm text-blue-500">Solo estudiantes</Text>
            </View>
          )}
        </View>

        {/* Footer actions */}
        {(canCancel || isCompleted) && (
          <View className="flex-row items-center justify-between mt-1 pt-3 border-t border-neutral-100">
            {canCancel ? (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); onCancel(); }}
                disabled={cancelling}
              >
                <Text className={`text-sm font-medium ${cancelling ? 'text-neutral-400' : 'text-red-500'}`}>
                  {cancelling ? 'Cancelando...' : 'Cancelar viaje'}
                </Text>
              </TouchableOpacity>
            ) : <View />}

            {isCompleted && (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); onRatePassengers(); }}
                className="flex-row items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full"
                style={{ borderWidth: 1, borderColor: '#FDE68A' }}
              >
                <Star size={13} color="#F59E0B" fill="#F59E0B" />
                <Text className="text-sm font-semibold text-amber-600">
                  Calificar pasajeros
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

// ── Screen ──

export default function MyTripsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = React.useState<FilterKey>('active');
  const [state, dispatch] = useReducer(reducer, {
    trips: [],
    loading: true,
    refreshing: false,
    error: null,
    cancelling: null,
  });

  const load = useCallback(async (refreshing = false) => {
    dispatch({ type: 'FETCH_START', refreshing });
    try {
      const { data: res } = await tripsApi.getMine();
      const rawData = (res as any)?.data;
      const baseTrips: TripResponse[] = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(rawData?.content)
            ? rawData.content
            : [];

      // Some backends omit waypoints in /v1/trips/me, so hydrate them per trip.
      const trips = await Promise.all(
        baseTrips.map(async (trip) => {
          if (Array.isArray(trip.waypoints)) return trip;
          try {
            const { data: wpRes } = await tripsApi.getWaypoints(trip.id);
            const rawWp = (wpRes as any)?.data;
            const waypoints = Array.isArray(rawWp)
              ? rawWp
              : Array.isArray(rawWp?.data)
                ? rawWp.data
                : Array.isArray(rawWp?.content)
                  ? rawWp.content
                  : [];
            return { ...trip, waypoints };
          } catch {
            return trip;
          }
        }),
      );

      dispatch({ type: 'FETCH_SUCCESS', payload: trips });
    } catch (err: any) {
      dispatch({
        type: 'FETCH_ERROR',
        payload: err?.response?.data?.message ?? 'Error al cargar tus viajes',
      });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  const handleCancel = (trip: TripResponse) => {
    Alert.alert(
      'Cancelar viaje',
      `¿Seguro que quieres cancelar el viaje de ${trip.originName} a ${trip.destinationName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            dispatch({ type: 'CANCEL_START', id: trip.id });
            try {
              await tripsApi.cancel(trip.id);
              dispatch({ type: 'CANCEL_SUCCESS', id: trip.id });
              Toast.show({ type: 'success', text1: 'Viaje cancelado' });
            } catch (err: any) {
              dispatch({ type: 'CANCEL_ERROR' });
              Alert.alert(
                'Error',
                err?.response?.data?.message ?? 'No se pudo cancelar el viaje',
              );
            }
          },
        },
      ],
    );
  };

  const filteredTrips = state.trips.filter((t) =>
    FILTERS.find((f) => f.key === activeFilter)!.statuses.includes(t.status),
  );

  // Sort: upcoming by closest departure, past/cancelled by most recent first
  const sortedTrips = [...filteredTrips].sort((a, b) => {
    const da = new Date(a.departureAt).getTime();
    const db = new Date(b.departureAt).getTime();
    return activeFilter === 'active' ? da - db : db - da;
  });

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <Text className="text-2xl font-bold text-neutral-900">Mis viajes</Text>
        <Text className="text-sm text-neutral-500 mt-1">
          Viajes que has publicado como conductor
        </Text>
      </View>

      {/* Filter tabs */}
      <FilterTabs
        tabs={FILTERS.map((f) => ({
          key: f.key,
          label: f.label,
          count: state.trips.filter((t) => f.statuses.includes(t.status)).length,
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
          data={sortedTrips}
          keyExtractor={(t) => t.id}
          contentContainerClassName="px-4 pb-8"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={() => load(true)}
              tintColor={Colors.primary[500]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Route size={56} color={Colors.neutral[300]} />}
              title={
                activeFilter === 'active'
                  ? 'Sin viajes activos'
                  : activeFilter === 'past'
                    ? 'Sin viajes completados'
                    : 'Sin viajes cancelados'
              }
              description={
                activeFilter === 'active'
                  ? 'Publica tu primer viaje y empieza a ganar dinero viajando.'
                  : 'Aquí aparecerán tus viajes una vez finalicen.'
              }
              actionLabel={activeFilter === 'active' ? 'Publicar viaje' : undefined}
              onAction={
                activeFilter === 'active' ? () => router.push('/(tabs)/publish') : undefined
              }
            />
          }
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              cancelling={state.cancelling === item.id}
              onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.id } })}
              onCancel={() => handleCancel(item)}
              onRatePassengers={() => router.push({ pathname: '/trip/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}
    </Screen>
  );
}
