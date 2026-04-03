import React, { useCallback, useEffect, useReducer } from 'react';
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
  Route,
  Clock,
  Users,
  DollarSign,
  ChevronRight,
  Bus,
  Building2,
  GraduationCap,
  Luggage,
  GraduationCap as StudentsIcon,
} from 'lucide-react-native';
import { Screen, Badge, Card, EmptyState, Spinner } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { tripsApi } from '@/api/trips';
import { formatCurrency, getTripTypeLabel } from '@/lib/utils';
import type { TripResponse, TripStatus } from '@/types/api';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

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

// ── Helpers ──

const TRIP_TYPE_ICON: Record<string, React.ReactNode> = {
  INTERCITY: <Bus size={16} color={Colors.primary[600]} />,
  URBAN: <Building2 size={16} color={Colors.accent[600]} />,
  ROUTINE: <GraduationCap size={16} color="#3B82F6" />,
};

const STATUS_BADGE: Record<TripStatus, { label: string; variant: 'success' | 'warning' | 'info' | 'error' | 'neutral'; }> = {
  DRAFT: { label: 'Borrador', variant: 'neutral' },
  PUBLISHED: { label: 'Publicado', variant: 'success' },
  IN_PROGRESS: { label: 'En curso', variant: 'info' },
  COMPLETED: { label: 'Completado', variant: 'success' },
  CANCELLED: { label: 'Cancelado', variant: 'error' },
};

function fmtDeparture(iso: string) {
  const d = dayjs(iso);
  const today = dayjs();
  if (d.isSame(today, 'day')) return `Hoy, ${d.format('h:mm A')}`;
  if (d.isSame(today.add(1, 'day'), 'day')) return `Mañana, ${d.format('h:mm A')}`;
  return d.format('D MMM, h:mm A');
}

// ── Trip Card ──

interface TripCardProps {
  trip: TripResponse;
  cancelling: boolean;
  onPress: () => void;
  onCancel: () => void;
}

function TripCard({ trip, cancelling, onPress, onCancel }: TripCardProps) {
  const badge = STATUS_BADGE[trip.status] ?? { label: trip.status, variant: 'neutral' as const };
  const canCancel = trip.status === 'DRAFT' || trip.status === 'PUBLISHED';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card className="mb-3">
        {/* Top row: type + badge */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-1.5">
            {TRIP_TYPE_ICON[trip.tripType]}
            <Text className="text-xs font-medium text-neutral-500">
              {getTripTypeLabel(trip.tripType)}
            </Text>
          </View>
          <Badge label={badge.label} variant={badge.variant} />
        </View>

        {/* Route */}
        <View className="flex-row items-start mb-3">
          <View className="items-center mr-3 pt-1">
            <View className="w-2.5 h-2.5 rounded-full bg-primary-500" />
            <View className="w-0.5 h-5 bg-neutral-200 my-1" />
            <View className="w-2.5 h-2.5 rounded-full bg-accent-500" />
          </View>
          <View className="flex-1 gap-1">
            <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
              {trip.originName}
            </Text>
            <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
              {trip.destinationName}
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.neutral[300]} className="mt-1" />
        </View>

        {/* Meta row */}
        <View className="flex-row flex-wrap gap-x-4 gap-y-1.5 mb-3">
          <View className="flex-row items-center gap-1">
            <Clock size={13} color={Colors.neutral[400]} />
            <Text className="text-xs text-neutral-500">{fmtDeparture(trip.departureAt)}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Users size={13} color={Colors.neutral[400]} />
            <Text className="text-xs text-neutral-500">
              {trip.availableSeats} asientos
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <DollarSign size={13} color={Colors.neutral[400]} />
            <Text className="text-xs text-neutral-500">
              {formatCurrency(trip.pricePerSeat, trip.currency)} / asiento
            </Text>
          </View>
          {trip.allowsLuggage && (
            <View className="flex-row items-center gap-1">
              <Luggage size={13} color={Colors.neutral[400]} />
              <Text className="text-xs text-neutral-500">Equipaje permitido</Text>
            </View>
          )}
          {trip.studentsOnly && (
            <View className="flex-row items-center gap-1">
              <StudentsIcon size={13} color="#3B82F6" />
              <Text className="text-xs text-blue-500">Solo estudiantes</Text>
            </View>
          )}
        </View>

        {/* Cancel shortcut */}
        {canCancel && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); onCancel(); }}
            disabled={cancelling}
            className="mt-1 self-start"
          >
            <Text className={`text-sm font-medium ${cancelling ? 'text-neutral-400' : 'text-red-500'}`}>
              {cancelling ? 'Cancelando...' : 'Cancelar viaje'}
            </Text>
          </TouchableOpacity>
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
      dispatch({ type: 'FETCH_SUCCESS', payload: res.data ?? [] });
    } catch (err: any) {
      dispatch({
        type: 'FETCH_ERROR',
        payload: err?.response?.data?.message ?? 'Error al cargar tus viajes',
      });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
      <View className="flex-row px-6 mt-3 mb-4 gap-2">
        {FILTERS.map((f) => {
          const count = state.trips.filter((t) => f.statuses.includes(t.status)).length;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              className={`flex-row items-center px-4 py-2 rounded-full ${activeFilter === f.key ? 'bg-primary-500' : 'bg-neutral-100'
                }`}
            >
              <Text
                className={`text-sm font-medium ${activeFilter === f.key ? 'text-white' : 'text-neutral-600'
                  }`}
              >
                {f.label}
              </Text>
              {count > 0 && (
                <View
                  className={`ml-1.5 w-5 h-5 rounded-full items-center justify-center ${activeFilter === f.key ? 'bg-white/30' : 'bg-neutral-200'
                    }`}
                >
                  <Text
                    className={`text-xs font-bold ${activeFilter === f.key ? 'text-white' : 'text-neutral-600'
                      }`}
                  >
                    {count > 9 ? '9+' : count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

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
          contentContainerClassName="px-6 pb-8"
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
            />
          )}
        />
      )}
    </Screen>
  );
}
