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

interface RoutineRouteMapModalProps {
  visible: boolean;
  onClose: () => void;
  originName: string;
  originLatitude: number;
  originLongitude: number;
  destinationName: string;
  destinationLatitude: number;
  destinationLongitude: number;
  routeLine?: [number, number][];
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
  routeLine,
}: RoutineRouteMapModalProps) {
  const mapRef = useRef<MapView>(null);
  const [routeLineCoords, setRouteLineCoords] = useState<Array<{ latitude: number; longitude: number; }>>([]);
  const [loading, setLoading] = useState(false);

  const fallbackCoords = [
    { latitude: originLatitude, longitude: originLongitude },
    { latitude: destinationLatitude, longitude: destinationLongitude },
  ];

  const renderedRouteLine = routeLineCoords.length >= 2 ? routeLineCoords : fallbackCoords;

  useEffect(() => {
    if (!visible) return;
    setRouteLineCoords([]);

    setLoading(true);

    setRouteLineCoords(routeLine?.map((p) => (
      { latitude: p[0], longitude: p[1] }
    )) ?? []);

    setLoading(false);

  }, [visible, originLatitude, originLongitude, destinationLatitude, destinationLongitude, routeLine]);

  useEffect(() => {
    if (!visible || loading) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(renderedRouteLine, {
        edgePadding: { top: 80, right: 48, bottom: 220, left: 48 },
        animated: true,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [visible, loading, renderedRouteLine]);

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
              {renderedRouteLine.length >= 2 && (
                <>
                  <Polyline
                    coordinates={renderedRouteLine}
                    strokeColor="rgba(15, 23, 42, 0.45)"
                    strokeWidth={9}
                    lineCap="round"
                    lineJoin="round"
                    zIndex={1}
                  />
                  <Polyline
                    coordinates={renderedRouteLine}
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
