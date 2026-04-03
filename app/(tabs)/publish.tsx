import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Clock,
  Users,
  DollarSign,
  Luggage,
  Car,
  ArrowLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  GraduationCap,
  Bus,
  Calendar,
  Check,
  Map,
  MapPin,
  Plus,
  Search,
  X,
} from 'lucide-react-native';
import MapView, { Polyline, Marker, type Region } from 'react-native-maps';
import { Screen, Button, Input, Card, DatePickerModal, Toggle } from '@/components/ui';
import {
  LocationPickerModal,
  type SelectedLocation,
} from '@/components/LocationPickerModal';
import { TripTypeIcon } from '@/components/TripTypeIcon';
import { Colors } from '@/constants/colors';
import { TRIP_TYPE_OPTIONS } from '@/constants/trips';
import { distanceKm, normalizePlace, formatDuration } from '@/lib/utils';
import type { LocationSearchResult } from '@/lib/tomtom';
import {
  usePublishForm,
  locationSubtitle,
  isStepValid,
  STEP_VALIDATION_MESSAGES,
} from '@/hooks/usePublishForm';
import { useRouteAlternatives } from '@/hooks/useRouteAlternatives';
import { useLocationSearch } from '@/hooks/useLocationSearch';

// ── Formatting helpers ──

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ── Constants ──

const TOTAL_STEPS = 9;

// ── Screen ──

export default function PublishScreen() {
  const router = useRouter();

  // ── Hooks ──

  const {
    tripType,
    setTripType,
    form,
    dispatch,
    waypoints,
    setWaypoints,
    submitting,
    loadingVehicles,
    vehicleOptions,
    selectedVehicle,
    hasRegisteredVehicles,
    handlePublish,
  } = usePublishForm();

  const originSearch = useLocationSearch();
  const destinationSearch = useLocationSearch();

  const [step, setStep] = useState(1);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');

  const routeHook = useRouteAlternatives(
    form.origin,
    form.destination,
    waypoints,
    step === 5,
  );

  // ── Step animation ──

  const stepAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;

  useEffect(() => {
    stepAnim.setValue(0);
    Animated.parallel([
      Animated.timing(stepAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: step / TOTAL_STEPS,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [step, stepAnim, progressAnim]);

  // ── Location picker state ──

  const [locationPicker, setLocationPicker] = useState<{
    visible: boolean;
    target: 'origin' | 'destination' | 'waypoint';
    municipalityFocus?: { latitude: number; longitude: number; name: string };
  }>({ visible: false, target: 'origin' });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // ── Derived values ──

  const routeModeLabel =
    routeHook.routeMode === 'DIRECT'
      ? 'Ruta directa'
      : routeHook.routeMode === 'FLEXIBLE'
        ? 'Ruta flexible'
        : 'Con paradas';

  const tripTypeLabel =
    TRIP_TYPE_OPTIONS.find((opt) => opt.type === tripType)?.label ?? tripType;

  const isVehicleActive = (status: string | undefined) =>
    (status ?? '').toUpperCase() === 'ACTIVE';

  // ── Navigation ──

  const goNext = useCallback(() => {
    if (!isStepValid(step, form, routeHook.alternatives, routeHook.selectedId)) {
      const msg = STEP_VALIDATION_MESSAGES[step];
      if (msg) Alert.alert(msg.title, msg.message);
      return;
    }
    setSlideDirection('forward');
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }, [step, form, routeHook.alternatives, routeHook.selectedId]);

  const goBack = useCallback(() => {
    setSlideDirection('backward');
    setStep((s) => Math.max(1, s - 1));
  }, []);

  // ── Location handlers ──

  const handleInlineLocationSelect = useCallback(
    (target: 'origin' | 'destination', loc: SelectedLocation) => {
      dispatch({
        type: target === 'origin' ? 'SET_ORIGIN' : 'SET_DESTINATION',
        payload: loc,
      });

      if (target === 'origin') {
        originSearch.setQueryAndClear(loc.name);
        destinationSearch.clear();
        if (form.destination) {
          const sameCity =
            normalizePlace(form.destination.name) === normalizePlace(loc.name);
          const near = distanceKm(form.destination, loc) < 1;
          if (sameCity || near) {
            Alert.alert(
              'Destino inválido',
              'Elige un destino diferente al nuevo origen.',
            );
          }
        }
        setSlideDirection('forward');
        setStep(3);
      } else {
        destinationSearch.setQueryAndClear(loc.name);
        setSlideDirection('forward');
        setStep(4);
      }
    },
    [form.destination, dispatch, originSearch, destinationSearch],
  );

  const handleSuggestionSelect = useCallback(
    (target: 'origin' | 'destination', item: LocationSearchResult) => {
      if (item.locationType === 'municipality') {
        if (target === 'origin') originSearch.clear();
        else destinationSearch.clear();
        setLocationPicker({
          visible: true,
          target,
          municipalityFocus: {
            latitude: item.latitude,
            longitude: item.longitude,
            name: item.name,
          },
        });
      } else {
        handleInlineLocationSelect(target, {
          latitude: item.latitude,
          longitude: item.longitude,
          name: item.name,
          city: item.city,
          state: item.state,
          country: item.country,
        });
      }
    },
    [handleInlineLocationSelect, originSearch, destinationSearch],
  );

  const handleLocationConfirm = useCallback(
    (loc: SelectedLocation) => {
      if (locationPicker.target === 'waypoint') {
        const exists = waypoints.some((w) => distanceKm(w, loc) < 0.5);
        if (exists) {
          Alert.alert('Ciudad repetida', 'Esa ciudad intermedia ya fue agregada.');
        } else {
          setWaypoints((prev) => [...prev, loc]);
        }
        setLocationPicker((p) => ({ ...p, visible: false }));
        return;
      }
      handleInlineLocationSelect(locationPicker.target, loc);
      setLocationPicker((p) => ({
        ...p,
        visible: false,
        municipalityFocus: undefined,
      }));
    },
    [locationPicker.target, waypoints, handleInlineLocationSelect, setWaypoints],
  );

  // ── Waypoint handlers ──

  const addWaypoint = useCallback(() => {
    if (!form.origin) {
      Alert.alert('Origen requerido', 'Primero selecciona el lugar de origen.');
      setStep(2);
      return;
    }
    setLocationPicker({ visible: true, target: 'waypoint' });
  }, [form.origin]);

  const moveWaypointUp = useCallback(
    (idx: number) => {
      if (idx === 0) return;
      setWaypoints((prev) => {
        const next = [...prev];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        return next;
      });
    },
    [setWaypoints],
  );

  const moveWaypointDown = useCallback(
    (idx: number) => {
      setWaypoints((prev) => {
        if (idx >= prev.length - 1) return prev;
        const next = [...prev];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        return next;
      });
    },
    [setWaypoints],
  );

  // ── Step renderers ──

  const renderStep1 = () => (
    <>
      <Text className="text-sm font-semibold text-neutral-700 mb-2">
        Tipo de viaje
      </Text>
      <View className="flex-row gap-2 mb-2">
        {TRIP_TYPE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.type}
            onPress={() => setTripType(opt.type)}
            className={`flex-1 items-center py-4 rounded-xl border-2 ${
              tripType === opt.type
                ? 'border-primary-500 bg-primary-50'
                : 'border-neutral-200 bg-white'
            }`}
          >
            <TripTypeIcon type={opt.type} size={20} />
            <Text
              className={`text-xs font-medium mt-1 ${
                tripType === opt.type
                  ? 'text-primary-700'
                  : 'text-neutral-600'
              }`}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text className="text-xs text-neutral-500">
        Puedes cambiarlo más adelante antes de publicar.
      </Text>
    </>
  );

  const renderLocationStep = (target: 'origin' | 'destination') => {
    const isOrigin = target === 'origin';
    const search = isOrigin ? originSearch : destinationSearch;
    const location = isOrigin ? form.origin : form.destination;
    const accentColor = isOrigin ? Colors.primary[600] : Colors.accent[600];
    const borderClass = isOrigin
      ? 'border-primary-200 bg-primary-50'
      : 'border-accent-200 bg-accent-50';
    const dotClass = isOrigin ? 'bg-primary-500' : 'bg-accent-500';

    const invalidDestination =
      !isOrigin &&
      !!form.origin &&
      !!form.destination &&
      (normalizePlace(form.origin.name) === normalizePlace(form.destination.name) ||
        distanceKm(form.origin, form.destination) < 1);

    return (
      <>
        <Text className="text-sm font-semibold text-neutral-700 mb-2">
          {isOrigin ? 'Lugar de origen' : 'Lugar de destino'}
        </Text>
        <Input
          placeholder="Escribe ciudad o lugar"
          value={search.query}
          onChangeText={search.setQuery}
          leftIcon={<Search size={18} color={Colors.neutral[400]} />}
        />
        <TouchableOpacity
          onPress={() => setLocationPicker({ visible: true, target })}
          className="flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-3 mt-2"
        >
          <View className="flex-row items-center">
            <MapPin size={16} color={accentColor} />
            <Text className="text-sm text-neutral-700 ml-2">
              Seleccionar desde el mapa
            </Text>
          </View>
        </TouchableOpacity>

        {search.searching && (
          <Text className="text-xs text-neutral-500 mt-2">
            Buscando ubicaciones...
          </Text>
        )}

        {!search.searching && search.results.length > 0 && (
          <View className="mt-2 rounded-xl border border-neutral-200 overflow-hidden bg-white">
            {search.results.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleSuggestionSelect(target, item)}
                className="px-3 py-3 border-b border-neutral-100"
              >
                <Text
                  className="text-sm font-medium text-neutral-900"
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  className="text-xs text-neutral-500 mt-1"
                  numberOfLines={1}
                >
                  {item.address}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {location && (
          <View
            className={`px-3 py-3 rounded-xl border mt-2 ${
              invalidDestination ? 'border-red-300 bg-red-50' : borderClass
            }`}
          >
            <View className="flex-row items-center">
              <View
                className={`w-2.5 h-2.5 rounded-full mr-2 ${
                  invalidDestination ? 'bg-red-500' : dotClass
                }`}
              />
              <Text
                className="text-sm font-medium text-neutral-900 flex-1"
                numberOfLines={1}
              >
                {location.name}
              </Text>
            </View>
            {!invalidDestination && locationSubtitle(location) ? (
              <Text
                className="text-xs text-neutral-500 mt-0.5 ml-4"
                numberOfLines={1}
              >
                {locationSubtitle(location)}
              </Text>
            ) : null}
          </View>
        )}
        {invalidDestination && (
          <Text className="text-xs text-red-500 mt-2">
            El destino debe ser diferente al origen.
          </Text>
        )}
      </>
    );
  };

  const renderStep4 = () => (
    <>
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-semibold text-neutral-700">
          Ciudades intermedias
        </Text>
        <TouchableOpacity
          onPress={addWaypoint}
          className="flex-row items-center"
        >
          <Plus size={16} color={Colors.primary[600]} />
          <Text className="text-xs font-semibold text-primary-600 ml-1">
            Agregar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Origin anchor */}
      <View className="flex-row items-start px-3 py-2.5 rounded-xl border border-primary-200 bg-primary-50 mb-2">
        <View className="w-2.5 h-2.5 rounded-full bg-primary-500 mr-2" />
        <View className="flex-1">
          <Text className="text-[10px] text-primary-600 font-medium">
            ORIGEN
          </Text>
          <Text
            className="text-sm font-medium text-neutral-900"
            numberOfLines={1}
          >
            {form.origin?.name}
          </Text>
          {form.origin && locationSubtitle(form.origin) ? (
            <Text
              className="text-xs text-neutral-500 mt-0.5"
              numberOfLines={1}
            >
              {locationSubtitle(form.origin)}
            </Text>
          ) : null}
        </View>
      </View>

      {waypoints.length === 0 ? (
        <View className="items-center py-4 mb-2">
          <Text className="text-sm text-neutral-400 text-center">
            No hay paradas. Puedes continuar sin ciudades intermedias.
          </Text>
        </View>
      ) : (
        <View className="gap-2 mb-2">
          {waypoints.map((w, idx) => (
            <View
              key={`${w.latitude}-${w.longitude}-${idx}`}
              className="flex-row items-center rounded-xl border border-neutral-200 bg-white px-3 py-2.5"
            >
              <View className="flex-1 mr-2">
                <Text className="text-[10px] text-neutral-400 font-medium">
                  PARADA {idx + 1}
                </Text>
                <Text
                  className="text-sm font-medium text-neutral-900"
                  numberOfLines={1}
                >
                  {w.name}
                </Text>
                {locationSubtitle(w) ? (
                  <Text
                    className="text-xs text-neutral-400 mt-0.5"
                    numberOfLines={1}
                  >
                    {locationSubtitle(w)}
                  </Text>
                ) : null}
              </View>
              <View className="flex-row items-center gap-1">
                <TouchableOpacity
                  onPress={() => moveWaypointUp(idx)}
                  disabled={idx === 0}
                  className={`w-7 h-7 rounded-lg border items-center justify-center ${
                    idx === 0
                      ? 'border-neutral-100 opacity-30'
                      : 'border-neutral-200'
                  }`}
                >
                  <ChevronUp size={14} color={Colors.neutral[600]} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveWaypointDown(idx)}
                  disabled={idx === waypoints.length - 1}
                  className={`w-7 h-7 rounded-lg border items-center justify-center ${
                    idx === waypoints.length - 1
                      ? 'border-neutral-100 opacity-30'
                      : 'border-neutral-200'
                  }`}
                >
                  <ChevronDown size={14} color={Colors.neutral[600]} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setWaypoints((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="w-7 h-7 rounded-lg border border-neutral-200 items-center justify-center"
                >
                  <X size={14} color={Colors.neutral[500]} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Destination anchor */}
      <View className="flex-row items-start px-3 py-2.5 rounded-xl border border-accent-200 bg-accent-50">
        <View className="w-2.5 h-2.5 rounded-full bg-accent-500 mr-2" />
        <View className="flex-1">
          <Text className="text-[10px] text-accent-600 font-medium">
            DESTINO
          </Text>
          <Text
            className="text-sm font-medium text-neutral-900"
            numberOfLines={1}
          >
            {form.destination?.name}
          </Text>
          {form.destination && locationSubtitle(form.destination) ? (
            <Text
              className="text-xs text-neutral-500 mt-0.5"
              numberOfLines={1}
            >
              {locationSubtitle(form.destination)}
            </Text>
          ) : null}
        </View>
      </View>
    </>
  );

  const renderStep5 = () => {
    if (!form.origin || !form.destination) {
      return (
        <>
          <Text className="text-sm font-semibold text-neutral-700 mb-2">
            Selección de ruta
          </Text>
          <Card>
            <Text className="text-sm text-neutral-500">
              Define origen y destino para ver alternativas de ruta.
            </Text>
          </Card>
        </>
      );
    }

    return (
      <>
        <Text className="text-sm font-semibold text-neutral-700 mb-2">
          Selección de ruta
        </Text>
        <View
          className="rounded-2xl overflow-hidden border border-neutral-200 bg-white"
          style={{ height: 520 }}
        >
          <MapView
            ref={routeHook.mapRef}
            style={{ flex: 1 }}
            scrollEnabled
            zoomEnabled
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
            initialRegion={
              {
                latitude:
                  (form.origin.latitude + form.destination.latitude) / 2,
                longitude:
                  (form.origin.longitude + form.destination.longitude) / 2,
                latitudeDelta: Math.max(
                  Math.abs(
                    form.origin.latitude - form.destination.latitude,
                  ) * 1.8,
                  0.2,
                ),
                longitudeDelta: Math.max(
                  Math.abs(
                    form.origin.longitude - form.destination.longitude,
                  ) * 1.8,
                  0.2,
                ),
              } as Region
            }
          >
            <Marker
              coordinate={{
                latitude: form.origin.latitude,
                longitude: form.origin.longitude,
              }}
              title="Origen"
            />
            {waypoints.map((w, idx) => (
              <Marker
                key={`wp-${idx}`}
                coordinate={{
                  latitude: w.latitude,
                  longitude: w.longitude,
                }}
                title={`Parada ${idx + 1}: ${w.name}`}
                pinColor="#F59E0B"
              />
            ))}
            <Marker
              coordinate={{
                latitude: form.destination.latitude,
                longitude: form.destination.longitude,
              }}
              title="Destino"
              pinColor={Colors.accent[500]}
            />
            {routeHook.selected && (
              <Polyline
                coordinates={routeHook.selected.points}
                strokeWidth={6}
                strokeColor="#2563EB"
                lineCap="round"
                lineJoin="round"
              />
            )}
          </MapView>

          {/* Route selector overlay */}
          {routeHook.alternatives.length > 0 && routeHook.selected && (
            <View
              style={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                right: 12,
                backgroundColor: 'rgba(255,255,255,0.95)',
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  onPress={() => routeHook.selectByOffset(-1)}
                  disabled={
                    routeHook.locked || routeHook.alternatives.length < 2
                  }
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor:
                      routeHook.locked || routeHook.alternatives.length < 2
                        ? '#f5f5f5'
                        : '#fff',
                    borderWidth: 1,
                    borderColor: '#e5e5e5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity:
                      routeHook.locked || routeHook.alternatives.length < 2
                        ? 0.5
                        : 1,
                  }}
                >
                  <ArrowLeft size={16} color={Colors.neutral[700]} />
                </TouchableOpacity>

                <View style={{ flex: 1, marginHorizontal: 8 }}>
                  <Text className="text-sm font-semibold text-neutral-900 text-center">
                    {routeHook.selected.title}
                  </Text>
                  <Text className="text-xs text-neutral-500 text-center mt-0.5">
                    {routeHook.selected.distanceKm.toFixed(1)} km ·{' '}
                    {formatDuration(routeHook.selected.durationMin)} ·{' '}
                    {routeHook.selected.hasTolls
                      ? 'Con peajes'
                      : 'Sin peajes'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => routeHook.selectByOffset(1)}
                  disabled={
                    routeHook.locked || routeHook.alternatives.length < 2
                  }
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor:
                      routeHook.locked || routeHook.alternatives.length < 2
                        ? '#f5f5f5'
                        : '#fff',
                    borderWidth: 1,
                    borderColor: '#e5e5e5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity:
                      routeHook.locked || routeHook.alternatives.length < 2
                        ? 0.5
                        : 1,
                  }}
                >
                  <ChevronRight size={16} color={Colors.neutral[700]} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={goNext}
                  disabled={submitting}
                  activeOpacity={0.85}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: Colors.primary[500],
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 8,
                  }}
                >
                  <ChevronRight size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </>
    );
  };

  const renderStep6 = () => (
    <>
      <Text className="text-sm font-semibold text-neutral-700 mb-2">
        Día y hora de salida
      </Text>
      <View className="flex-row gap-3 mb-2">
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
          className="flex-1"
        >
          <View className="flex-row items-center px-4 py-3.5 rounded-xl border-2 border-neutral-200 bg-white">
            <Calendar size={18} color={Colors.neutral[500]} />
            <View className="ml-3">
              <Text className="text-xs text-neutral-400 mb-0.5">Fecha</Text>
              <Text className="text-sm font-medium text-neutral-900">
                {fmtDate(form.departureAt)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowTimePicker(true)}
          activeOpacity={0.7}
          className="flex-1"
        >
          <View className="flex-row items-center px-4 py-3.5 rounded-xl border-2 border-neutral-200 bg-white">
            <Clock size={18} color={Colors.neutral[500]} />
            <View className="ml-3">
              <Text className="text-xs text-neutral-400 mb-0.5">Hora</Text>
              <Text className="text-sm font-medium text-neutral-900">
                {fmtTime(form.departureAt)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
      {form.departureAt <= new Date() && (
        <Text className="text-xs text-red-500">
          La salida debe ser en una fecha futura.
        </Text>
      )}
    </>
  );

  const renderStep7 = () => (
    <>
      <View className="flex-row gap-3 mb-5">
        <View className="flex-1">
          <Input
            label="Asientos disponibles"
            placeholder="3"
            keyboardType="number-pad"
            value={form.availableSeats}
            onChangeText={(v) =>
              dispatch({ type: 'SET_SEATS', payload: v.replace(/\D/g, '') })
            }
            leftIcon={<Users size={18} color={Colors.neutral[400]} />}
          />
        </View>
        <View className="flex-1">
          <Input
            label="Precio / asiento (COP)"
            placeholder="50000"
            keyboardType="number-pad"
            value={form.pricePerSeat}
            onChangeText={(v) =>
              dispatch({ type: 'SET_PRICE', payload: v.replace(/\D/g, '') })
            }
            leftIcon={<DollarSign size={18} color={Colors.neutral[400]} />}
          />
        </View>
      </View>

      <Card className="mb-2">
        <TouchableOpacity
          className="flex-row items-center justify-between py-1"
          onPress={() => dispatch({ type: 'TOGGLE_LUGGAGE' })}
        >
          <View className="flex-row items-center">
            <Luggage size={20} color={Colors.neutral[600]} />
            <Text className="text-base text-neutral-800 ml-3">
              Permite equipaje
            </Text>
          </View>
          <Toggle
            value={form.allowsLuggage}
            onPress={() => dispatch({ type: 'TOGGLE_LUGGAGE' })}
          />
        </TouchableOpacity>

        <View className="h-px bg-neutral-100 my-3" />

        {tripType === 'ROUTINE' ? (
          <TouchableOpacity
            className="flex-row items-center justify-between py-1"
            onPress={() => dispatch({ type: 'TOGGLE_STUDENTS' })}
          >
            <View className="flex-row items-center">
              <GraduationCap size={20} color={Colors.neutral[600]} />
              <Text className="text-base text-neutral-800 ml-3">
                Solo estudiantes
              </Text>
            </View>
            <Toggle
              value={form.studentsOnly}
              onPress={() => dispatch({ type: 'TOGGLE_STUDENTS' })}
            />
          </TouchableOpacity>
        ) : (
          <View className="py-1">
            <Text className="text-xs text-neutral-500">
              Para viajes interurbanos no se aplica restricción de solo
              estudiantes.
            </Text>
          </View>
        )}
      </Card>
    </>
  );

  const renderStep8 = () => (
    <>
      <Text className="text-sm font-semibold text-neutral-700 mb-2">
        Selecciona tu vehículo
      </Text>
      {loadingVehicles ? (
        <View className="items-center py-6 mb-6">
          <ActivityIndicator color={Colors.primary[500]} />
        </View>
      ) : vehicleOptions.length === 0 ? (
        <TouchableOpacity
          onPress={() => router.push('/vehicle/add')}
          activeOpacity={0.7}
        >
          <Card className="mb-6">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Car size={20} color={Colors.primary[600]} />
                <Text className="text-sm text-neutral-700 ml-3 flex-1">
                  {hasRegisteredVehicles
                    ? 'Tu vehículo está registrado pero aún no está activo para publicar viajes.'
                    : 'No tienes vehículos activos. '}
                  <Text className="text-primary-600 font-semibold">
                    {hasRegisteredVehicles
                      ? 'Ver mis vehículos'
                      : 'Registrar uno'}
                  </Text>
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.neutral[400]} />
            </View>
          </Card>
        </TouchableOpacity>
      ) : (
        <View className="mb-5">
          {vehicleOptions.map((v) => {
            const selected = form.vehicleId === v.id;
            const active = isVehicleActive(v.status);
            return (
              <TouchableOpacity
                key={v.id}
                onPress={() => {
                  if (!active) {
                    Alert.alert(
                      'Vehículo no disponible',
                      'Solo puedes seleccionar vehículos activos.',
                    );
                    return;
                  }
                  dispatch({ type: 'SET_VEHICLE', payload: v.id });
                }}
                activeOpacity={0.7}
                className={`flex-row items-center p-3 rounded-2xl border-2 mb-2 ${
                  active ? 'bg-white' : 'bg-neutral-50'
                } ${selected ? 'border-primary-500' : 'border-neutral-200'}`}
              >
                <View className="w-12 h-12 rounded-xl bg-primary-50 items-center justify-center mr-3">
                  <Car size={22} color={Colors.primary[400]} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-neutral-900">
                    {v.brand} {v.model} {v.year}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    {v.color}
                  </Text>
                  <View
                    className={`rounded px-1.5 py-0.5 self-start mt-1 ${
                      active ? 'bg-primary-50' : 'bg-neutral-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        active ? 'text-primary-700' : 'text-neutral-600'
                      }`}
                    >
                      {v.plateNumber}
                    </Text>
                  </View>
                  <Text
                    className={`text-xs mt-1 ${
                      active ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    Estado: {active ? 'Activo' : 'No activo'}
                  </Text>
                </View>
                {selected && (
                  <View className="w-6 h-6 rounded-full bg-primary-500 items-center justify-center">
                    <Check size={14} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </>
  );

  const renderSummary = () => (
    <>
      <Text className="text-lg font-bold text-neutral-900 mb-3">
        Resumen del viaje
      </Text>
      <View style={{ gap: 5 }}>
        <Card className="bg-primary-50 border border-primary-100">
          <View className="flex-row items-center">
            <Bus size={20} color={Colors.primary[700]} />
            <View className="ml-3">
              <Text className="text-xs text-neutral-500">Tipo y ruta</Text>
              <Text className="text-base font-semibold text-neutral-900">
                {tripTypeLabel} · {routeModeLabel}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <View className="flex-row gap-3">
            <View className="flex-1 flex-row items-start">
              <Map
                size={18}
                color={Colors.neutral[700]}
                className="mt-0.5"
              />
              <View className="ml-2 flex-1">
                <Text className="text-xs text-neutral-500">Origen</Text>
                <Text
                  className="text-base font-semibold text-neutral-900"
                  numberOfLines={1}
                >
                  {form.origin?.name ?? 'Sin definir'}
                </Text>
                {form.origin && locationSubtitle(form.origin) ? (
                  <Text
                    className="text-xs text-neutral-400 mt-0.5"
                    numberOfLines={1}
                  >
                    {locationSubtitle(form.origin)}
                  </Text>
                ) : null}
              </View>
            </View>
            <View className="flex-1 flex-row items-start">
              <Map
                size={18}
                color={Colors.accent[600]}
                className="mt-0.5"
              />
              <View className="ml-2 flex-1">
                <Text className="text-xs text-neutral-500">Destino</Text>
                <Text
                  className="text-base font-semibold text-neutral-900"
                  numberOfLines={1}
                >
                  {form.destination?.name ?? 'Sin definir'}
                </Text>
                {form.destination && locationSubtitle(form.destination) ? (
                  <Text
                    className="text-xs text-neutral-400 mt-0.5"
                    numberOfLines={1}
                  >
                    {locationSubtitle(form.destination)}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </Card>

        <Card>
          <View className="flex-row">
            <View className="flex-1">
              <Text className="text-xs text-neutral-500">Distancia</Text>
              <Text className="text-lg font-bold text-neutral-900">
                {routeHook.selected
                  ? `${routeHook.selected.distanceKm.toFixed(1)} km`
                  : '-'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-neutral-500">
                Tiempo estimado
              </Text>
              <Text className="text-lg font-bold text-neutral-900">
                {routeHook.selected
                  ? formatDuration(routeHook.selected.durationMin)
                  : '-'}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <View className="flex-row items-center">
            <Calendar size={20} color={Colors.neutral[700]} />
            <View className="ml-3">
              <Text className="text-xs text-neutral-500">Salida</Text>
              <Text className="text-base font-semibold text-neutral-900">
                {fmtDate(form.departureAt)} · {fmtTime(form.departureAt)}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <View className="flex-row">
            <View className="flex-row items-center flex-1">
              <Users size={18} color={Colors.neutral[700]} />
              <View className="ml-2">
                <Text className="text-xs text-neutral-500">Asientos</Text>
                <Text className="text-base font-semibold text-neutral-900">
                  {form.availableSeats || '0'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center flex-1">
              <DollarSign size={18} color={Colors.neutral[700]} />
              <View className="ml-2">
                <Text className="text-xs text-neutral-500">Precio</Text>
                <Text className="text-base font-semibold text-neutral-900">
                  COP ${form.pricePerSeat || '0'}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <Card>
          <View className="flex-row items-center">
            <Car size={20} color={Colors.neutral[700]} />
            <View className="ml-3 flex-1">
              <Text className="text-xs text-neutral-500">Vehículo</Text>
              <Text
                className="text-base font-semibold text-neutral-900"
                numberOfLines={1}
              >
                {selectedVehicle
                  ? `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.plateNumber})`
                  : 'Sin seleccionar'}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Luggage size={18} color={Colors.neutral[700]} />
              <Text className="text-sm text-neutral-700 ml-2">Equipaje</Text>
            </View>
            <Text className="text-sm font-semibold text-neutral-900">
              {form.allowsLuggage ? 'Permitido' : 'No permitido'}
            </Text>
          </View>
          {tripType === 'ROUTINE' && (
            <View className="flex-row items-center justify-between mt-3">
              <View className="flex-row items-center">
                <GraduationCap size={18} color={Colors.neutral[700]} />
                <Text className="text-sm text-neutral-700 ml-2">
                  Solo estudiantes
                </Text>
              </View>
              <Text className="text-sm font-semibold text-neutral-900">
                {form.studentsOnly ? 'Sí' : 'No'}
              </Text>
            </View>
          )}
        </Card>
      </View>
    </>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderLocationStep('origin');
      case 3:
        return renderLocationStep('destination');
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      case 7:
        return renderStep7();
      case 8:
        return renderStep8();
      default:
        return renderSummary();
    }
  };

  // ── Main render ──

  return (
    <Screen edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-4 pb-2"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-6">
            <Text className="text-2xl font-bold text-neutral-900">
              Publicar viaje
            </Text>
          </View>

          <View className="mb-5">
            <View className="mb-2">
              <TouchableOpacity
                onPress={goBack}
                disabled={step === 1 || submitting}
                className={`w-9 h-9 rounded-full border border-neutral-200 bg-white items-center justify-center ${
                  step === 1 ? 'opacity-30' : 'opacity-100'
                }`}
              >
                <ArrowLeft size={18} color={Colors.neutral[700]} />
              </TouchableOpacity>
            </View>
            <View className="h-2 rounded-full bg-neutral-100 overflow-hidden">
              <Animated.View
                className="h-2 bg-primary-500"
                style={{
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                }}
              />
            </View>
          </View>

          <Card className={step === TOTAL_STEPS ? 'mb-2' : 'mb-6'}>
            <Animated.View
              style={{
                opacity: stepAnim,
                transform: [
                  {
                    translateX: stepAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        slideDirection === 'forward' ? 24 : -24,
                        0,
                      ],
                    }),
                  },
                ],
              }}
            >
              {renderStepContent()}
            </Animated.View>
          </Card>

          <DatePickerModal
            visible={showDatePicker}
            value={form.departureAt}
            mode="date"
            title="Fecha de salida"
            minimumDate={new Date()}
            onConfirm={(date) => {
              const next = new Date(date);
              next.setHours(
                form.departureAt.getHours(),
                form.departureAt.getMinutes(),
                0,
                0,
              );
              dispatch({ type: 'SET_DEPARTURE', payload: next });
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
          />
          <DatePickerModal
            visible={showTimePicker}
            value={form.departureAt}
            mode="time"
            title="Hora de salida"
            onConfirm={(date) => {
              const next = new Date(form.departureAt);
              next.setHours(date.getHours(), date.getMinutes(), 0, 0);
              dispatch({ type: 'SET_DEPARTURE', payload: next });
              setShowTimePicker(false);
            }}
            onCancel={() => setShowTimePicker(false)}
          />

          <View
            className={
              step < TOTAL_STEPS ? 'items-end' : 'items-center'
            }
          >
            {step === 5 ? null : step < TOTAL_STEPS ? (
              <TouchableOpacity
                onPress={goNext}
                disabled={submitting}
                activeOpacity={0.85}
                className="w-14 h-14 rounded-full bg-primary-500 items-center justify-center"
              >
                <ChevronRight size={24} color="white" />
              </TouchableOpacity>
            ) : (
              <Button
                onPress={() => handlePublish(routeHook.selected)}
                size="lg"
                className="px-6"
                loading={submitting}
                disabled={submitting}
              >
                Publicar viaje
              </Button>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LocationPickerModal
        visible={locationPicker.visible}
        title={
          locationPicker.target === 'origin'
            ? 'Seleccionar origen'
            : locationPicker.target === 'destination'
              ? 'Seleccionar destino'
              : 'Agregar ciudad intermedia'
        }
        onConfirm={handleLocationConfirm}
        onClose={() =>
          setLocationPicker((p) => ({
            ...p,
            visible: false,
            municipalityFocus: undefined,
          }))
        }
        initial={
          locationPicker.target === 'origin'
            ? form.origin
            : form.destination
        }
        mode={locationPicker.target === 'waypoint' ? 'full' : 'map-only'}
        mapHintText={
          locationPicker.target === 'destination'
            ? 'Selecciona el lugar de finalizacion del viaje'
            : 'Selecciona el lugar de encuentro para iniciar el viaje'
        }
        municipalityFocus={locationPicker.municipalityFocus}
      />
    </Screen>
  );
}
