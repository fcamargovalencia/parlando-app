import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import MapView from 'react-native-maps';
import type { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { tomtomService, type LocationSearchResult } from '@/lib/tomtom';

// ── Shared type (re-exported from LocationPickerModal for backward compat) ──

export interface SelectedLocation {
  latitude: number;
  longitude: number;
  name: string;
  subtitle?: string;
  city?: string;
  state?: string;
  country?: string;
}

// ── Constants ──

export const COLOMBIA_REGION: Region = {
  latitude: 4.5709,
  longitude: -74.2973,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

// ── Hook ──

interface UseLocationPickerOptions {
  visible: boolean;
  initial?: SelectedLocation | null;
  mode?: 'full' | 'map-only';
  municipalityFocus?: { latitude: number; longitude: number; name: string; };
  allowCitySelection?: boolean;
  onConfirm: (loc: SelectedLocation) => void;
}

export function useLocationPicker({
  visible,
  initial,
  mode = 'full',
  municipalityFocus,
  allowCitySelection = false,
  onConfirm,
}: UseLocationPickerOptions) {
  // ── Search state ──
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number; } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Map state ──
  const [mapVisible, setMapVisible] = useState(false);
  const [centerCoord, setCenterCoord] = useState<{ latitude: number; longitude: number; } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mapName, setMapName] = useState('');
  const [mapCity, setMapCity] = useState<string | undefined>(undefined);
  const [mapState, setMapState] = useState<string | undefined>(undefined);
  const [mapCountry, setMapCountry] = useState<string | undefined>(undefined);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [municipalityCenter, setMunicipalityCenter] = useState<{
    latitude: number;
    longitude: number;
    name: string;
  } | null>(null);

  const mapRef = useRef<MapView>(null);
  const reverseSeqRef = useRef(0);
  const reverseDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocodedCoordRef = useRef<{ latitude: number; longitude: number; } | null>(null);
  const isProgrammaticRef = useRef(false);
  const mapReadyRef = useRef(false);
  const pendingRegionRef = useRef<Region | null>(null);

  // ── Map animation queue ──

  const animateWhenReady = useCallback((region: Region) => {
    isProgrammaticRef.current = true;
    if (mapReadyRef.current && mapRef.current) {
      mapRef.current.animateToRegion(region, 600);
    } else {
      pendingRegionRef.current = region;
    }
  }, []);

  const handleMapReady = useCallback(() => {
    mapReadyRef.current = true;
    if (pendingRegionRef.current) {
      isProgrammaticRef.current = true;
      mapRef.current?.animateToRegion(pendingRegionRef.current, 600);
      pendingRegionRef.current = null;
    }
  }, []);

  // ── Reset on modal open/close ──

  useEffect(() => {
    if (!visible) {
      mapReadyRef.current = false;
      pendingRegionRef.current = null;
      isProgrammaticRef.current = false;
      lastGeocodedCoordRef.current = null;
      if (reverseDebounceRef.current) clearTimeout(reverseDebounceRef.current);
      return;
    }
    mapReadyRef.current = false;
    pendingRegionRef.current = null;
    isProgrammaticRef.current = false;
    lastGeocodedCoordRef.current = null;
    setQuery(initial?.name ?? '');
    setResults([]);
    setMapVisible(mode === 'map-only');
    setCenterCoord(initial ? { latitude: initial.latitude, longitude: initial.longitude } : null);
    setIsDragging(false);
    setMapName(initial?.name ?? '');
    setMapCity(initial?.city);
    setMapState(initial?.state);
    setMapCountry(initial?.country);
    setMunicipalityCenter(municipalityFocus ?? null);

    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getLastKnownPositionAsync();
        if (loc) {
          setUserCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch { }
    })();
  }, [visible, initial, mode, municipalityFocus]);

  // ── Debounced search ──

  const doSearch = useCallback(async (q: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setSearching(true);
    try {
      const searchResults = await tomtomService.searchLocations(q, userCoords ?? undefined);
      setResults(searchResults);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setResults([]);
    } finally {
      setSearching(false);
    }
  }, [userCoords]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(q), 420);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  // ── Handlers ──

  const handleSelectSuggestion = useCallback((result: LocationSearchResult) => {
    if (result.locationType !== 'specific' && !allowCitySelection) {
      setCenterCoord(null);
      setMapName('');
      setMunicipalityCenter({ latitude: result.latitude, longitude: result.longitude, name: result.name });
      setMapVisible(true);
    } else {
      onConfirm({
        latitude: result.latitude,
        longitude: result.longitude,
        name: result.name,
        city: result.city,
        state: result.state,
        country: result.country,
      });
    }
  }, [allowCitySelection, onConfirm]);

  const handleUseMyLocation = useCallback(async () => {
    setLocating(true);
    try {
      let coords = userCoords;
      if (!coords) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permisos', 'Necesitamos permiso para acceder a tu ubicación');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserCoords(coords);
      }
      const result = await tomtomService.reverseGeocode(coords.latitude, coords.longitude);
      onConfirm({ ...coords, name: result.name, city: result.city, state: result.state, country: result.country });
    } catch {
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
    } finally {
      setLocating(false);
    }
  }, [userCoords, onConfirm]);

  const openMap = useCallback(() => setMapVisible(true), []);

  const handleRegionChange = useCallback((region: Region) => {
    if (isProgrammaticRef.current) return;
    setIsDragging(true);
    setCenterCoord({ latitude: region.latitude, longitude: region.longitude });
  }, []);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    isProgrammaticRef.current = false;
    setIsDragging(false);
    const coord = { latitude: region.latitude, longitude: region.longitude };
    setCenterCoord(coord);

    const last = lastGeocodedCoordRef.current;
    const movedEnough =
      !last ||
      Math.abs(coord.latitude - last.latitude) > 0.0002 ||
      Math.abs(coord.longitude - last.longitude) > 0.0002;

    if (!movedEnough) return;

    if (reverseDebounceRef.current) clearTimeout(reverseDebounceRef.current);
    const seq = ++reverseSeqRef.current;

    reverseDebounceRef.current = setTimeout(async () => {
      setReverseGeocoding(true);
      try {
        const result = await tomtomService.reverseGeocode(coord.latitude, coord.longitude);
        if (reverseSeqRef.current === seq) {
          setMapName(result.name);
          setMapCity(result.city);
          setMapState(result.state);
          setMapCountry(result.country);
          lastGeocodedCoordRef.current = coord;
        }
      } catch { }
      if (reverseSeqRef.current === seq) setReverseGeocoding(false);
    }, 700);
  }, []);

  const handleMapConfirm = useCallback(() => {
    if (!centerCoord) return;
    onConfirm({
      latitude: centerCoord.latitude,
      longitude: centerCoord.longitude,
      name: mapName.trim() || 'Ubicación seleccionada',
      city: mapCity,
      state: mapState,
      country: mapCountry,
    });
    setMapVisible(false);
  }, [centerCoord, mapName, mapCity, mapState, mapCountry, onConfirm]);

  // ── Map open: GPS animation ──

  useEffect(() => {
    if (!mapVisible) {
      mapReadyRef.current = false;
      pendingRegionRef.current = null;
      return;
    }

    if (municipalityCenter) {
      animateWhenReady({
        latitude: municipalityCenter.latitude,
        longitude: municipalityCenter.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          const fallback = initial ? { latitude: initial.latitude, longitude: initial.longitude } : null;
          if (fallback) animateWhenReady({ ...fallback, latitudeDelta: 0.003, longitudeDelta: 0.003 });
          return;
        }

        const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
        if (cancelled) return;
        if (last) {
          const coords = { latitude: last.coords.latitude, longitude: last.coords.longitude };
          setUserCoords(coords);
          animateWhenReady({ ...coords, latitudeDelta: 0.003, longitudeDelta: 0.003 });
        }

        const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const freshCoords = { latitude: fresh.coords.latitude, longitude: fresh.coords.longitude };
        setUserCoords(freshCoords);
        const prev = last ? { latitude: last.coords.latitude, longitude: last.coords.longitude } : null;
        const moved =
          !prev ||
          Math.abs(freshCoords.latitude - prev.latitude) > 0.0005 ||
          Math.abs(freshCoords.longitude - prev.longitude) > 0.0005;
        if (moved) {
          animateWhenReady({ ...freshCoords, latitudeDelta: 0.003, longitudeDelta: 0.003 });
        }
      } catch {
        if (cancelled) return;
        const fallback = userCoords ?? (initial ? { latitude: initial.latitude, longitude: initial.longitude } : null);
        if (fallback) animateWhenReady({ ...fallback, latitudeDelta: 0.003, longitudeDelta: 0.003 });
      }
    })();

    return () => { cancelled = true; };
  }, [mapVisible, municipalityCenter, animateWhenReady]);

  // ── Derived: map initial region ──

  const mapInitialRegion: Region = municipalityCenter
    ? { latitude: municipalityCenter.latitude, longitude: municipalityCenter.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : userCoords
      ? { ...userCoords, latitudeDelta: 0.003, longitudeDelta: 0.003 }
      : initial
        ? { latitude: initial.latitude, longitude: initial.longitude, latitudeDelta: 0.003, longitudeDelta: 0.003 }
        : COLOMBIA_REGION;

  return {
    // search state
    query, setQuery,
    results,
    searching,
    locating,
    // map state
    mapVisible, setMapVisible,
    centerCoord,
    isDragging,
    mapName, setMapName,
    reverseGeocoding,
    municipalityCenter,
    // refs
    mapRef,
    // derived
    mapInitialRegion,
    // handlers
    doSearch,
    handleSelectSuggestion,
    handleUseMyLocation,
    openMap,
    handleRegionChange,
    handleRegionChangeComplete,
    handleMapReady,
    handleMapConfirm,
  };
}
