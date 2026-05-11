import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useLocationSearch } from '@/hooks/useLocationSearch';
import { useRouteAlternatives } from '@/hooks/useRouteAlternatives';
import {
  isStepValid,
  STEP_VALIDATION_MESSAGES,
  type PublishForm,
  type PublishAction,
} from '@/hooks/usePublishForm';
import { mapsService } from '@/lib/maps';
import { distanceKm, normalizePlace } from '@/lib/utils';
import { TRIP_TYPE_OPTIONS } from '@/constants/trips';
import type { SelectedLocation } from '@/components/LocationPickerModal';
import type { LocationSearchResult } from '@/lib/maps';
import type { TripType } from '@/types/api';

export const TOTAL_STEPS = 9;

interface UsePublishScreenParams {
  form: PublishForm;
  dispatch: React.Dispatch<PublishAction>;
  waypoints: SelectedLocation[];
  setWaypoints: React.Dispatch<React.SetStateAction<SelectedLocation[]>>;
  submitting: boolean;
  tripType: TripType;
}

export function usePublishScreen({
  form,
  dispatch,
  waypoints,
  setWaypoints,
  submitting,
  tripType,
}: UsePublishScreenParams) {
  const originSearch = useLocationSearch();
  const destinationSearch = useLocationSearch();

  const [step, setStep] = useState(1);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');

  const [locationPicker, setLocationPicker] = useState<{
    visible: boolean;
    target: 'origin' | 'destination' | 'waypoint';
    municipalityFocus?: { latitude: number; longitude: number; name: string; delta?: number; };
    initialLocation?: SelectedLocation;
  }>({ visible: false, target: 'origin' });

  // ── Route alternatives (only active on step 5) ──

  const routeHook = useRouteAlternatives(form.origin, form.destination, waypoints, step === 5);

  // ── Animations (Reanimated 4 — runs on the UI thread) ──

  const stepOpacity = useSharedValue(1);
  const stepTranslateX = useSharedValue(0);
  const progressValue = useSharedValue(1 / TOTAL_STEPS);

  useEffect(() => {
    const offsetX = slideDirection === 'forward' ? 24 : -24;
    // Snap to entry position, then animate to resting position.
    stepOpacity.value = 0;
    stepTranslateX.value = offsetX;
    stepOpacity.value = withTiming(1, { duration: 260 });
    stepTranslateX.value = withTiming(0, { duration: 260 });
    progressValue.value = withTiming(step / TOTAL_STEPS, { duration: 300 });
  }, [step, slideDirection]);

  // ── Derived ──

  const tripTypeLabel =
    TRIP_TYPE_OPTIONS.find((opt) => opt.type === tripType)?.label ?? tripType;

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
            Alert.alert('Destino inválido', 'Elige un destino diferente al nuevo origen.');
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

  const detailsAbortRef = useRef<AbortController | null>(null);

  const handleSuggestionSelect = useCallback(
    async (target: 'origin' | 'destination', item: LocationSearchResult) => {
      const searchHook = target === 'origin' ? originSearch : destinationSearch;

      let resolved = item;

      // Google Places results have latitude/longitude = 0 — real coordinates
      // must be fetched via Place Details before we can use them.
      if (item.placeId) {
        detailsAbortRef.current?.abort();
        detailsAbortRef.current = new AbortController();
        searchHook.setSearching(true);
        searchHook.clear();
        try {
          const details = await mapsService.fetchPlaceDetails(item.placeId);
          resolved = { ...item, ...details };
        } catch {
          searchHook.setSearching(false);
          Alert.alert('Error', 'No se pudo obtener la ubicación. Intenta de nuevo.');
          return;
        }
        searchHook.setSearching(false);
      } else {
        searchHook.clear();
      }

      if (resolved.locationType === 'municipality') {
        setLocationPicker({
          visible: true,
          target,
          municipalityFocus: {
            latitude: resolved.latitude,
            longitude: resolved.longitude,
            name: resolved.name,
          },
        });
      } else {
        setLocationPicker({
          visible: true,
          target,
          municipalityFocus: {
            latitude: resolved.latitude,
            longitude: resolved.longitude,
            name: resolved.name,
            delta: 0.00625,
          },
          initialLocation: {
            latitude: resolved.latitude,
            longitude: resolved.longitude,
            name: resolved.name,
            city: resolved.city,
            state: resolved.state,
            country: resolved.country,
          },
        });
      }
    },
    [originSearch, destinationSearch],
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
        initialLocation: undefined,
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

  return {
    originSearch,
    destinationSearch,
    routeHook,
    step,
    setStep,
    // Reanimated shared values — use with useAnimatedStyle in the screen component
    stepOpacity,
    stepTranslateX,
    progressValue,
    locationPicker,
    setLocationPicker,
    tripTypeLabel,
    goNext,
    goBack,
    handleInlineLocationSelect,
    handleSuggestionSelect,
    handleLocationConfirm,
    addWaypoint,
    moveWaypointUp,
    moveWaypointDown,
  };
}
