import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { ChevronLeft, MapPin, Search, SlidersHorizontal } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { DaySelector } from '@/components/routine/DaySelector';
import { RoutineTripCard } from '@/components/routine/RoutineTripCard';
import { RoutineRouteMapModal } from '@/components/routine/RoutineRouteMapModal';
import { UniversityPicker } from '@/components/university/UniversityPicker';
import { DatePickerModal, EmptyState, Spinner } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { universitiesApi } from '@/api/universities';
import { useSearchRoutineTrips } from '@/hooks/useSearchRoutineTrips';
import type { RecurrenceDay, RoutineTripSearchResult, UniversityResponse } from '@/types/api';

const WALK_DISTANCE_STEPS = [250, 500, 750, 1000, 1500, 2000];

export default function RoutineSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    originLat, originLng, originName,
    destLat, destLng, destName,
    universityId: initialUniversityId,
  } = useLocalSearchParams<{
    originLat?: string; originLng?: string; originName?: string;
    destLat?: string; destLng?: string; destName?: string;
    universityId?: string;
  }>();

  const { params, setParams, results, isLoading, error, search, hasSearched } =
    useSearchRoutineTrips();

  // Pre-populate from home search params
  React.useEffect(() => {
    const updates: Partial<typeof params> = {};
    if (originLat && originLng) {
      updates.passengerLat = parseFloat(originLat);
      updates.passengerLng = parseFloat(originLng);
      updates.maxWalkDistanceMeters = WALK_DISTANCE_STEPS[1];
    }
    if (destLat && destLng) {
      updates.destinationLat = parseFloat(destLat);
      updates.destinationLng = parseFloat(destLng);
      updates.destinationRadiusMeters = 1000;
    }
    if (Object.keys(updates).length > 0) setParams((prev) => ({ ...prev, ...updates }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-populate university from home search params
  React.useEffect(() => {
    if (!initialUniversityId) return;
    universitiesApi.getById(initialUniversityId).then((res) => {
      const uni = res.data.data;
      if (!uni) return;
      setSelectedUniversityLabel(uni.name);
      setParams((prev) => ({
        ...prev,
        universityId: uni.id,
        destinationLat: uni.latitude,
        destinationLng: uni.longitude,
        destinationRadiusMeters: 500,
      }));
    }).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasPrefilledRoute = !!(originName && destName);

  // UI state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedUniversityLabel, setSelectedUniversityLabel] = useState<string | undefined>();
  const [nearMe, setNearMe] = useState(false);
  const [walkDistanceIndex, setWalkDistanceIndex] = useState(1); // default 500m
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedRouteTrip, setSelectedRouteTrip] = useState<RoutineTripSearchResult | null>(null);

  // Derived — time value as Date for the picker
  const arrivalTimeDate = React.useMemo(() => {
    if (!params.requiredArrivalBefore) return new Date();
    const [h, m] = params.requiredArrivalBefore.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }, [params.requiredArrivalBefore]);

  const canSearch =
    (!!params.universityId || (!!params.destinationLat && !!params.destinationLng)) &&
    (params.days?.length ?? 0) > 0 &&
    !!params.requiredArrivalBefore;

  const handleUniversityChange = useCallback(
    (id: string, university: UniversityResponse | null) => {
      setSelectedUniversityLabel(university?.name);
      if (university) {
        setParams((prev) => ({
          ...prev,
          universityId: id,
          destinationLat: university.latitude,
          destinationLng: university.longitude,
          destinationRadiusMeters: 500,
        }));
      } else {
        setParams((prev) => {
          const next = { ...prev };
          delete next.universityId;
          delete next.destinationLat;
          delete next.destinationLng;
          delete next.destinationRadiusMeters;
          return next;
        });
      }
    },
    [setParams],
  );

  const handleDaysChange = useCallback(
    (days: RecurrenceDay[]) => {
      setParams((prev) => ({ ...prev, days }));
    },
    [setParams],
  );

  const handleArrivalTimeConfirm = useCallback(
    (date: Date) => {
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      setParams((prev) => ({ ...prev, requiredArrivalBefore: `${hh}:${mm}` }));
      setShowTimePicker(false);
    },
    [setParams],
  );

  const toggleNearMe = useCallback(async () => {
    if (nearMe) {
      setNearMe(false);
      setLocationError(null);
      setParams((prev) => {
        const next = { ...prev };
        delete next.passengerLat;
        delete next.passengerLng;
        delete next.maxWalkDistanceMeters;
        return next;
      });
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationError('Permiso de ubicación denegado.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setNearMe(true);
    setLocationError(null);
    setParams((prev) => ({
      ...prev,
      passengerLat: loc.coords.latitude,
      passengerLng: loc.coords.longitude,
      maxWalkDistanceMeters: WALK_DISTANCE_STEPS[walkDistanceIndex],
    }));
  }, [nearMe, walkDistanceIndex, setParams]);

  const handleWalkDistanceChange = useCallback(
    (index: number) => {
      setWalkDistanceIndex(index);
      if (nearMe) {
        setParams((prev) => ({
          ...prev,
          maxWalkDistanceMeters: WALK_DISTANCE_STEPS[index],
        }));
      }
    },
    [nearMe, setParams],
  );

  const handleCardPress = (result: RoutineTripSearchResult) => {
    router.push({
      pathname: '/subscription/new',
      params: {
        routineTripId: result.id,
        ...(result.routeLine ? { routeLine: JSON.stringify(result.routeLine) } : {}),
      },
    });
  };

  const handleContactPress = (result: RoutineTripSearchResult) => {
    router.push({
      pathname: '/chat/routine/[routineTripId]' as any,
      params: {
        routineTripId: result.id,
        otherUserId: result.driverId,
        otherUserName: result.driverName,
      },
    });
  };

  return (
    <View className="flex-1 bg-neutral-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-neutral-100">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="mr-3"
        >
          <ChevronLeft size={24} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-neutral-900 flex-1">Viajes universitarios</Text>
        <SlidersHorizontal size={20} color={Colors.primary[600]} />
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Filters */}
        <View className="bg-white mx-4 mt-4 rounded-2xl p-4 border border-neutral-100"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
        >
          {/* Pre-filled route banner */}
          {hasPrefilledRoute && (
            <View className="flex-row items-center bg-primary-50 rounded-xl px-3 py-2.5 mb-4 gap-2">
              <MapPin size={14} color={Colors.primary[600]} />
              <Text className="flex-1 text-xs text-primary-700" numberOfLines={1}>
                <Text className="font-semibold">{originName}</Text>
                <Text> → </Text>
                <Text className="font-semibold">{destName}</Text>
              </Text>
            </View>
          )}
          <Text className="text-sm font-semibold text-neutral-700 mb-2">Destino</Text>
          <UniversityPicker
            value={params.universityId}
            selectedLabel={selectedUniversityLabel}
            onChange={handleUniversityChange}
            placeholder="Seleccionar universidad..."
          />

          <View className="h-4" />

          <Text className="text-sm font-semibold text-neutral-700 mb-2">Días que necesitas</Text>
          <DaySelector
            selected={params.days ?? []}
            onChange={handleDaysChange}
          />

          <View className="h-4" />

          <Text className="text-sm font-semibold text-neutral-700 mb-1">Hora límite de llegada</Text>
          <TouchableOpacity
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}
            className="flex-row items-center border border-neutral-200 rounded-2xl px-4 py-3.5 bg-white"
          >
            <MapPin size={16} color={Colors.neutral[400]} />
            <Text
              className={`ml-3 text-base ${params.requiredArrivalBefore ? 'text-neutral-900' : 'text-neutral-400'}`}
            >
              {params.requiredArrivalBefore ?? 'Seleccionar hora...'}
            </Text>
          </TouchableOpacity>

          <View className="h-4" />

          {/* Near me toggle */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-semibold text-neutral-700">Cerca de mí</Text>
              <Text className="text-xs text-neutral-400 mt-0.5">
                Filtrar por distancia caminando al punto de recogida
              </Text>
            </View>
            <TouchableOpacity
              onPress={toggleNearMe}
              activeOpacity={0.8}
              className={`w-12 h-7 rounded-full items-center justify-center ${nearMe ? 'bg-primary-500' : 'bg-neutral-200'}`}
              style={{ alignItems: nearMe ? 'flex-end' : 'flex-start', paddingHorizontal: 3 }}
            >
              <View className="w-5 h-5 rounded-full bg-white" style={{ shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 }} />
            </TouchableOpacity>
          </View>

          {locationError && (
            <Text className="text-xs text-red-500 mt-1.5">{locationError}</Text>
          )}

          {nearMe && (
            <View className="mt-3">
              <Text className="text-xs text-neutral-500 mb-2">
                Distancia máx. a pie: <Text className="font-semibold text-neutral-700">{WALK_DISTANCE_STEPS[walkDistanceIndex]}m</Text>
              </Text>
              <View className="flex-row gap-1.5">
                {WALK_DISTANCE_STEPS.map((d, i) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => handleWalkDistanceChange(i)}
                    activeOpacity={0.7}
                    className={`flex-1 py-1.5 rounded-lg items-center ${i === walkDistanceIndex ? 'bg-primary-500' : 'bg-neutral-100'}`}
                  >
                    <Text className={`text-xs font-semibold ${i === walkDistanceIndex ? 'text-white' : 'text-neutral-600'}`}>
                      {d >= 1000 ? `${d / 1000}km` : `${d}m`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Search button */}
        <View className="mx-4 mt-4">
          <TouchableOpacity
            onPress={search}
            disabled={!canSearch || isLoading}
            activeOpacity={0.85}
            className={`flex-row items-center justify-center py-4 rounded-2xl gap-2 ${canSearch && !isLoading ? 'bg-primary-500' : 'bg-neutral-200'}`}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Search size={18} color={canSearch ? '#fff' : Colors.neutral[400]} />
                <Text className={`text-base font-bold ${canSearch ? 'text-white' : 'text-neutral-400'}`}>
                  Buscar rutas
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Results */}
        {error && (
          <View className="mx-4 mt-4 p-4 bg-red-50 rounded-2xl">
            <Text className="text-sm text-red-600 text-center">{error}</Text>
          </View>
        )}

        {hasSearched && !isLoading && (
          <View className="mx-4 mt-4" style={{ paddingBottom: insets.bottom + 24 }}>
            {results.length === 0 ? (
              <EmptyState
                title="Sin resultados"
                description="No encontramos rutas rutinarias con esos criterios. Intenta con otros días u hora límite."
              />
            ) : (
              <>
                <Text className="text-sm text-neutral-500 mb-3">
                  {results.length} {results.length === 1 ? 'ruta encontrada' : 'rutas encontradas'}
                </Text>
                {results.map((result) => (
                  <RoutineTripCard
                    key={result.id}
                    result={result}
                    onPress={() => handleCardPress(result)}
                    onRoutePress={() => setSelectedRouteTrip(result)}
                  />
                ))}
              </>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Time picker modal */}
      <DatePickerModal
        visible={showTimePicker}
        value={arrivalTimeDate}
        mode="time"
        title="Hora límite de llegada"
        onConfirm={handleArrivalTimeConfirm}
        onCancel={() => setShowTimePicker(false)}
      />

      {selectedRouteTrip && (
        <RoutineRouteMapModal
          visible={!!selectedRouteTrip}
          onClose={() => setSelectedRouteTrip(null)}
          originName={selectedRouteTrip.originName}
          originLatitude={selectedRouteTrip.originLatitude}
          originLongitude={selectedRouteTrip.originLongitude}
          destinationName={selectedRouteTrip.destinationName}
          destinationLatitude={selectedRouteTrip.destinationLatitude}
          destinationLongitude={selectedRouteTrip.destinationLongitude}
          routeLine={selectedRouteTrip.routeLine}
        />
      )}
    </View>
  );
}
