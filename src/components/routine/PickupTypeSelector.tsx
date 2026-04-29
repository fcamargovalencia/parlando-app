import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import { ArrowLeft, CheckCircle, MapPin, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';
import { Button } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { tomtomReverseGeocode } from '@/lib/tomtom-geocode';
import type { DeviationPreview } from '@/hooks/useRoutineSubscription';
import type { PickupType, RoutineTripResponse, RoutineWaypointResponse } from '@/types/api';
import { haversineMeters } from '@/lib/geo';

// ── Types ──

export interface PickupSelection {
  pickupType: PickupType;
  pickupWaypointId?: string;
  customPickupLatitude?: number;
  customPickupLongitude?: number;
  customPickupName?: string;
}

interface PickupTypeSelectorProps {
  routineTrip: RoutineTripResponse;
  waypoints: RoutineWaypointResponse[];
  passengerLocation?: { lat: number; lng: number; };
  selection: PickupSelection | null;
  onSelect: (config: PickupSelection) => void;
  previewDeviation: (lat: number, lng: number) => DeviationPreview;
  error?: string;
}

// ── Helpers ──

function formatTime(minutesOffset: number, departureTime: string): string {
  const [hh, mm] = departureTime.split(':').map(Number);
  const totalMinutes = hh * 60 + mm + minutesOffset;
  const rh = Math.floor(totalMinutes / 60) % 24;
  const rm = totalMinutes % 60;
  return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
}

// ── Custom Pickup Map Modal ──

interface MapModalProps {
  visible: boolean;
  routineTrip: RoutineTripResponse;
  waypoints: RoutineWaypointResponse[];
  previewDeviation: (lat: number, lng: number) => DeviationPreview;
  onConfirm: (lat: number, lng: number, name: string) => void;
  onClose: () => void;
}

function CustomPickupMapModal({
  visible,
  routineTrip,
  waypoints,
  previewDeviation,
  onConfirm,
  onClose,
}: MapModalProps) {
  const mapRef = useRef<MapView | null>(null);
  const [centerCoord, setCenterCoord] = useState({
    latitude: routineTrip.originLatitude,
    longitude: routineTrip.originLongitude,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const routePoints: { latitude: number; longitude: number; }[] =
    Array.isArray(routineTrip.routeLine) && routineTrip.routeLine.length >= 2
      ? routineTrip.routeLine.map((p) => ({ latitude: p[0], longitude: p[1] }))
      : [];
  const deviation = previewDeviation(centerCoord.latitude, centerCoord.longitude);
  const maxDev = routineTrip.maxPickupDeviationMeters;
  const maxTimeSec = routineTrip.maxTimeOverheadSeconds;
  const maxTimeMin = Math.round(maxTimeSec / 60);
  const overheadMin = Math.round(deviation.timeOverheadSeconds / 60);

  const initialRegion = useMemo<Region>(
    () => ({
      latitude:
        (routineTrip.originLatitude + routineTrip.destinationLatitude) / 2,
      longitude:
        (routineTrip.originLongitude + routineTrip.destinationLongitude) / 2,
      latitudeDelta:
        Math.max(
          Math.abs(routineTrip.originLatitude - routineTrip.destinationLatitude) * 1.8,
          0.02,
        ),
      longitudeDelta:
        Math.max(
          Math.abs(routineTrip.originLongitude - routineTrip.destinationLongitude) * 1.8,
          0.02,
        ),
    }),
    [routineTrip],
  );

  const handleRegionChange = useCallback(
    (region: Region) => {
      setIsDragging(true);
      setCenterCoord({ latitude: region.latitude, longitude: region.longitude });
    },
    [],
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      setIsDragging(false);
      setCenterCoord({ latitude: region.latitude, longitude: region.longitude });
    },
    [],
  );

  const handleLocateMe = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      mapRef.current?.animateToRegion(
        {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500,
      );
    } finally {
      setIsLocating(false);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    try {
      const result = await tomtomReverseGeocode(centerCoord.latitude, centerCoord.longitude);
      onConfirm(centerCoord.latitude, centerCoord.longitude, result.name);
    } catch {
      const fallback = `${centerCoord.latitude.toFixed(5)}, ${centerCoord.longitude.toFixed(5)}`;
      onConfirm(centerCoord.latitude, centerCoord.longitude, fallback);
    } finally {
      setIsConfirming(false);
    }
  }, [centerCoord, onConfirm]);

  const pickupWaypoints = waypoints.filter((w) => w.isPickupPoint);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.mapModalContainer}>
        {/* Header */}
        <View style={styles.mapHeader}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <ArrowLeft size={24} color={Colors.neutral[700]} />
          </TouchableOpacity>
          <Text style={styles.mapHeaderTitle}>Elige tu punto de recogida</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Hint */}
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>
            Mueve el mapa para posicionar el pin en tu punto de recogida
          </Text>
        </View>

        {/* Map */}
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={initialRegion}
            onRegionChange={handleRegionChange}
            onRegionChangeComplete={handleRegionChangeComplete}
            onMapReady={() => setMapReady(true)}
            showsUserLocation
            scrollEnabled
            zoomEnabled
            rotateEnabled={false}
            pitchEnabled={false}
          >
            {/* Route line */}
            {routePoints.length >= 2 ? (
              <Polyline
                coordinates={routePoints}
                strokeWidth={5}
                strokeColor={Colors.primary[500]}
                lineCap="round"
                lineJoin="round"
              />
            ) : (
              /* Fallback straight line */
              <Polyline
                coordinates={[
                  { latitude: routineTrip.originLatitude, longitude: routineTrip.originLongitude },
                  { latitude: routineTrip.destinationLatitude, longitude: routineTrip.destinationLongitude },
                ]}
                strokeWidth={5}
                strokeColor={Colors.primary[500]}
                strokeDashArray={[8, 6]}
                lineCap="round"
              />
            )}
            {/* Origin marker */}
            <Marker
              coordinate={{
                latitude: routineTrip.originLatitude,
                longitude: routineTrip.originLongitude,
              }}
              title="Origen"
              pinColor={Colors.primary[500]}
            />
            {/* Destination marker */}
            <Marker
              coordinate={{
                latitude: routineTrip.destinationLatitude,
                longitude: routineTrip.destinationLongitude,
              }}
              title="Destino"
              pinColor={Colors.accent[500]}
            />
            {/* Waypoint markers */}
            {pickupWaypoints.map((wp) => (
              <Marker
                key={wp.id}
                coordinate={{ latitude: wp.latitude, longitude: wp.longitude }}
                title={wp.name}
                pinColor="#F59E0B"
              />
            ))}
          </MapView>

          {/* Crosshair pin */}
          {mapReady && (
            <View style={styles.crosshairContainer} pointerEvents="none">
              <View style={[styles.pin, isDragging && styles.pinDragging]}>
                <View style={[styles.pinHead, isDragging && styles.pinHeadDragging]} />
                <View style={[styles.pinNeedle, isDragging && styles.pinNeedleDragging]} />
              </View>
            </View>
          )}

          {/* Locate me */}
          <TouchableOpacity
            onPress={handleLocateMe}
            style={styles.locateBtn}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={Colors.primary[600]} />
            ) : (
              <Navigation size={20} color={Colors.primary[600]} />
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom panel */}
        <View style={styles.mapBottomPanel}>
          {/* Deviation feedback */}
          <View
            style={[
              styles.deviationCard,
              !deviation.isValid && styles.deviationCardError,
            ]}
          >
            <Text
              style={[styles.deviationTitle, !deviation.isValid && { color: '#DC2626' }]}
            >
              {deviation.isValid
                ? '✓ Punto dentro del radio permitido'
                : '✗ Punto fuera del radio permitido'}
            </Text>
            <Text style={styles.deviationDetail}>
              Distancia a la ruta: <Text style={{ fontWeight: '700' }}>{deviation.deviationMeters}m</Text>
              {' · '}
              Tiempo extra: <Text style={{ fontWeight: '700' }}>~{overheadMin} min</Text>
            </Text>
            {!deviation.isValid && (
              <Text style={styles.deviationLimitText}>
                Límites: {maxDev}m · {maxTimeMin} min
              </Text>
            )}
          </View>

          <Button
            onPress={handleConfirm}
            disabled={!deviation.isValid || isDragging || isConfirming}
            loading={isConfirming}
            variant={deviation.isValid ? 'primary' : 'outline'}
          >
            Confirmar punto
          </Button>
        </View>
      </View>
    </Modal>
  );
}

// ── Waypoint Option Item ──

interface WaypointOptionItemProps {
  wp: RoutineWaypointResponse;
  isSelected: boolean;
  estimatedTime: string;
  distanceM: number | null;
  onPress: () => void;
}

const WaypointOptionItem = React.memo(function WaypointOptionItem({
  wp, isSelected, estimatedTime, distanceM, onPress,
}: WaypointOptionItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className={`flex-row items-center gap-3 p-3.5 rounded-2xl border ${isSelected ? 'bg-primary-50 border-primary-400' : 'bg-white border-neutral-200'
        }`}
    >
      <View
        className={`w-5 h-5 rounded-full border-2 items-center justify-center ${isSelected ? 'border-primary-500' : 'border-neutral-300'
          }`}
      >
        {isSelected && <View className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
      </View>
      <View className="flex-1">
        <Text className={`text-sm font-semibold ${isSelected ? 'text-primary-800' : 'text-neutral-800'}`}>
          {wp.name}
        </Text>
        <Text className="text-xs text-neutral-500 mt-0.5">
          Paso estimado: {estimatedTime}
          {distanceM !== null ? ` · ${distanceM}m desde ti` : ''}
        </Text>
      </View>
      {isSelected && <CheckCircle size={18} color={Colors.primary[500]} />}
    </TouchableOpacity>
  );
});

// ── Main Component ──

export function PickupTypeSelector({
  routineTrip,
  waypoints,
  passengerLocation,
  selection,
  onSelect,
  previewDeviation,
  error,
}: PickupTypeSelectorProps) {
  const [showMapModal, setShowMapModal] = useState(false);
  const pickupWaypoints = waypoints.filter((w) => w.isPickupPoint);
  const hasWaypoints = pickupWaypoints.length > 0;
  const allowsCustom = routineTrip.allowsCustomPickup;

  const handleConfirmCustom = useCallback(
    (lat: number, lng: number, name: string) => {
      setShowMapModal(false);
      onSelect({
        pickupType: 'SUGGESTED',
        customPickupLatitude: lat,
        customPickupLongitude: lng,
        customPickupName: name,
      });
    },
    [onSelect],
  );

  const handleSelectWaypoint = useCallback(
    (wp: RoutineWaypointResponse) => {
      onSelect({
        pickupType: 'WAYPOINT',
        pickupWaypointId: wp.id,
      });
    },
    [onSelect],
  );

  const handleSelectOrigin = useCallback(() => {
    onSelect({ pickupType: 'ORIGIN' });
  }, [onSelect]);

  const isOriginSelected = selection?.pickupType === 'ORIGIN';

  // ── Origin option (always available) ──
  const originOption = (
    <TouchableOpacity
      key="origin"
      onPress={handleSelectOrigin}
      activeOpacity={0.75}
      className={`flex-row items-center gap-3 p-3.5 rounded-2xl border ${isOriginSelected
        ? 'bg-primary-50 border-primary-400'
        : 'bg-white border-neutral-200'
        }`}
    >
      <View
        className={`w-5 h-5 rounded-full border-2 items-center justify-center ${isOriginSelected ? 'border-primary-500' : 'border-neutral-300'
          }`}
      >
        {isOriginSelected && (
          <View className="w-2.5 h-2.5 rounded-full bg-primary-500" />
        )}
      </View>
      <View className="flex-1">
        <Text
          className={`text-sm font-semibold ${isOriginSelected ? 'text-primary-800' : 'text-neutral-800'}`}
        >
          {routineTrip.originName}
        </Text>
        <Text className="text-xs text-neutral-500 mt-0.5">
          Origen de la ruta · Salida {routineTrip.departureTime}
        </Text>
      </View>
      {isOriginSelected && <CheckCircle size={18} color={Colors.primary[500]} />}
    </TouchableOpacity>
  );

  // ── Case C — no waypoints + no custom: only ORIGIN ──
  if (!hasWaypoints && !allowsCustom) {
    return (
      <View>
        {originOption}
        {error ? (
          <Text className="text-red-500 text-xs mt-2">{error}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      {/* ── Case A — Driver has predefined waypoints ── */}
      {hasWaypoints && (
        <View className="gap-2">
          {/* Origin option first */}
          {originOption}

          {pickupWaypoints.map((wp) => {
            const isSelected = selection?.pickupWaypointId === wp.id;
            const estimatedTime = formatTime(wp.estimatedMinutesOffset, routineTrip.departureTime);
            const distanceM = passengerLocation
              ? Math.round(
                haversineMeters(
                  passengerLocation.lat,
                  passengerLocation.lng,
                  wp.latitude,
                  wp.longitude,
                ),
              )
              : null;

            return (
              <WaypointOptionItem
                key={wp.id}
                wp={wp}
                isSelected={isSelected}
                estimatedTime={estimatedTime}
                distanceM={distanceM}
                onPress={() => handleSelectWaypoint(wp)}
              />
            );
          })}

          {/* "Suggest my own" option when allowsCustomPickup */}
          {allowsCustom && (
            <TouchableOpacity
              onPress={() => setShowMapModal(true)}
              activeOpacity={0.75}
              className={`flex-row items-center gap-3 p-3.5 rounded-2xl border ${selection?.pickupType === 'SUGGESTED'
                ? 'bg-amber-50 border-amber-400'
                : 'bg-white border-neutral-200'
                }`}
            >
              <View
                className={`w-5 h-5 rounded-full border-2 items-center justify-center ${selection?.pickupType === 'SUGGESTED' ? 'border-amber-500' : 'border-neutral-300'
                  }`}
              >
                {selection?.pickupType === 'SUGGESTED' && (
                  <View className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                )}
              </View>
              <View className="flex-1">
                <Text
                  className={`text-sm font-semibold ${selection?.pickupType === 'SUGGESTED' ? 'text-amber-800' : 'text-neutral-800'
                    }`}
                >
                  {selection?.pickupType === 'SUGGESTED'
                    ? selection.customPickupName ?? 'Punto personalizado'
                    : 'Sugerir mi propio punto'}
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  {selection?.pickupType === 'SUGGESTED'
                    ? 'Pendiente de aprobación del conductor'
                    : 'El conductor debe aprobar tu punto sugerido'}
                </Text>
              </View>
              <MapPin size={16} color={selection?.pickupType === 'SUGGESTED' ? '#D97706' : Colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Case B — No waypoints + allowsCustomPickup ── */}
      {!hasWaypoints && allowsCustom && (
        <View className="gap-2">
          {/* Origin option first */}
          {originOption}

          <View className="bg-amber-50 rounded-2xl p-3.5 border border-amber-100">
            <Text className="text-xs text-amber-800 leading-4">
              El conductor no tiene paradas predefinidas. Puedes sugerir tu propio punto en el mapa.
              El conductor recibirá tu solicitud y deberá aprobarla.
            </Text>
          </View>

          {selection?.pickupType === 'SUGGESTED' ? (
            <View className="bg-primary-50 border border-primary-200 rounded-2xl p-3.5 gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-primary-800">
                  {selection.customPickupName ?? 'Punto seleccionado'}
                </Text>
                <CheckCircle size={16} color={Colors.primary[500]} />
              </View>
              <Text className="text-xs text-primary-600">Pendiente de aprobación del conductor</Text>
              <TouchableOpacity onPress={() => setShowMapModal(true)}>
                <Text className="text-xs text-primary-700 font-semibold mt-1">
                  Cambiar punto →
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowMapModal(true)}
              activeOpacity={0.8}
              className="flex-row items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border-2 border-dashed border-primary-300 bg-primary-50"
            >
              <MapPin size={18} color={Colors.primary[600]} />
              <Text className="text-sm font-semibold text-primary-700">
                Seleccionar punto en el mapa
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {error ? (
        <Text className="text-red-500 text-xs mt-2">{error}</Text>
      ) : null}

      {/* Map Modal */}
      <CustomPickupMapModal
        visible={showMapModal}
        routineTrip={routineTrip}
        waypoints={waypoints}
        previewDeviation={previewDeviation}
        onConfirm={handleConfirmCustom}
        onClose={() => setShowMapModal(false)}
      />
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  mapHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#212121',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintBar: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#0369A1',
    textAlign: 'center',
  },
  crosshairContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    alignItems: 'center',
    marginBottom: 28,
  },
  pinDragging: {
    marginBottom: 40,
  },
  pinHead: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary[500],
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  pinHeadDragging: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  pinNeedle: {
    width: 2,
    height: 18,
    backgroundColor: Colors.primary[500],
    borderRadius: 1,
  },
  pinNeedleDragging: {
    height: 28,
  },
  locateBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  mapBottomPanel: {
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  deviationCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
  deviationCardError: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  deviationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#15803D',
  },
  deviationDetail: {
    fontSize: 12,
    color: '#6B7280',
  },
  deviationLimitText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 2,
  },
});
