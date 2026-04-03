import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import MapView from 'react-native-maps';
import type { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Navigation, X, Search, MapPin, ArrowLeft, ChevronRight, Zap } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui';
import { tomtomService, type LocationSearchResult } from '@/lib/tomtom';

// ── Types ──

export interface SelectedLocation {
  latitude: number;
  longitude: number;
  name: string;
}

interface Props {
  visible: boolean;
  title: string;
  onConfirm: (loc: SelectedLocation) => void;
  onClose: () => void;
  initial?: SelectedLocation | null;
  mode?: 'full' | 'map-only';
  mapHintText?: string;
  /** When set, the map opens centred on this municipality at city-level zoom. */
  municipalityFocus?: { latitude: number; longitude: number; name: string; };
}

// ── Constants ──

const COLOMBIA_REGION: Region = {
  latitude: 4.5709,
  longitude: -74.2973,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

export function LocationPickerModal({ visible, title, onConfirm, onClose, initial, mode = 'full', mapHintText, municipalityFocus }: Props) {
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
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [municipalityCenter, setMunicipalityCenter] = useState<{ latitude: number; longitude: number; name: string; } | null>(null);
  const mapRef = useRef<MapView>(null);
  const reverseSeqRef = useRef(0);
  const reverseDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // tracks the last coordinate that was successfully reverse-geocoded;
  // avoids re-calling the API when the map settles with floating-point jitter
  const lastGeocodedCoordRef = useRef<{ latitude: number; longitude: number; } | null>(null);
  // set to true before programmatic animateToRegion calls so onRegionChange
  // doesn't flip isDragging to true (which greyed out the pin during GPS pan)
  const isProgrammaticRef = useRef(false);
  // ── Map-ready animation queue ──
  // animateToRegion must wait until the MapView fires onMapReady.
  const mapReadyRef = useRef(false);
  const pendingRegionRef = useRef<Region | null>(null);

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

  // Reset + fetch last known position on open
  useEffect(() => {
    if (!visible) {
      // Reset map-ready state so the next open starts fresh
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

  // Debounced search using TomTom service
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
  }, [query]);

  const doSearch = async (q: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setSearching(true);
    try {
      const searchResults = await tomtomService.searchLocations(q, userCoords ?? undefined);
      setResults(searchResults);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setResults([]);
      }
    } finally {
      setSearching(false);
    }
  };

  // ── Handlers ──

  const handleSelectSuggestion = (result: LocationSearchResult) => {
    if (result.locationType !== 'specific') {
      // Broad area → let the user pin the exact pickup/dropoff point on the map.
      setCenterCoord(null);
      setMapName('');
      setMunicipalityCenter({ latitude: result.latitude, longitude: result.longitude, name: result.name });
      setMapVisible(true);
    } else {
      // Specific address or POI → confirm directly, no map needed.
      onConfirm({
        latitude: result.latitude,
        longitude: result.longitude,
        name: result.name,
      });
    }
  };

  const handleUseMyLocation = async () => {
    setLocating(true);
    try {
      let coords = userCoords;
      if (!coords) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permisos', 'Necesitamos permiso para acceder a tu ubicación');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserCoords(coords);
      }
      const name = await tomtomService.reverseGeocode(coords.latitude, coords.longitude);
      onConfirm({ ...coords, name });
    } catch {
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
    } finally {
      setLocating(false);
    }
  };

  const openMap = () => {
    setMapVisible(true);
  };

  const handleRegionChange = (region: Region) => {
    // Ignore region changes caused by programmatic animations (e.g. GPS pan on open)
    if (isProgrammaticRef.current) return;
    setIsDragging(true);
    setCenterCoord({ latitude: region.latitude, longitude: region.longitude });
  };

  const handleRegionChangeComplete = (region: Region) => {
    isProgrammaticRef.current = false;
    setIsDragging(false);
    const coord = { latitude: region.latitude, longitude: region.longitude };
    setCenterCoord(coord);

    // Skip reverse geocode if the map settled within ~20 m of the last geocoded point.
    // This prevents constant re-geocoding from floating-point jitter that react-native-maps
    // emits on every tiny re-render even when the map is visually still.
    const last = lastGeocodedCoordRef.current;
    const movedEnough =
      !last ||
      Math.abs(coord.latitude - last.latitude) > 0.0002 ||
      Math.abs(coord.longitude - last.longitude) > 0.0002;

    if (!movedEnough) return;

    // Debounce: wait 700 ms after the last stop before hitting the geocoding API
    if (reverseDebounceRef.current) clearTimeout(reverseDebounceRef.current);
    const seq = ++reverseSeqRef.current;

    reverseDebounceRef.current = setTimeout(async () => {
      setReverseGeocoding(true);
      try {
        const name = await tomtomService.reverseGeocode(coord.latitude, coord.longitude);
        if (reverseSeqRef.current === seq) {
          setMapName(name);
          lastGeocodedCoordRef.current = coord;
        }
      } catch { }
      if (reverseSeqRef.current === seq) setReverseGeocoding(false);
    }, 700);
  };

  const handleMapConfirm = () => {
    if (!centerCoord) return;
    onConfirm({
      latitude: centerCoord.latitude,
      longitude: centerCoord.longitude,
      name: mapName.trim() || 'Ubicación seleccionada',
    });
    setMapVisible(false);
  };

  // Map initial region (shown before GPS resolves)
  const mapInitialRegion: Region = municipalityCenter
    ? { latitude: municipalityCenter.latitude, longitude: municipalityCenter.longitude, latitudeDelta: 0.5, longitudeDelta: 0.5 }
    : userCoords
      ? { ...userCoords, latitudeDelta: 0.003, longitudeDelta: 0.003 }
      : initial
        ? { latitude: initial.latitude, longitude: initial.longitude, latitudeDelta: 0.003, longitudeDelta: 0.003 }
        : COLOMBIA_REGION;

  // On map open: municipality → city zoom; no municipality → GPS street-level zoom.
  // Strategy: use getLastKnownPositionAsync immediately (fast, ~0 ms) so the user
  // never sees Colombia, then refine with getCurrentPositionAsync (high accuracy).
  useEffect(() => {
    if (!mapVisible) {
      mapReadyRef.current = false;
      pendingRegionRef.current = null;
      return;
    }

    if (municipalityCenter) {
      animateWhenReady({ latitude: municipalityCenter.latitude, longitude: municipalityCenter.longitude, latitudeDelta: 0.5, longitudeDelta: 0.5 });
      return;
    }

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          // No permission — use previous selection or stay at Colombia
          const fallback = initial ? { latitude: initial.latitude, longitude: initial.longitude } : null;
          if (fallback) animateWhenReady({ ...fallback, latitudeDelta: 0.003, longitudeDelta: 0.003 });
          return;
        }

        // ── Step 1: last known position (instant) ──
        const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
        if (last) {
          const coords = { latitude: last.coords.latitude, longitude: last.coords.longitude };
          setUserCoords(coords);
          animateWhenReady({ ...coords, latitudeDelta: 0.003, longitudeDelta: 0.003 });
        }

        // ── Step 2: high-accuracy fix (refine if moved) ──
        const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const freshCoords = { latitude: fresh.coords.latitude, longitude: fresh.coords.longitude };
        setUserCoords(freshCoords);
        // Only re-animate if meaningfully different from the last-known pan
        const prev = last ? { latitude: last.coords.latitude, longitude: last.coords.longitude } : null;
        const moved = !prev
          || Math.abs(freshCoords.latitude - prev.latitude) > 0.0005
          || Math.abs(freshCoords.longitude - prev.longitude) > 0.0005;
        if (moved) {
          animateWhenReady({ ...freshCoords, latitudeDelta: 0.003, longitudeDelta: 0.003 });
        }
      } catch {
        const fallback = userCoords ?? (initial ? { latitude: initial.latitude, longitude: initial.longitude } : null);
        if (fallback) animateWhenReady({ ...fallback, latitudeDelta: 0.003, longitudeDelta: 0.003 });
      }
    })();
  }, [mapVisible, municipalityCenter, animateWhenReady]);

  // ── Render ──

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={mapVisible && mode !== 'map-only' ? () => setMapVisible(false) : onClose}
    >
      {!mapVisible && mode !== 'map-only' ? (
        /* ── Search View ── */
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <X size={24} color={Colors.neutral[600]} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Search input */}
          <View style={styles.searchRow}>
            <Search size={18} color={Colors.neutral[400]} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar ciudad o lugar..."
              placeholderTextColor={Colors.neutral[400]}
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => {
                const q = query.trim();
                if (q.length >= 2) doSearch(q);
              }}
            />
            {searching ? (
              <ActivityIndicator size="small" color={Colors.primary[500]} />
            ) : query.length > 0 ? (
              <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
                <X size={18} color={Colors.neutral[400]} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Quick actions + suggestions list */}
          <FlatList
            data={results}
            keyExtractor={(r) => r.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 32 }}
            ListHeaderComponent={
              <View>
                {/* Use my location */}
                <TouchableOpacity
                  style={styles.listRow}
                  onPress={handleUseMyLocation}
                  disabled={locating}
                >
                  <View style={[styles.iconCircle, { backgroundColor: Colors.primary[50] }]}>
                    {locating ? (
                      <ActivityIndicator size="small" color={Colors.primary[600]} />
                    ) : (
                      <Navigation size={18} color={Colors.primary[600]} />
                    )}
                  </View>
                  <Text style={[styles.rowPrimary, { color: Colors.primary[700] }]}>
                    Usar mi ubicación actual
                  </Text>
                </TouchableOpacity>

                {/* Place on map */}
                <TouchableOpacity style={styles.listRow} onPress={openMap}>
                  <View style={[styles.iconCircle, { backgroundColor: Colors.neutral[100] }]}>
                    <MapPin size={18} color={Colors.neutral[600]} />
                  </View>
                  <Text style={[styles.rowPrimary, { flex: 1 }]}>Colocar en el mapa</Text>
                  <ChevronRight size={18} color={Colors.neutral[400]} />
                </TouchableOpacity>

                {results.length > 0 && (
                  <Text style={styles.sectionLabel}>
                    {results[0].source === 'tomtom' ? 'TomTom' : 'OpenStreetMap'}
                  </Text>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.listRow}
                onPress={() => handleSelectSuggestion(item)}
              >
                <View style={[styles.iconCircle, { backgroundColor: Colors.neutral[100] }]}>
                  <MapPin size={18} color={Colors.neutral[500]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowPrimary} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.rowSecondary} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </KeyboardAvoidingView>
      ) : (
        /* ── Map View ── */
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={mode === 'map-only' ? onClose : () => setMapVisible(false)} style={styles.iconBtn}>
              <ArrowLeft size={24} color={Colors.neutral[600]} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Colocar en el mapa</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Hint */}
          <View style={styles.hintBar}>
            <Text style={styles.hintText}>
              {mapHintText
                ? mapHintText
                : municipalityCenter
                  ? `Mueve el mapa para elegir el punto exacto en ${municipalityCenter.name}`
                  : 'Mueve el mapa para posicionar el pin en el punto exacto'}
            </Text>
          </View>

          {/* Map + floating pin overlay */}
          <View style={styles.map}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFillObject}
              initialRegion={mapInitialRegion}
              onRegionChange={handleRegionChange}
              onRegionChangeComplete={handleRegionChangeComplete}
              onMapReady={handleMapReady}
              showsUserLocation
              showsMyLocationButton
              zoomEnabled
              scrollEnabled
              zoomControlEnabled
            />
            {/* Fixed thumbtack: needle tip is aligned to the exact map center */}
            <View style={styles.crosshairContainer} pointerEvents="none">
              <View style={[styles.crosshairPin, isDragging && styles.crosshairPinDragging]}>
                <View style={[styles.pinHead, isDragging && styles.pinHeadDragging]}>
                  <View style={styles.pinHeadDot} />
                </View>
                <View style={[styles.pinNeedle, isDragging && styles.pinNeedleDragging]} />
              </View>
            </View>
          </View>

          {/* Bottom panel */}
          <View style={styles.bottomPanel}>
            {isDragging ? (
              <Text style={[styles.hintText, { textAlign: 'center', color: Colors.neutral[500] }]}>
                Suelta para confirmar posición
              </Text>
            ) : reverseGeocoding ? (
              <View style={styles.reverseRow}>
                <ActivityIndicator size="small" color={Colors.primary[500]} />
                <Text style={styles.hintText}>Obteniendo dirección...</Text>
              </View>
            ) : (
              <TextInput
                style={styles.nameInput}
                placeholder="Nombre del lugar"
                placeholderTextColor={Colors.neutral[400]}
                value={mapName}
                onChangeText={setMapName}
              />
            )}
            <Button
              onPress={handleMapConfirm}
              size="lg"
              className="w-full"
              disabled={!centerCoord || isDragging || reverseGeocoding}
            >
              Confirmar ubicación
            </Button>
          </View>
        </View>
      )}
    </Modal>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    backgroundColor: Colors.white,
  },
  iconBtn: { padding: 4 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: Colors.neutral[100],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.neutral[900],
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutral[200],
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowPrimary: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.neutral[900],
  },
  rowSecondary: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.neutral[400],
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  tomtomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.primary[50],
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  tomtomText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary[600],
  },
  hintBar: {
    backgroundColor: Colors.primary[50],
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 13,
    color: Colors.primary[700],
  },
  map: { flex: 1, overflow: 'hidden' },
  crosshairContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  // Shift up exactly half of pin+needle height so the needle tip sits on map center.
  crosshairPin: {
    alignItems: 'center',
    transform: [{ translateY: -16 }],
  },
  crosshairPinDragging: {
    transform: [{ translateY: -18 }],
  },
  pinHead: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E11D48',
    borderWidth: 2,
    borderColor: '#9F1239',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinHeadDragging: {
    backgroundColor: '#FB7185',
    borderColor: '#E11D48',
  },
  pinHeadDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFE4E6',
  },
  pinNeedle: {
    width: 2,
    height: 14,
    marginTop: -1,
    backgroundColor: '#7F1D1D',
    borderRadius: 1,
  },
  pinNeedleDragging: {
    height: 16,
    backgroundColor: '#9F1239',
  },
  bottomPanel: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  reverseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.neutral[900],
    backgroundColor: Colors.neutral[50],
  },
});
