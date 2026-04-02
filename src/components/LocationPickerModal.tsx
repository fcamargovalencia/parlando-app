import React, { useState, useRef, useEffect } from 'react';
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
import MapView, { Marker } from 'react-native-maps';
import type { MapPressEvent, Region } from 'react-native-maps';
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
}

// ── Constants ──

const COLOMBIA_REGION: Region = {
  latitude: 4.5709,
  longitude: -74.2973,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

export function LocationPickerModal({ visible, title, onConfirm, onClose, initial, mode = 'full' }: Props) {
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
  const [marker, setMarker] = useState<{ latitude: number; longitude: number; } | null>(null);
  const [mapName, setMapName] = useState('');
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Reset + fetch last known position on open
  useEffect(() => {
    if (!visible) return;
    setQuery(initial?.name ?? '');
    setResults([]);
    setMapVisible(mode === 'map-only');
    setMarker(initial ? { latitude: initial.latitude, longitude: initial.longitude } : null);
    setMapName(initial?.name ?? '');

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
  }, [visible, initial, mode]);

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
    onConfirm({
      latitude: result.latitude,
      longitude: result.longitude,
      name: result.name,
    });
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

  const handleMapPress = async (e: MapPressEvent) => {
    if (reverseGeocoding) return;
    const coord = e.nativeEvent.coordinate;
    setMarker(coord);
    setMapName('');
    setReverseGeocoding(true);
    const name = await tomtomService.reverseGeocode(coord.latitude, coord.longitude);
    setMapName(name);
    setReverseGeocoding(false);
  };

  const handleMapConfirm = () => {
    if (!marker) {
      Alert.alert('', 'Toca el mapa para seleccionar un punto');
      return;
    }
    onConfirm({
      latitude: marker.latitude,
      longitude: marker.longitude,
      name: mapName.trim() || 'Ubicación seleccionada',
    });
    setMapVisible(false);
  };

  // Map starts at device location, fallback to previous selection, fallback to Colombia
  // Zoom levels: 0.05 = very close (street level), 0.2 = neighborhood, 0.5 = city, 8 = country
  const mapInitialRegion: Region = userCoords
    ? { ...userCoords, latitudeDelta: 0.05, longitudeDelta: 0.05 } // Close zoom to device location
    : initial
      ? {
        latitude: initial.latitude,
        longitude: initial.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
      : COLOMBIA_REGION;

  // Center map on user location when map opens
  useEffect(() => {
    if (mapVisible && mapRef.current && userCoords) {
      setTimeout(() => {
        mapRef.current?.animateToRegion(
          {
            latitude: userCoords.latitude,
            longitude: userCoords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          500 // Animation duration in ms
        );
      }, 300); // Small delay to ensure map is rendered
    }
  }, [mapVisible, userCoords]);

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
            <Text style={styles.hintText}>Toca el mapa para seleccionar la ubicación</Text>
          </View>

          {/* Map */}
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={mapInitialRegion}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton
            zoomEnabled
            scrollEnabled
            zoomControlEnabled
          >
            {marker && <Marker coordinate={marker} pinColor={Colors.primary[500]} />}
          </MapView>

          {/* Bottom panel */}
          <View style={styles.bottomPanel}>
            {!marker ? (
              <Text style={[styles.hintText, { textAlign: 'center' }]}>
                Toca el mapa para continuar
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
              disabled={!marker || reverseGeocoding}
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
  map: { flex: 1 },
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
