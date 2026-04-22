import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Colors, Shadows } from '@/constants/colors';
import { tomtomService } from '@/lib/tomtom';

interface RoutineRouteMapModalProps {
  visible: boolean;
  onClose: () => void;
  originName: string;
  originLatitude: number;
  originLongitude: number;
  destinationName: string;
  destinationLatitude: number;
  destinationLongitude: number;
}

export function RoutineRouteMapModal({
  visible,
  onClose,
  originName,
  originLatitude,
  originLongitude,
  destinationName,
  destinationLatitude,
  destinationLongitude,
}: RoutineRouteMapModalProps) {
  const mapRef = useRef<MapView>(null);
  const [polylineCoords, setPolylineCoords] = useState<Array<{ latitude: number; longitude: number; }>>([]);
  const [loading, setLoading] = useState(false);

  const fallbackCoords = [
    { latitude: originLatitude, longitude: originLongitude },
    { latitude: destinationLatitude, longitude: destinationLongitude },
  ];

  const renderedPolyline = polylineCoords.length >= 2 ? polylineCoords : fallbackCoords;

  useEffect(() => {
    if (!visible) return;
    setPolylineCoords([]);

    if (!tomtomService.isConfigured()) return;

    let cancelled = false;
    setLoading(true);

    tomtomService
      .calculateRoute([
        { latitude: originLatitude, longitude: originLongitude },
        { latitude: destinationLatitude, longitude: destinationLongitude },
      ])
      .then((result) => {
        if (cancelled) return;
        setPolylineCoords(result.points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })));
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[RoutineRouteMapModal] TomTom route failed:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [visible, originLatitude, originLongitude, destinationLatitude, destinationLongitude]);

  useEffect(() => {
    if (!visible || loading) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(renderedPolyline, {
        edgePadding: { top: 80, right: 48, bottom: 220, left: 48 },
        animated: true,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [visible, loading, renderedPolyline]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 12,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>
            Ruta del viaje
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: '#94a3b8', marginTop: 12, fontSize: 13 }}>
              Calculando ruta…
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={{
                latitude: (originLatitude + destinationLatitude) / 2,
                longitude: (originLongitude + destinationLongitude) / 2,
                latitudeDelta: Math.abs(originLatitude - destinationLatitude) * 2.5 + 0.05,
                longitudeDelta: Math.abs(originLongitude - destinationLongitude) * 2.5 + 0.05,
              }}
            >
              {renderedPolyline.length >= 2 && (
                <>
                  <Polyline
                    coordinates={renderedPolyline}
                    strokeColor="rgba(15, 23, 42, 0.45)"
                    strokeWidth={9}
                    lineCap="round"
                    lineJoin="round"
                    zIndex={1}
                  />
                  <Polyline
                    coordinates={renderedPolyline}
                    strokeColor="#2563EB"
                    strokeWidth={5.5}
                    lineCap="round"
                    lineJoin="round"
                    zIndex={2}
                  />
                </>
              )}
              <Marker
                coordinate={{ latitude: originLatitude, longitude: originLongitude }}
                title={originName}
                pinColor={Colors.primary[600]}
              />
              <Marker
                coordinate={{ latitude: destinationLatitude, longitude: destinationLongitude }}
                title={destinationName}
                pinColor={Colors.accent[600]}
              />
            </MapView>

            {/* Legend overlay */}
            <View
              style={{
                position: 'absolute',
                bottom: Platform.OS === 'ios' ? 40 : 24,
                left: 16,
                right: 16,
                backgroundColor: '#fff',
                borderRadius: 16,
                padding: 16,
                ...Shadows.lg,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: Colors.primary[500],
                  }}
                />
                <Text
                  style={{ fontSize: 12, fontWeight: '600', color: '#1e293b', flex: 1 }}
                  numberOfLines={1}
                >
                  {originName}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: Colors.accent[500],
                  }}
                />
                <Text
                  style={{ fontSize: 12, fontWeight: '600', color: '#1e293b', flex: 1 }}
                  numberOfLines={1}
                >
                  {destinationName}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
