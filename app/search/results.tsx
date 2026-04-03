import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Luggage,
  ChevronRight,
  Search,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Card, Spinner } from '@/components/ui';
import { TripTypeIcon } from '@/components/TripTypeIcon';
import { Colors, Shadows } from '@/constants/colors';
import { tripsApi } from '@/api/trips';
import { formatCurrency, getTripTypeLabel, formatDeparture } from '@/lib/utils';
import type { TripResponse } from '@/types/api';
import dayjs from 'dayjs';

// ── Helpers ──

function fmtArrival(iso: string) {
  return dayjs(iso).format('h:mm A');
}

// ── Trip card ──

function TripCard({ trip, onPress }: { trip: TripResponse; onPress: () => void; }) {
  const noSeats = trip.availableSeats === 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} disabled={noSeats}>
      <Card className="mb-3" style={noSeats ? { opacity: 0.55 } : undefined}>
        {/* Header: Trip type and badges */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-1.5">
            <TripTypeIcon type={trip.tripType} />
            <Text className="text-xs font-medium text-neutral-500">
              {getTripTypeLabel(trip.tripType)}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {noSeats && <Badge label="Sin cupos" variant="error" />}
            {trip.studentsOnly && <Badge label="Estudiantes" variant="info" />}
          </View>
        </View>

        {/* Driver info - prominent at top */}
        {trip.driver && (
          <View className="flex-row items-center gap-2 mb-2 pb-2 border-b border-neutral-100">
            <View className="w-7 h-7 rounded-full bg-primary-100 items-center justify-center">
              <Text className="text-xs font-bold text-primary-700">
                {trip.driver.firstName.charAt(0)}{trip.driver.lastName.charAt(0)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-neutral-700 font-semibold">
                {trip.driver.firstName} {trip.driver.lastName}
              </Text>
            </View>
            <View className="flex-row items-center gap-0.5">
              <Text className="text-xs">⭐</Text>
              <Text className="text-xs font-medium text-neutral-600">{trip.driver.trustScore.toFixed(1)}</Text>
            </View>
          </View>
        )}

        {/* Route with locations */}
        <View className="flex-row items-start mb-3">
          <View className="items-center mr-3 pt-1">
            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: Colors.primary[500] }} />
            <View className="w-0.5 h-12 my-1" style={{ backgroundColor: Colors.neutral[200] }} />
            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: Colors.accent[500] }} />
          </View>
          <View className="flex-1 gap-2">
            {/* Origin */}
            <View>
              <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                {trip.originName}
              </Text>
              <Text className="text-xs text-neutral-500" numberOfLines={1}>
                {trip.originSubtitle}
              </Text>
            </View>
            {/* Destination */}
            <View>
              <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                {trip.destinationName}
              </Text>
              <Text className="text-xs text-neutral-500" numberOfLines={1}>
                {trip.destinationSubtitle}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={Colors.neutral[300]} />
        </View>

        {/* Time and basic info */}
        <View className="flex-row flex-wrap gap-x-4 gap-y-1.5 mb-2">
          <View className="flex-row items-center gap-1">
            <Clock size={13} color={Colors.neutral[400]} />
            <Text className="text-xs text-neutral-500">{formatDeparture(trip.departureAt)}</Text>
          </View>
          {trip.estimatedArrivalTime && (
            <View className="flex-row items-center gap-1">
              <Clock size={13} color={Colors.accent[400]} />
              <Text className="text-xs text-neutral-500">
                Llega: {fmtArrival(trip.estimatedArrivalTime)}
              </Text>
            </View>
          )}
          <View className="flex-row items-center gap-1">
            <Users size={13} color={Colors.neutral[400]} />
            <Text className="text-xs text-neutral-500">
              {trip.availableSeats} {trip.availableSeats === 1 ? 'cupo' : 'cupos'}
            </Text>
          </View>
        </View>

        {/* Stops, price, luggage row */}
        <View className="flex-row flex-wrap gap-x-4 gap-y-1.5">
          {trip.waypoints && trip.waypoints.length > 0 && (
            <View className="flex-row items-center gap-1">
              <MapPin size={13} color={Colors.neutral[400]} />
              <Text className="text-xs text-neutral-500">
                {trip.waypoints.filter((w) => w.isPickupPoint).length}{' '}
                {trip.waypoints.filter((w) => w.isPickupPoint).length === 1 ? 'parada' : 'paradas'}
              </Text>
            </View>
          )}
          <View className="flex-row items-center gap-1">
            <DollarSign size={13} color={Colors.neutral[400]} />
            <Text className="text-xs font-semibold text-neutral-700">
              {formatCurrency(trip.pricePerSeat, trip.currency)}
            </Text>
          </View>
          {trip.allowsLuggage && (
            <View className="flex-row items-center gap-1">
              <Luggage size={13} color={Colors.neutral[400]} />
              <Text className="text-xs text-neutral-500">Equipaje</Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ── Empty state ──

function EmptyResults({ onBack }: { onBack: () => void; }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16 gap-4">
      <View className="w-20 h-20 rounded-full bg-neutral-100 items-center justify-center mb-2">
        <Search size={36} color={Colors.neutral[300]} />
      </View>
      <Text className="text-lg font-bold text-neutral-800 text-center">
        Sin resultados
      </Text>
      <Text className="text-sm text-neutral-500 text-center leading-5">
        No encontramos viajes para esa ruta y fecha. Intenta ampliar el radio de búsqueda o cambiar la fecha.
      </Text>
      <TouchableOpacity onPress={onBack} activeOpacity={0.8}
        className="mt-2 px-6 py-3 rounded-2xl"
        style={{ backgroundColor: Colors.primary[600] }}
      >
        <Text className="text-white font-semibold text-sm">Modificar búsqueda</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Screen ──

export default function SearchResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    originLat: string;
    originLng: string;
    originName: string;
    destLat: string;
    destLng: string;
    destName: string;
    departureFrom: string;
    departureTo: string;
    tripType: string;
  }>();

  // Extract primitives once so useCallback/useEffect deps are stable.
  // useLocalSearchParams() returns a new object reference every render,
  // which would otherwise cause an infinite fetch loop.
  const originLat = params.originLat;
  const originLng = params.originLng;
  const destLat = params.destLat;
  const destLng = params.destLng;
  const departureFrom = params.departureFrom;
  const departureTo = params.departureTo;
  const tripType = params.tripType;

  const [trips, setTrips] = useState<TripResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 10;
  const RADIUS_KM = 15;

  const fetchPage = useCallback(async (p: number, replace = false) => {
    try {
      const { data: res } = await tripsApi.search({
        originLat: parseFloat(originLat),
        originLng: parseFloat(originLng),
        destLat: parseFloat(destLat),
        destLng: parseFloat(destLng),
        departureFrom,
        departureTo,
        tripType: tripType as any,
        radiusKm: RADIUS_KM,
        page: p,
        size: PAGE_SIZE,
      });
      const result = res.data;
      if (!result) throw new Error('Sin datos');

      setTrips((prev) => replace ? result.content : [...prev, ...result.content]);
      setHasMore(!result.last);
      setPage(p);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo cargar la búsqueda');
    }
  }, [originLat, originLng, destLat, destLng, departureFrom, departureTo, tripType]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchPage(0, true);
    setLoading(false);
  }, [fetchPage]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchPage(0, true);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchPage(page + 1);
    setLoadingMore(false);
  };

  useEffect(() => { load(); }, [load]);

  const departure = dayjs(params.departureFrom);
  const dateLabel = departure.isSame(dayjs(), 'day')
    ? 'Hoy'
    : departure.isSame(dayjs().add(1, 'day'), 'day')
      ? 'Mañana'
      : departure.format('D MMM');

  return (
    <View className="flex-1 bg-neutral-50">
      {/* Header */}
      <View
        className="bg-white border-b border-neutral-100"
        style={{ paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16, ...Shadows.sm }}
      >
        <View className="flex-row items-center gap-3 mb-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 items-center justify-center rounded-full bg-neutral-100"
          >
            <ArrowLeft size={20} color={Colors.neutral[700]} />
          </TouchableOpacity>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: Colors.primary[500] }} />
              <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                {params.originName}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: Colors.accent[500] }} />
              <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                {params.destName}
              </Text>
            </View>
          </View>
        </View>
        <View className="flex-row items-center gap-2 ml-12">
          <View className="flex-row items-center gap-1 bg-neutral-100 rounded-full px-3 py-1">
            <Clock size={12} color={Colors.neutral[500]} />
            <Text className="text-xs font-medium text-neutral-600">{dateLabel}</Text>
          </View>
          <View className="flex-row items-center gap-1 bg-neutral-100 rounded-full px-3 py-1">
            <MapPin size={12} color={Colors.neutral[500]} />
            <Text className="text-xs font-medium text-neutral-600">Radio {RADIUS_KM} km</Text>
          </View>
          {!loading && (
            <View className="flex-row items-center gap-1 bg-primary-50 rounded-full px-3 py-1">
              <Text className="text-xs font-semibold text-primary-700">{trips.length} viajes</Text>
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Spinner />
          <Text className="text-sm text-neutral-400 mt-3">Buscando viajes...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <Text className="text-sm text-neutral-500 text-center">{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text className="text-sm font-semibold text-primary-600">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary[500]} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyResults onBack={() => router.back()} />}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color={Colors.primary[500]} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}
    </View>
  );
}
