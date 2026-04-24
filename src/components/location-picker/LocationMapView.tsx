import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui';

interface Props {
  mapRef: React.RefObject<MapView | null>;
  mapInitialRegion: Region;
  mapName: string;
  centerCoord: { latitude: number; longitude: number } | null;
  isDragging: boolean;
  reverseGeocoding: boolean;
  municipalityCenter: { latitude: number; longitude: number; name: string } | null;
  routeCoordinates?: Array<{ latitude: number; longitude: number }>;
  mapHintText?: string;
  mode: 'full' | 'map-only';
  onBack: () => void;
  onChangeMapName: (name: string) => void;
  onRegionChange: (region: Region) => void;
  onRegionChangeComplete: (region: Region) => void;
  onMapReady: () => void;
  onConfirm: () => void;
}

export function LocationMapView({
  mapRef,
  mapInitialRegion,
  mapName,
  centerCoord,
  isDragging,
  reverseGeocoding,
  municipalityCenter,
  routeCoordinates,
  mapHintText,
  mode,
  onBack,
  onChangeMapName,
  onRegionChange,
  onRegionChangeComplete,
  onMapReady,
  onConfirm,
}: Props) {
  const hintText = mapHintText
    ? mapHintText
    : routeCoordinates && routeCoordinates.length >= 2
      ? 'Ajusta el punto sobre la ruta seleccionada del viaje'
    : municipalityCenter
      ? `Mueve el mapa para elegir el punto exacto en ${municipalityCenter.name}`
      : 'Mueve el mapa para posicionar el pin en el punto exacto';

  const showRoute = !!routeCoordinates && routeCoordinates.length >= 2;
  const routeStart = showRoute ? routeCoordinates[0] : null;
  const routeEnd = showRoute ? routeCoordinates[routeCoordinates.length - 1] : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <ArrowLeft size={24} color={Colors.neutral[600]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Colocar en el mapa</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Hint bar */}
      <View style={styles.hintBar}>
        <Text style={styles.hintText}>{hintText}</Text>
      </View>

      {/* Map + crosshair */}
      <View style={styles.map}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={mapInitialRegion}
          onRegionChange={onRegionChange}
          onRegionChangeComplete={onRegionChangeComplete}
          onMapReady={onMapReady}
          showsUserLocation
          showsMyLocationButton
          zoomEnabled
          scrollEnabled
          zoomControlEnabled
        >
          {showRoute && (
            <>
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="rgba(15, 23, 42, 0.35)"
                strokeWidth={8}
                lineCap="round"
                lineJoin="round"
                zIndex={1}
              />
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={Colors.primary[600]}
                strokeWidth={4.5}
                lineCap="round"
                lineJoin="round"
                zIndex={2}
              />
              {routeStart ? (
                <Marker coordinate={routeStart} pinColor={Colors.primary[600]} />
              ) : null}
              {routeEnd ? (
                <Marker coordinate={routeEnd} pinColor={Colors.accent[600]} />
              ) : null}
            </>
          )}
        </MapView>
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
            onChangeText={onChangeMapName}
          />
        )}
        <Button
          onPress={onConfirm}
          size="lg"
          className="w-full"
          disabled={!centerCoord || isDragging || reverseGeocoding}
        >
          Confirmar ubicación
        </Button>
      </View>
    </View>
  );
}

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
