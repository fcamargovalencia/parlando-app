import React, { useState, useReducer, useEffect, useCallback, useRef } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
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
  Building2,
  Calendar,
  Check,
  Map,
  MapPin,
  Plus,
  Search,
  X,
} from 'lucide-react-native';
import MapView, { Polyline, Marker, type Region } from 'react-native-maps';
import { Screen, Button, Input, Card, DatePickerModal } from '@/components/ui';
import {
  LocationPickerModal,
  type SelectedLocation,
} from '@/components/LocationPickerModal';
import { Colors } from '@/constants/colors';
import { vehiclesApi } from '@/api/vehicles';
import { tripsApi } from '@/api/trips';
import type { TripType, VehicleResponse, WaypointRequest } from '@/types/api';
import { tomtomService, type LocationSearchResult, type TomTomRouteAlternative } from '@/lib/tomtom';
import Toast from 'react-native-toast-message';

// ── Form State ──

interface IntercityForm {
  origin: SelectedLocation | null;
  destination: SelectedLocation | null;
  departureAt: Date;
  availableSeats: string;
  pricePerSeat: string;
  vehicleId: string;
  allowsLuggage: boolean;
  studentsOnly: boolean;
}

type IntercityAction =
  | { type: 'SET_ORIGIN'; payload: SelectedLocation; }
  | { type: 'SET_DESTINATION'; payload: SelectedLocation; }
  | { type: 'SET_DEPARTURE'; payload: Date; }
  | { type: 'SET_SEATS'; payload: string; }
  | { type: 'SET_PRICE'; payload: string; }
  | { type: 'SET_VEHICLE'; payload: string; }
  | { type: 'TOGGLE_LUGGAGE'; }
  | { type: 'TOGGLE_STUDENTS'; }
  | { type: 'RESET'; };

function makeTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d;
}

const initialForm: IntercityForm = {
  origin: null,
  destination: null,
  departureAt: makeTomorrow(),
  availableSeats: '3',
  pricePerSeat: '',
  vehicleId: '',
  allowsLuggage: true,
  studentsOnly: false,
};

function formReducer(state: IntercityForm, action: IntercityAction): IntercityForm {
  switch (action.type) {
    case 'SET_ORIGIN': return { ...state, origin: action.payload };
    case 'SET_DESTINATION': return { ...state, destination: action.payload };
    case 'SET_DEPARTURE': return { ...state, departureAt: action.payload };
    case 'SET_SEATS': return { ...state, availableSeats: action.payload };
    case 'SET_PRICE': return { ...state, pricePerSeat: action.payload };
    case 'SET_VEHICLE': return { ...state, vehicleId: action.payload };
    case 'TOGGLE_LUGGAGE': return { ...state, allowsLuggage: !state.allowsLuggage };
    case 'TOGGLE_STUDENTS': return { ...state, studentsOnly: !state.studentsOnly };
    case 'RESET': return { ...initialForm, departureAt: makeTomorrow() };
  }
}

// ── Trip Type Config ──

const tripTypeOptions: { type: TripType; label: string; icon: React.ReactNode; }[] = [
  {
    type: 'INTERCITY',
    label: 'Interurbano',
    icon: <Bus size={20} color={Colors.primary[600]} />,
  },
  {
    type: 'URBAN',
    label: 'Urbano',
    icon: <Building2 size={20} color={Colors.accent[600]} />,
  },
  {
    type: 'ROUTINE',
    label: 'Rutinario',
    icon: <GraduationCap size={20} color="#3B82F6" />,
  },
];

// ── Helpers ──

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function normalizePlace(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(',')[0]
    .trim();
}

function distanceKm(a: SelectedLocation, b: SelectedLocation) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function isVehicleActive(status: string | undefined) {
  return (status ?? '').toUpperCase() === 'ACTIVE';
}

type RouteAlternative = {
  id: string;
  title: string;
  points: { latitude: number; longitude: number; }[];
  distanceKm: number;
  durationMin: number;
  hasTolls: boolean;
  travelTimeInSeconds?: number;
};

function routeDistanceKm(points: { latitude: number; longitude: number; }[]) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = { latitude: points[i - 1].latitude, longitude: points[i - 1].longitude, name: '' };
    const b = { latitude: points[i].latitude, longitude: points[i].longitude, name: '' };
    total += distanceKm(a, b);
  }
  return total;
}

function estimateDurationMin(distance: number, speedKmh: number) {
  if (speedKmh <= 0) return 0;
  return Math.max(1, Math.round((distance / speedKmh) * 60));
}

function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m} min`;
  return `${h} h ${m} min`;
}

function locationSubtitle(loc: SelectedLocation): string {
  return [loc.city, loc.state, loc.country].filter(Boolean).join(', ');
}

function buildRouteAlternativesFallback(origin: SelectedLocation, destination: SelectedLocation, waypoints: SelectedLocation[] = []): RouteAlternative[] {
  const waypointPoints = waypoints.map((w) => ({ latitude: w.latitude, longitude: w.longitude }));
  const points = [
    { latitude: origin.latitude, longitude: origin.longitude },
    ...waypointPoints,
    { latitude: destination.latitude, longitude: destination.longitude },
  ];
  const distance = routeDistanceKm(points);
  return [{
    id: 'DIRECT',
    title: 'Ruta directa',
    points,
    distanceKm: distance,
    durationMin: estimateDurationMin(distance, 72),
    hasTolls: false,
  }];
}

// ── Toggle UI ──

function Toggle({ value, onPress }: { value: boolean; onPress: () => void; }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`w-12 h-7 rounded-full justify-center px-0.5 ${value ? 'bg-primary-500' : 'bg-neutral-200'}`}
    >
      <View
        className={`w-6 h-6 rounded-full bg-white ${value ? 'self-end' : 'self-start'}`}
        style={{ elevation: 2 }}
      />
    </TouchableOpacity>
  );
}

// ── Screen ──

export default function PublishScreen() {
  const router = useRouter();

  const [tripType, setTripType] = useState<TripType>('INTERCITY');
  const [form, dispatch] = useReducer(formReducer, initialForm);
  const [step, setStep] = useState(1);
  const [routeMode, setRouteMode] = useState<'DIRECT' | 'FLEXIBLE' | 'WITH_STOPS'>('DIRECT');
  const [waypoints, setWaypoints] = useState<SelectedLocation[]>([]);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');
  const [routeAlternatives, setRouteAlternatives] = useState<RouteAlternative[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('DIRECT');
  const [isRouteSwitchLocked, setIsRouteSwitchLocked] = useState(false);
  const routeMapRef = useRef<MapView>(null);
  const routeSwitchLockRef = useRef(false);
  const routeSwitchUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ROUTE_SWITCH_LOCK_MS = 450;

  const stepAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1 / 9)).current;

  const TOTAL_STEPS = 9;
  const stepTitles = [
    'Tipo de viaje',
    'Lugar de origen',
    'Lugar de destino',
    'Ciudades intermedias',
    'Selección de ruta',
    'Día y hora de salida',
    'Asientos y precio',
    'Selección de vehículo',
    'Resumen final',
  ];

  // Vehicles
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Location picker
  const [locationPicker, setLocationPicker] = useState<{
    visible: boolean;
    target: 'origin' | 'destination' | 'waypoint';
    municipalityFocus?: { latitude: number; longitude: number; name: string; };
  }>({ visible: false, target: 'origin' });
  const [originQuery, setOriginQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [originResults, setOriginResults] = useState<LocationSearchResult[]>([]);
  const [destinationResults, setDestinationResults] = useState<LocationSearchResult[]>([]);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [searchingDestination, setSearchingDestination] = useState(false);
  const originSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destinationSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originSearchSeqRef = useRef(0);
  const destinationSearchSeqRef = useRef(0);

  // Date / Time pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Submitting
  const [submitting, setSubmitting] = useState(false);

  // Load vehicles on mount
  const loadVehicles = useCallback(async () => {
    setLoadingVehicles(true);
    try {
      const { data: res } = await vehiclesApi.getMine();
      setVehicles(res.data ?? []);
    } catch {
      // empty list shown
    } finally {
      setLoadingVehicles(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [loadVehicles]),
  );

  // Auto-select if only one active vehicle
  useEffect(() => {
    const active = vehicles.filter((v) => v.status === 'ACTIVE');
    if (active.length === 1 && !form.vehicleId) {
      dispatch({ type: 'SET_VEHICLE', payload: active[0].id });
    }
  }, [vehicles, form.vehicleId]);

  const activeVehicles = vehicles.filter((v) => isVehicleActive(v.status));
  const vehicleOptions = [...vehicles].sort((a, b) => {
    const aActive = isVehicleActive(a.status) ? 1 : 0;
    const bActive = isVehicleActive(b.status) ? 1 : 0;
    return bActive - aActive;
  });
  const selectedVehicle = vehicleOptions.find((v) => v.id === form.vehicleId) ?? null;
  const hasRegisteredVehicles = vehicles.length > 0;
  const routeModeLabel =
    routeMode === 'DIRECT'
      ? 'Ruta directa'
      : routeMode === 'FLEXIBLE'
        ? 'Ruta flexible'
        : 'Con paradas';
  const tripTypeLabel = tripTypeOptions.find((opt) => opt.type === tripType)?.label ?? tripType;
  const selectedRoute = routeAlternatives.find((r) => r.id === selectedRouteId) ?? null;

  const applyRouteSelection = useCallback((routeId: string) => {
    if (routeSwitchLockRef.current) return;
    if (!routeAlternatives.some((route) => route.id === routeId)) return;
    if (routeId === selectedRouteId) return;

    routeSwitchLockRef.current = true;
    setIsRouteSwitchLocked(true);
    setSelectedRouteId(routeId);

    if (routeSwitchUnlockTimerRef.current) {
      clearTimeout(routeSwitchUnlockTimerRef.current);
    }
    routeSwitchUnlockTimerRef.current = setTimeout(() => {
      routeSwitchLockRef.current = false;
      setIsRouteSwitchLocked(false);
    }, ROUTE_SWITCH_LOCK_MS);
  }, [routeAlternatives, selectedRouteId]);

  const applyRouteSelectionByOffset = useCallback((offset: number) => {
    if (routeAlternatives.length < 2) return;
    const selectedIndex = routeAlternatives.findIndex((r) => r.id === selectedRouteId);
    if (selectedIndex < 0) return;

    const nextIndex = (selectedIndex + offset + routeAlternatives.length) % routeAlternatives.length;
    const nextRoute = routeAlternatives[nextIndex];
    if (!nextRoute) return;
    applyRouteSelection(nextRoute.id);
  }, [applyRouteSelection, routeAlternatives, selectedRouteId]);

  useEffect(() => {
    return () => {
      if (routeSwitchUnlockTimerRef.current) {
        clearTimeout(routeSwitchUnlockTimerRef.current);
      }
      routeSwitchLockRef.current = false;
    };
  }, []);

  useEffect(() => {
    const idx = routeAlternatives.findIndex((r) => r.id === selectedRouteId);
    if (idx <= 0) setRouteMode('DIRECT');
    else if (idx === 1) setRouteMode('FLEXIBLE');
    else setRouteMode('WITH_STOPS');
  }, [selectedRouteId, routeAlternatives]);

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
  }, [step, TOTAL_STEPS, stepAnim, progressAnim]);

  useEffect(() => {
    if (form.vehicleId && !activeVehicles.some((v) => v.id === form.vehicleId)) {
      dispatch({ type: 'SET_VEHICLE', payload: '' });
    }
  }, [form.vehicleId, activeVehicles]);

  useEffect(() => {
    if (!form.origin || !form.destination) {
      setRouteAlternatives([]);
      return;
    }
    if (step !== 5) return;

    // Show a geometric fallback immediately while TomTom loads
    const fallback = buildRouteAlternativesFallback(form.origin, form.destination, waypoints);
    setRouteAlternatives(fallback);
    setSelectedRouteId(fallback[0]?.id ?? 'DIRECT');

    if (tomtomService.isConfigured()) {
      const stops = [
        { latitude: form.origin.latitude, longitude: form.origin.longitude },
        ...waypoints.map((w) => ({ latitude: w.latitude, longitude: w.longitude })),
        { latitude: form.destination.latitude, longitude: form.destination.longitude },
      ];
      tomtomService.calculateRouteAlternatives(stops, { maxPoints: 80, maxAlternatives: 2 })
        .then((alts) => {
          if (alts.length > 0) {
            setRouteAlternatives(alts);
            setSelectedRouteId(alts[0].id);
          }
        })
        .catch(() => { /* keep fallback */ });
    }
  }, [step, form.origin, form.destination, waypoints]);

  useEffect(() => {
    const selected = routeAlternatives.find((r) => r.id === selectedRouteId) ?? routeAlternatives[0];
    if (step !== 5 || !selected || selected.points.length < 2 || !routeMapRef.current) return;

    const timer = setTimeout(() => {
      routeMapRef.current?.fitToCoordinates(selected.points, {
        edgePadding: { top: 64, right: 48, bottom: 100, left: 48 },
        animated: true,
      });
    }, 120);

    return () => clearTimeout(timer);
  }, [step, routeAlternatives]);

  const searchLocationsInline = useCallback(
    async (target: 'origin' | 'destination', query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        if (target === 'origin') {
          setOriginResults([]);
          setSearchingOrigin(false);
        } else {
          setDestinationResults([]);
          setSearchingDestination(false);
        }
        return;
      }

      if (target === 'origin') {
        const seq = originSearchSeqRef.current + 1;
        originSearchSeqRef.current = seq;
        setSearchingOrigin(true);
        try {
          const results = await tomtomService.searchLocations(trimmed);
          if (originSearchSeqRef.current === seq) {
            setOriginResults(results);
          }
        } catch {
          if (originSearchSeqRef.current === seq) {
            setOriginResults([]);
          }
        } finally {
          if (originSearchSeqRef.current === seq) {
            setSearchingOrigin(false);
          }
        }
        return;
      }

      const seq = destinationSearchSeqRef.current + 1;
      destinationSearchSeqRef.current = seq;
      setSearchingDestination(true);
      try {
        const results = await tomtomService.searchLocations(trimmed);
        if (destinationSearchSeqRef.current === seq) {
          setDestinationResults(results);
        }
      } catch {
        if (destinationSearchSeqRef.current === seq) {
          setDestinationResults([]);
        }
      } finally {
        if (destinationSearchSeqRef.current === seq) {
          setSearchingDestination(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (originSearchDebounceRef.current) clearTimeout(originSearchDebounceRef.current);
    const q = originQuery.trim();
    if (q.length < 2) {
      setOriginResults([]);
      setSearchingOrigin(false);
      return;
    }
    originSearchDebounceRef.current = setTimeout(() => {
      searchLocationsInline('origin', q);
    }, 400);

    return () => {
      if (originSearchDebounceRef.current) clearTimeout(originSearchDebounceRef.current);
    };
  }, [originQuery, searchLocationsInline]);

  useEffect(() => {
    if (destinationSearchDebounceRef.current) clearTimeout(destinationSearchDebounceRef.current);
    const q = destinationQuery.trim();
    if (q.length < 2) {
      setDestinationResults([]);
      setSearchingDestination(false);
      return;
    }
    destinationSearchDebounceRef.current = setTimeout(() => {
      searchLocationsInline('destination', q);
    }, 400);

    return () => {
      if (destinationSearchDebounceRef.current) clearTimeout(destinationSearchDebounceRef.current);
    };
  }, [destinationQuery, searchLocationsInline]);

  // ── Location handlers ──

  const openLocationMapPicker = (target: 'origin' | 'destination') => {
    setLocationPicker({ visible: true, target });
  };

  // Origin-specific: if the suggestion is a municipality, open the map so the
  // user can pin the exact pickup point. For addresses and POIs, confirm immediately.
  const handleOriginSuggestionSelect = (item: LocationSearchResult) => {
    if (item.locationType === 'municipality') {
      setOriginResults([]);
      setLocationPicker({
        visible: true,
        target: 'origin',
        municipalityFocus: { latitude: item.latitude, longitude: item.longitude, name: item.name },
      });
    } else {
      handleInlineLocationSelect('origin', {
        latitude: item.latitude,
        longitude: item.longitude,
        name: item.name,
        city: item.city,
        state: item.state,
        country: item.country,
      });
    }
  };

  // Destination-specific: if the suggestion is a municipality, open the map so the
  // user can pin the exact arrival/meeting point. For addresses and POIs, confirm immediately.
  const handleDestinationSuggestionSelect = (item: LocationSearchResult) => {
    if (item.locationType === 'municipality') {
      setDestinationResults([]);
      setLocationPicker({
        visible: true,
        target: 'destination',
        municipalityFocus: { latitude: item.latitude, longitude: item.longitude, name: item.name },
      });
    } else {
      handleInlineLocationSelect('destination', {
        latitude: item.latitude,
        longitude: item.longitude,
        name: item.name,
        city: item.city,
        state: item.state,
        country: item.country,
      });
    }
  };

  const handleInlineLocationSelect = (target: 'origin' | 'destination', loc: SelectedLocation) => {
    dispatch({
      type: target === 'origin' ? 'SET_ORIGIN' : 'SET_DESTINATION',
      payload: loc,
    });

    if (target === 'origin') {
      if (destinationSearchDebounceRef.current) clearTimeout(destinationSearchDebounceRef.current);
      destinationSearchSeqRef.current += 1;
      setOriginQuery(loc.name);
      setOriginResults([]);
      if (form.destination) {
        const sameCity = normalizePlace(form.destination.name) === normalizePlace(loc.name);
        const near = distanceKm(form.destination, loc) < 1;
        if (sameCity || near) {
          Alert.alert('Destino inválido', 'Elige un destino diferente al nuevo origen.');
        }
      }
      setSlideDirection('forward');
      setStep(3);
      return;
    }

    setDestinationQuery(loc.name);
    setDestinationResults([]);
    setSlideDirection('forward');
    setStep(4);
  };

  const addWaypoint = () => {
    if (!form.origin) {
      Alert.alert('Origen requerido', 'Primero selecciona el lugar de origen.');
      setStep(2);
      return;
    }
    setLocationPicker({ visible: true, target: 'waypoint' });
  };

  const moveWaypointUp = (idx: number) => {
    if (idx === 0) return;
    setWaypoints((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveWaypointDown = (idx: number) => {
    setWaypoints((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const handleLocationConfirm = (loc: SelectedLocation) => {
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

    setLocationPicker((p) => ({ ...p, visible: false, municipalityFocus: undefined }));
  };


  // ── Submit ──

  const handlePublish = async () => {
    if (!form.origin || !form.destination) {
      Alert.alert('Campos requeridos', 'Selecciona el origen y destino del viaje');
      return;
    }
    if (!form.vehicleId) {
      Alert.alert('Campos requeridos', 'Selecciona un vehículo para el viaje');
      return;
    }
    if (!form.pricePerSeat || parseInt(form.pricePerSeat) <= 0) {
      Alert.alert('Campos requeridos', 'Ingresa el precio por asiento');
      return;
    }
    if (!form.availableSeats || parseInt(form.availableSeats, 10) <= 0) {
      Alert.alert('Campos requeridos', 'Ingresa la cantidad de asientos disponibles');
      return;
    }
    if (form.departureAt <= new Date()) {
      Alert.alert('Fecha inválida', 'La fecha de salida debe ser en el futuro');
      return;
    }

    setSubmitting(true);
    try {
      // Build waypoints from TomTom route: cities added by user → isPickupPoint true,
      // all other route geometry points → false.
      let routeWaypoints: WaypointRequest[] = [];
      let travelTimeInSeconds: number | null = selectedRoute?.travelTimeInSeconds ?? null;
      try {
        const stops = [
          { latitude: form.origin.latitude, longitude: form.origin.longitude },
          ...waypoints.map((w) => ({ latitude: w.latitude, longitude: w.longitude })),
          { latitude: form.destination.latitude, longitude: form.destination.longitude },
        ];
        const { points: routePoints, travelTimeInSeconds: routeDuration } = await tomtomService.calculateRoute(stops);
        if (travelTimeInSeconds === null) travelTimeInSeconds = routeDuration;

        // Build all geometry waypoints from the TomTom route in order.
        const orderedWaypoints: WaypointRequest[] = routePoints.map((point) => ({
          latitude: point.latitude,
          longitude: point.longitude,
          orderIndex: 0, // assigned below
          name: `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`,
          isPickupPoint: false,
        }));

        // For each user-added city, find the nearest geometry point and replace
        // it with the pickup waypoint. This keeps the city in its correct
        // position along the route instead of appending it at the end.
        const usedIndices = new Set<number>();
        for (const city of waypoints) {
          let minDist = Infinity;
          let minIdx = -1;
          for (let i = 0; i < orderedWaypoints.length; i++) {
            if (usedIndices.has(i)) continue;
            const d = distanceKm(
              city,
              { latitude: orderedWaypoints[i].latitude, longitude: orderedWaypoints[i].longitude, name: '' },
            );
            if (d < minDist) {
              minDist = d;
              minIdx = i;
            }
          }
          if (minIdx >= 0) {
            usedIndices.add(minIdx);
            orderedWaypoints[minIdx] = {
              latitude: city.latitude,
              longitude: city.longitude,
              orderIndex: 0,
              name: city.name,
              subtitle: locationSubtitle(city) || undefined,
              isPickupPoint: true,
            };
          }
        }

        // Assign final sequential indices
        routeWaypoints = orderedWaypoints.map((wp, idx) => ({
          ...wp,
          orderIndex: idx,
        }));
      } catch (routeErr) {
        console.warn('[TomTom] Route calculation failed, using user waypoints only:', routeErr);
        routeWaypoints = waypoints.map((w, idx) => ({
          latitude: w.latitude,
          longitude: w.longitude,
          orderIndex: idx,
          name: w.name,
          subtitle: locationSubtitle(w) || undefined,
          isPickupPoint: true,
        }));
      }

      const arrivedAt = travelTimeInSeconds !== null
        ? new Date(form.departureAt.getTime() + travelTimeInSeconds * 1000).toISOString()
        : undefined;

      const createTripBody = {
        tripType,
        originName: form.origin.name,
        originSubtitle: locationSubtitle(form.origin) || undefined,
        originLatitude: form.origin.latitude,
        originLongitude: form.origin.longitude,
        destinationName: form.destination.name,
        destinationSubtitle: locationSubtitle(form.destination) || undefined,
        destinationLatitude: form.destination.latitude,
        destinationLongitude: form.destination.longitude,
        departureAt: form.departureAt.toISOString(),
        arrivedAt,
        availableSeats: parseInt(form.availableSeats, 10),
        pricePerSeat: parseFloat(form.pricePerSeat),
        currency: 'COP',
        vehicleId: form.vehicleId,
        allowsLuggage: form.allowsLuggage,
        studentsOnly: tripType === 'ROUTINE' ? form.studentsOnly : false,
        waypoints: routeWaypoints,
      };
      const { data: createRes } = await tripsApi.create(createTripBody);

      if (!createRes.data) throw new Error('Error al crear viaje');
      await tripsApi.publish(createRes.data.id);

      Toast.show({
        type: 'success',
        text1: '¡Viaje publicado!',
        text2: 'Tu viaje ya es visible para pasajeros',
      });

      dispatch({ type: 'RESET' });
      setWaypoints([]);
      setRouteMode('DIRECT');
      setSelectedRouteId('DIRECT');
      setStep(1);
      router.push('/(tabs)/my-trips');
    } catch (err: any) {
      Alert.alert(
        'Error al publicar',
        err?.response?.data?.message ?? 'No se pudo publicar el viaje. Intenta nuevamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──

  const isStepValid = (current: number) => {
    if (current === 2) return !!form.origin;
    if (current === 3) {
      if (!form.origin || !form.destination) return false;
      const sameCity = normalizePlace(form.origin.name) === normalizePlace(form.destination.name);
      const near = distanceKm(form.origin, form.destination) < 1;
      return !sameCity && !near;
    }
    if (current === 4) return true;
    if (current === 5) return routeAlternatives.length > 0 && !!selectedRouteId;
    if (current === 6) return form.departureAt > new Date();
    if (current === 7) {
      return (
        !!form.availableSeats &&
        parseInt(form.availableSeats, 10) > 0 &&
        !!form.pricePerSeat &&
        parseInt(form.pricePerSeat, 10) > 0
      );
    }
    if (current === 8) return !!form.vehicleId;
    if (current === 9) return true;
    return true;
  };

  const goNext = () => {
    if (!isStepValid(step)) {
      if (step === 2) Alert.alert('Falta el origen', 'Selecciona el lugar de origen.');
      if (step === 3) Alert.alert('Destino inválido', 'El destino no puede ser la misma ciudad de origen.');
      if (step === 5) Alert.alert('Ruta requerida', 'Selecciona una alternativa de ruta en el mapa.');
      if (step === 6) Alert.alert('Fecha inválida', 'Selecciona una fecha y hora futura.');
      if (step === 7) Alert.alert('Datos incompletos', 'Completa asientos y precio.');
      if (step === 8) Alert.alert('Vehículo requerido', 'Selecciona el vehículo para este viaje.');
      return;
    }
    setSlideDirection('forward');
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const goBack = () => {
    setSlideDirection('backward');
    setStep((s) => Math.max(1, s - 1));
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <>
          <Text className="text-sm font-semibold text-neutral-700 mb-2">Tipo de viaje</Text>
          <View className="flex-row gap-2 mb-2">
            {tripTypeOptions.map((opt) => (
              <TouchableOpacity
                key={opt.type}
                onPress={() => setTripType(opt.type)}
                className={`flex-1 items-center py-4 rounded-xl border-2 ${tripType === opt.type
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 bg-white'
                  }`}
              >
                {opt.icon}
                <Text
                  className={`text-xs font-medium mt-1 ${tripType === opt.type ? 'text-primary-700' : 'text-neutral-600'
                    }`}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-xs text-neutral-500">Puedes cambiarlo más adelante antes de publicar.</Text>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <Text className="text-sm font-semibold text-neutral-700 mb-2">Lugar de origen</Text>
          <Input
            placeholder="Escribe ciudad o lugar"
            value={originQuery}
            onChangeText={setOriginQuery}
            leftIcon={<Search size={18} color={Colors.neutral[400]} />}
          />

          <TouchableOpacity
            onPress={() => openLocationMapPicker('origin')}
            className="flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-3 mt-2"
          >
            <View className="flex-row items-center">
              <MapPin size={16} color={Colors.primary[600]} />
              <Text className="text-sm text-neutral-700 ml-2">Seleccionar desde el mapa</Text>
            </View>
          </TouchableOpacity>

          {searchingOrigin && (
            <Text className="text-xs text-neutral-500 mt-2">Buscando ubicaciones...</Text>
          )}

          {!searchingOrigin && originResults.length > 0 && (
            <View className="mt-2 rounded-xl border border-neutral-200 overflow-hidden bg-white">
              {originResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleOriginSuggestionSelect(item)}
                  className="px-3 py-3 border-b border-neutral-100"
                >
                  <Text className="text-sm font-medium text-neutral-900" numberOfLines={1}>{item.name}</Text>
                  <Text className="text-xs text-neutral-500 mt-1" numberOfLines={1}>{item.address}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {form.origin && (
            <View className="px-3 py-3 rounded-xl border border-primary-200 bg-primary-50 mt-2">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-primary-500 mr-2" />
                <Text className="text-sm font-medium text-neutral-900 flex-1" numberOfLines={1}>{form.origin.name}</Text>
              </View>
              {locationSubtitle(form.origin) ? (
                <Text className="text-xs text-neutral-500 mt-0.5 ml-4" numberOfLines={1}>{locationSubtitle(form.origin)}</Text>
              ) : null}
            </View>
          )}
        </>
      );
    }

    if (step === 3) {
      const invalidDestination =
        !!form.origin &&
        !!form.destination &&
        (normalizePlace(form.origin.name) === normalizePlace(form.destination.name) ||
          distanceKm(form.origin, form.destination) < 1);

      return (
        <>
          <Text className="text-sm font-semibold text-neutral-700 mb-2">Lugar de destino</Text>
          <Input
            placeholder="Escribe ciudad o lugar"
            value={destinationQuery}
            onChangeText={setDestinationQuery}
            leftIcon={<Search size={18} color={Colors.neutral[400]} />}
          />

          <TouchableOpacity
            onPress={() => openLocationMapPicker('destination')}
            className="flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-3 mt-2"
          >
            <View className="flex-row items-center">
              <MapPin size={16} color={Colors.accent[600]} />
              <Text className="text-sm text-neutral-700 ml-2">Seleccionar desde el mapa</Text>
            </View>
          </TouchableOpacity>

          {searchingDestination && (
            <Text className="text-xs text-neutral-500 mt-2">Buscando ubicaciones...</Text>
          )}

          {!searchingDestination && destinationResults.length > 0 && (
            <View className="mt-2 rounded-xl border border-neutral-200 overflow-hidden bg-white">
              {destinationResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleDestinationSuggestionSelect(item)}
                  className="px-3 py-3 border-b border-neutral-100"
                >
                  <Text className="text-sm font-medium text-neutral-900" numberOfLines={1}>{item.name}</Text>
                  <Text className="text-xs text-neutral-500 mt-1" numberOfLines={1}>{item.address}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {form.destination && (
            <View
              className={`px-3 py-3 rounded-xl border mt-2 ${invalidDestination
                ? 'border-red-300 bg-red-50'
                : 'border-accent-200 bg-accent-50'
                }`}
            >
              <View className="flex-row items-center">
                <View className={`w-2.5 h-2.5 rounded-full mr-2 ${invalidDestination ? 'bg-red-500' : 'bg-accent-500'}`} />
                <Text className="text-sm font-medium text-neutral-900 flex-1" numberOfLines={1}>{form.destination.name}</Text>
              </View>
              {!invalidDestination && locationSubtitle(form.destination) ? (
                <Text className="text-xs text-neutral-500 mt-0.5 ml-4" numberOfLines={1}>{locationSubtitle(form.destination)}</Text>
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
    }

    if (step === 5) {
      const selectedAlt = selectedRoute;
      const selectedIndex = Math.max(0, routeAlternatives.findIndex((r) => r.id === selectedRouteId));

      return (
        <>
          <Text className="text-sm font-semibold text-neutral-700 mb-2">Selección de ruta</Text>
          {!form.origin || !form.destination ? (
            <Card>
              <Text className="text-sm text-neutral-500">Define origen y destino para ver alternativas de ruta.</Text>
            </Card>
          ) : (
            <>
              <View className="rounded-2xl overflow-hidden border border-neutral-200 bg-white" style={{ height: 520 }}>
                <MapView
                  ref={routeMapRef}
                  style={{ flex: 1 }}
                  scrollEnabled
                  zoomEnabled
                  rotateEnabled={false}
                  pitchEnabled={false}
                  toolbarEnabled={false}
                  initialRegion={{
                    latitude: (form.origin.latitude + form.destination.latitude) / 2,
                    longitude: (form.origin.longitude + form.destination.longitude) / 2,
                    latitudeDelta: Math.max(Math.abs(form.origin.latitude - form.destination.latitude) * 1.8, 0.2),
                    longitudeDelta: Math.max(Math.abs(form.origin.longitude - form.destination.longitude) * 1.8, 0.2),
                  } as Region}
                >
                  <Marker coordinate={{ latitude: form.origin.latitude, longitude: form.origin.longitude }} title="Origen" />
                  {waypoints.map((w, idx) => (
                    <Marker
                      key={`wp-${idx}`}
                      coordinate={{ latitude: w.latitude, longitude: w.longitude }}
                      title={`Parada ${idx + 1}: ${w.name}`}
                      pinColor="#F59E0B"
                    />
                  ))}
                  <Marker coordinate={{ latitude: form.destination.latitude, longitude: form.destination.longitude }} title="Destino" pinColor={Colors.accent[500]} />
                  {selectedAlt && (
                    <Polyline
                      coordinates={selectedAlt.points}
                      strokeWidth={6}
                      strokeColor="#2563EB"
                      lineCap="round"
                      lineJoin="round"
                    />
                  )}
                </MapView>

                {/* Route selector overlay */}
                {routeAlternatives.length > 0 && selectedAlt && (
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
                      ...({ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 }),
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <TouchableOpacity
                        onPress={() => applyRouteSelectionByOffset(-1)}
                        disabled={isRouteSwitchLocked || routeAlternatives.length < 2}
                        style={{
                          width: 36, height: 36, borderRadius: 18,
                          backgroundColor: isRouteSwitchLocked || routeAlternatives.length < 2 ? '#f5f5f5' : '#fff',
                          borderWidth: 1, borderColor: '#e5e5e5',
                          alignItems: 'center', justifyContent: 'center',
                          opacity: isRouteSwitchLocked || routeAlternatives.length < 2 ? 0.5 : 1,
                        }}
                      >
                        <ArrowLeft size={16} color={Colors.neutral[700]} />
                      </TouchableOpacity>

                      <View style={{ flex: 1, marginHorizontal: 8 }}>
                        <Text className="text-sm font-semibold text-neutral-900 text-center">{selectedAlt.title}</Text>
                        <Text className="text-xs text-neutral-500 text-center mt-0.5">
                          {selectedAlt.distanceKm.toFixed(1)} km · {fmtDuration(selectedAlt.durationMin)} · {selectedAlt.hasTolls ? 'Con peajes' : 'Sin peajes'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => applyRouteSelectionByOffset(1)}
                        disabled={isRouteSwitchLocked || routeAlternatives.length < 2}
                        style={{
                          width: 36, height: 36, borderRadius: 18,
                          backgroundColor: isRouteSwitchLocked || routeAlternatives.length < 2 ? '#f5f5f5' : '#fff',
                          borderWidth: 1, borderColor: '#e5e5e5',
                          alignItems: 'center', justifyContent: 'center',
                          opacity: isRouteSwitchLocked || routeAlternatives.length < 2 ? 0.5 : 1,
                        }}
                      >
                        <ChevronRight size={16} color={Colors.neutral[700]} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={goNext}
                        disabled={submitting}
                        activeOpacity={0.85}
                        style={{
                          width: 40, height: 40, borderRadius: 20,
                          backgroundColor: Colors.primary[500],
                          alignItems: 'center', justifyContent: 'center',
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
          )}
        </>
      );
    }

    if (step === 4) {
      return (
        <>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-neutral-700">Ciudades intermedias</Text>
            <TouchableOpacity onPress={addWaypoint} className="flex-row items-center">
              <Plus size={16} color={Colors.primary[600]} />
              <Text className="text-xs font-semibold text-primary-600 ml-1">Agregar</Text>
            </TouchableOpacity>
          </View>

          {/* Origin anchor */}
          <View className="flex-row items-start px-3 py-2.5 rounded-xl border border-primary-200 bg-primary-50 mb-2">
            <View className="w-2.5 h-2.5 rounded-full bg-primary-500 mr-2" />
            <View className="flex-1">
              <Text className="text-[10px] text-primary-600 font-medium">ORIGEN</Text>
              <Text className="text-sm font-medium text-neutral-900" numberOfLines={1}>{form.origin?.name}</Text>
              {form.origin && locationSubtitle(form.origin) ? (
                <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>{locationSubtitle(form.origin)}</Text>
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
                    <Text className="text-[10px] text-neutral-400 font-medium">PARADA {idx + 1}</Text>
                    <Text className="text-sm font-medium text-neutral-900" numberOfLines={1}>{w.name}</Text>
                    {locationSubtitle(w) ? (
                      <Text className="text-xs text-neutral-400 mt-0.5" numberOfLines={1}>{locationSubtitle(w)}</Text>
                    ) : null}
                  </View>
                  <View className="flex-row items-center gap-1">
                    <TouchableOpacity
                      onPress={() => moveWaypointUp(idx)}
                      disabled={idx === 0}
                      className={`w-7 h-7 rounded-lg border items-center justify-center ${idx === 0 ? 'border-neutral-100 opacity-30' : 'border-neutral-200'}`}
                    >
                      <ChevronUp size={14} color={Colors.neutral[600]} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveWaypointDown(idx)}
                      disabled={idx === waypoints.length - 1}
                      className={`w-7 h-7 rounded-lg border items-center justify-center ${idx === waypoints.length - 1 ? 'border-neutral-100 opacity-30' : 'border-neutral-200'}`}
                    >
                      <ChevronDown size={14} color={Colors.neutral[600]} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setWaypoints((prev) => prev.filter((_, i) => i !== idx))}
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
              <Text className="text-[10px] text-accent-600 font-medium">DESTINO</Text>
              <Text className="text-sm font-medium text-neutral-900" numberOfLines={1}>{form.destination?.name}</Text>
              {form.destination && locationSubtitle(form.destination) ? (
                <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>{locationSubtitle(form.destination)}</Text>
              ) : null}
            </View>
          </View>
        </>
      );
    }

    if (step === 6) {
      return (
        <>
          <Text className="text-sm font-semibold text-neutral-700 mb-2">Día y hora de salida</Text>
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
                  <Text className="text-sm font-medium text-neutral-900">{fmtDate(form.departureAt)}</Text>
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
                  <Text className="text-sm font-medium text-neutral-900">{fmtTime(form.departureAt)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
          {form.departureAt <= new Date() && (
            <Text className="text-xs text-red-500">La salida debe ser en una fecha futura.</Text>
          )}
        </>
      );
    }

    if (step === 7) {
      return (
        <>
          <View className="flex-row gap-3 mb-5">
            <View className="flex-1">
              <Input
                label="Asientos disponibles"
                placeholder="3"
                keyboardType="number-pad"
                value={form.availableSeats}
                onChangeText={(v) => dispatch({ type: 'SET_SEATS', payload: v.replace(/\D/g, '') })}
                leftIcon={<Users size={18} color={Colors.neutral[400]} />}
              />
            </View>
            <View className="flex-1">
              <Input
                label="Precio / asiento (COP)"
                placeholder="50000"
                keyboardType="number-pad"
                value={form.pricePerSeat}
                onChangeText={(v) => dispatch({ type: 'SET_PRICE', payload: v.replace(/\D/g, '') })}
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
                <Text className="text-base text-neutral-800 ml-3">Permite equipaje</Text>
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
                  <Text className="text-base text-neutral-800 ml-3">Solo estudiantes</Text>
                </View>
                <Toggle
                  value={form.studentsOnly}
                  onPress={() => dispatch({ type: 'TOGGLE_STUDENTS' })}
                />
              </TouchableOpacity>
            ) : (
              <View className="py-1">
                <Text className="text-xs text-neutral-500">
                  Para viajes interurbanos no se aplica restricción de solo estudiantes.
                </Text>
              </View>
            )}
          </Card>
        </>
      );
    }

    if (step === 8) {
      return (
        <>
          <Text className="text-sm font-semibold text-neutral-700 mb-2">Selecciona tu vehículo</Text>
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
                        {hasRegisteredVehicles ? 'Ver mis vehículos' : 'Registrar uno'}
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
                        Alert.alert('Vehículo no disponible', 'Solo puedes seleccionar vehículos activos.');
                        return;
                      }
                      dispatch({ type: 'SET_VEHICLE', payload: v.id });
                    }}
                    activeOpacity={0.7}
                    className={`flex-row items-center p-3 rounded-2xl border-2 mb-2 ${active ? 'bg-white' : 'bg-neutral-50'} ${selected ? 'border-primary-500' : 'border-neutral-200'
                      }`}
                  >
                    <View className="w-12 h-12 rounded-xl bg-primary-50 items-center justify-center mr-3">
                      <Car size={22} color={Colors.primary[400]} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-neutral-900">{v.brand} {v.model} {v.year}</Text>
                      <Text className="text-xs text-neutral-500 mt-0.5">{v.color}</Text>
                      <View className={`rounded px-1.5 py-0.5 self-start mt-1 ${active ? 'bg-primary-50' : 'bg-neutral-200'}`}>
                        <Text className={`text-xs font-bold ${active ? 'text-primary-700' : 'text-neutral-600'}`}>{v.plateNumber}</Text>
                      </View>
                      <Text className={`text-xs mt-1 ${active ? 'text-emerald-600' : 'text-amber-600'}`}>
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
    }

    return (
      <>
        <Text className="text-lg font-bold text-neutral-900 mb-3">Resumen del viaje</Text>

        <View style={{ gap: 5 }}>
          <Card className="bg-primary-50 border border-primary-100">
            <View className="flex-row items-center">
              <Bus size={20} color={Colors.primary[700]} />
              <View className="ml-3">
                <Text className="text-xs text-neutral-500">Tipo y ruta</Text>
                <Text className="text-base font-semibold text-neutral-900">{tripTypeLabel} · {routeModeLabel}</Text>
              </View>
            </View>
          </Card>

          <Card>
            <View className="flex-row gap-3">
              <View className="flex-1 flex-row items-start">
                <Map size={18} color={Colors.neutral[700]} className="mt-0.5" />
                <View className="ml-2 flex-1">
                  <Text className="text-xs text-neutral-500">Origen</Text>
                  <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>{form.origin?.name ?? 'Sin definir'}</Text>
                  {form.origin && locationSubtitle(form.origin) ? (
                    <Text className="text-xs text-neutral-400 mt-0.5" numberOfLines={1}>{locationSubtitle(form.origin)}</Text>
                  ) : null}
                </View>
              </View>
              <View className="flex-1 flex-row items-start">
                <Map size={18} color={Colors.accent[600]} className="mt-0.5" />
                <View className="ml-2 flex-1">
                  <Text className="text-xs text-neutral-500">Destino</Text>
                  <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>{form.destination?.name ?? 'Sin definir'}</Text>
                  {form.destination && locationSubtitle(form.destination) ? (
                    <Text className="text-xs text-neutral-400 mt-0.5" numberOfLines={1}>{locationSubtitle(form.destination)}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          </Card>

          <Card>
            <View className="flex-row">
              <View className="flex-1">
                <Text className="text-xs text-neutral-500">Distancia</Text>
                <Text className="text-lg font-bold text-neutral-900">{selectedRoute ? `${selectedRoute.distanceKm.toFixed(1)} km` : '-'}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-neutral-500">Tiempo estimado</Text>
                <Text className="text-lg font-bold text-neutral-900">{selectedRoute ? fmtDuration(selectedRoute.durationMin) : '-'}</Text>
              </View>
            </View>
          </Card>

          <Card>
            <View className="flex-row items-center">
              <Calendar size={20} color={Colors.neutral[700]} />
              <View className="ml-3">
                <Text className="text-xs text-neutral-500">Salida</Text>
                <Text className="text-base font-semibold text-neutral-900">{fmtDate(form.departureAt)} · {fmtTime(form.departureAt)}</Text>
              </View>
            </View>
          </Card>

          <Card>
            <View className="flex-row">
              <View className="flex-row items-center flex-1">
                <Users size={18} color={Colors.neutral[700]} />
                <View className="ml-2">
                  <Text className="text-xs text-neutral-500">Asientos</Text>
                  <Text className="text-base font-semibold text-neutral-900">{form.availableSeats || '0'}</Text>
                </View>
              </View>
              <View className="flex-row items-center flex-1">
                <DollarSign size={18} color={Colors.neutral[700]} />
                <View className="ml-2">
                  <Text className="text-xs text-neutral-500">Precio</Text>
                  <Text className="text-base font-semibold text-neutral-900">COP ${form.pricePerSeat || '0'}</Text>
                </View>
              </View>
            </View>
          </Card>

          <Card>
            <View className="flex-row items-center">
              <Car size={20} color={Colors.neutral[700]} />
              <View className="ml-3 flex-1">
                <Text className="text-xs text-neutral-500">Vehículo</Text>
                <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
                  {selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.plateNumber})` : 'Sin seleccionar'}
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
              <Text className="text-sm font-semibold text-neutral-900">{form.allowsLuggage ? 'Permitido' : 'No permitido'}</Text>
            </View>
            {tripType === 'ROUTINE' && (
              <View className="flex-row items-center justify-between mt-3">
                <View className="flex-row items-center">
                  <GraduationCap size={18} color={Colors.neutral[700]} />
                  <Text className="text-sm text-neutral-700 ml-2">Solo estudiantes</Text>
                </View>
                <Text className="text-sm font-semibold text-neutral-900">{form.studentsOnly ? 'Sí' : 'No'}</Text>
              </View>
            )}
          </Card>
        </View>
      </>
    );
  };

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
          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-neutral-900">Publicar viaje</Text>
          </View>

          <View className="mb-5">
            <View className="mb-2">
              <TouchableOpacity
                onPress={goBack}
                disabled={step === 1 || submitting}
                className={`w-9 h-9 rounded-full border border-neutral-200 bg-white items-center justify-center ${step === 1 ? 'opacity-30' : 'opacity-100'}`}
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
                      outputRange: [slideDirection === 'forward' ? 24 : -24, 0],
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
              next.setHours(form.departureAt.getHours(), form.departureAt.getMinutes(), 0, 0);
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

          <View className={step < TOTAL_STEPS ? 'items-end' : 'items-center'}>
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
                onPress={handlePublish}
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

      {/* Location Picker Modal */}
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
        onClose={() => setLocationPicker((p) => ({ ...p, visible: false, municipalityFocus: undefined }))}
        initial={locationPicker.target === 'origin' ? form.origin : form.destination}
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
