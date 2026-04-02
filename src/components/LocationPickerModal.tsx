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
import { Navigation, X, Search, MapPin, ArrowLeft, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui';

// ── Types ──

export interface SelectedLocation {
  latitude: number;
  longitude: number;
  name: string;
}

interface NominatimResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    suburb?: string;
    county?: string;
    state?: string;
  };
}

interface Props {
  visible: boolean;
  title: string;
  onConfirm: (loc: SelectedLocation) => void;
  onClose: () => void;
  initial?: SelectedLocation | null;
}

// ── Constants ──

const COLOMBIA_REGION: Region = {
  latitude: 4.5709,
  longitude: -74.2973,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

const NOMINATIM = 'https://nominatim.openstreetmap.org';

// ── Helpers ──

function bestName(r: NominatimResult): { primary: string; secondary: string } {
  const a = r.address ?? {};
  const primary =
    a.city ?? a.town ?? a.village ?? a.hamlet ?? a.municipality ?? a.suburb ??
    r.display_name.split(',')[0].trim();
  const secondary = [a.state ?? a.county, 'Colombia'].filter(Boolean).join(', ');
  return { primary, secondary };
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      { headers: { 'User-Agent': 'ParlAndo/1.0' } },
    );
    const data = await res.json();
    const a = data.address ?? {};
    return (
      a.city ?? a.town ?? a.village ?? a.hamlet ?? a.municipality ??
      data.display_name?.split(',')[0]?.trim() ??
      'Ubicación'
    );
  } catch {
    return 'Ubicación';
  }
}

// ── Component ──

export function LocationPickerModal({ visible, title, onConfirm, onClose, initial }: Props) {
  // ── Search state ──
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Map state ──
  const [mapVisible, setMapVisible] = useState(false);
  const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapName, setMapName] = useState('');
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Reset + fetch last known position on open
  useEffect(() => {
    if (!visible) return;
    setQuery(initial?.name ?? '');
    setResults([]);
    setMapVisible(false);
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
      } catch {}
    })();
  }, [visible]);

  // Debounced Nominatim search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(() => doSearch(q), 420);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const doSearch = async (q: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setSearching(true);
    try {
      let url =
        `${NOMINATIM}/search?q=${encodeURIComponent(q)}` +
        `&countrycodes=co&format=json&limit=6&addressdetails=1`;
      if (userCoords) {
        url += `&lat=${userCoords.latitude}&lon=${userCoords.longitude}`;
      }
      const res = await fetch(url, {
        signal: abortRef.current.signal,
        headers: { 'User-Agent': 'ParlAndo/1.0' },
      });
      setResults(await res.json());
    } catch (e: any) {
      if (e?.name !== 'AbortError') setResults([]);
    } finally {
      setSearching(false);
    }
  };

  // ── Handlers ──

  const handleSelectSuggestion = (r: NominatimResult) => {
    const { primary } = bestName(r);
    onConfirm({ latitude: parseFloat(r.lat), longitude: parseFloat(r.lon), name: primary });
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
      const name = await reverseGeocode(coords.latitude, coords.longitude);
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
    const name = await reverseGeocode(coord.latitude, coord.longitude);
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
  const mapInitialRegion: Region = userCoords
    ? { ...userCoords, latitudeDelta: 0.08, longitudeDelta: 0.08 }
    : initial
    ? { latitude: initial.latitude, longitude: initial.longitude, latitudeDelta: 0.5, longitudeDelta: 0.5 }
    : COLOMBIA_REGION;

  // ── Render ──

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={mapVisible ? () => setMapVisible(false) : onClose}
    >
      {!mapVisible ? (
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
            keyExtractor={(r) => r.place_id}
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
                  <Text style={styles.sectionLabel}>Sugerencias</Text>
                )}
              </View>
            }
            renderItem={({ item }) => {
              const { primary, secondary } = bestName(item);
              return (
                <TouchableOpacity
                  style={styles.listRow}
                  onPress={() => handleSelectSuggestion(item)}
                >
                  <View style={[styles.iconCircle, { backgroundColor: Colors.neutral[100] }]}>
                    <MapPin size={18} color={Colors.neutral[500]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowPrimary} numberOfLines={1}>{primary}</Text>
                    <Text style={styles.rowSecondary} numberOfLines={1}>{secondary}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </KeyboardAvoidingView>
      ) : (
        /* ── Map View ── */
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setMapVisible(false)} style={styles.iconBtn}>
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
