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
import { haversineMeters } from '@/lib/geo';
import { tomtomCalculateRoute } from '@/lib/tomtom-routing';

interface WaypointMapStop {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
}

interface SuggestedStop {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
}

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
  waypoints?: WaypointMapStop[];
  suggestedStop?: SuggestedStop;
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
  waypoints = [],
  suggestedStop,
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

    const baseCoords = routeLine?.map((p) => ({ latitude: p[0], longitude: p[1] })) ?? [];

    if (!suggestedStop || baseCoords.length < 2) {
      setRouteLineCoords(baseCoords);
      return;
    }

    // Find routeLine index closest to each intermediate stop + suggestedStop
    function closestIdx(coords: typeof baseCoords, lat: number, lng: number): number {
      let best = 0;
      let minD = Infinity;
      for (let i = 0; i < coords.length; i++) {
        const d = haversineMeters(coords[i].latitude, coords[i].longitude, lat, lng);
        if (d < minD) { minD = d; best = i; }
      }
      return best;
    }

    const orderedStops = [
      ...waypoints.map((wp) => ({ latitude: wp.latitude, longitude: wp.longitude, idx: closestIdx(baseCoords, wp.latitude, wp.longitude) })),
      { latitude: suggestedStop.latitude, longitude: suggestedStop.longitude, idx: closestIdx(baseCoords, suggestedStop.latitude, suggestedStop.longitude) },
    ]
      .sort((a, b) => a.idx - b.idx)
      .map(({ latitude, longitude }) => ({ latitude, longitude }));

    const tomtomStops = [
      { latitude: originLatitude, longitude: originLongitude },
      ...orderedStops,
      { latitude: destinationLatitude, longitude: destinationLongitude },
    ];

    setLoading(true);
    tomtomCalculateRoute(tomtomStops)
      .then((result) => setRouteLineCoords(result.points))
      .catch(() => setRouteLineCoords(baseCoords))
      .finally(() => setLoading(false));
  }, [visible, routeLine, suggestedStop, waypoints, originLatitude, originLongitude, destinationLatitude, destinationLongitude]);

  useEffect(() => {
    if (!visible || loading) return;
    const allCoords = [
      ...renderedRouteLine,
      ...waypoints.map((wp) => ({ latitude: wp.latitude, longitude: wp.longitude })),
    ];
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(allCoords, {
        edgePadding: { top: 80, right: 48, bottom: 220, left: 48 },
        animated: true,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [visible, loading, renderedRouteLine, waypoints]);

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
            <Text style={{ color: '#94a3b8', marginTop: 12, fontSize: 13 }}>Calculando ruta…</Text>
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
              {waypoints.map((wp) => (
                <Marker
                  key={wp.id}
                  coordinate={{ latitude: wp.latitude, longitude: wp.longitude }}
                  title={wp.name}
                  pinColor={Colors.primary[400]}
                />
              ))}
              {suggestedStop && (
                <Marker
                  coordinate={{ latitude: suggestedStop.latitude, longitude: suggestedStop.longitude }}
                  title={suggestedStop.name}
                  pinColor="orange"
                />
              )}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: (waypoints.length > 0 || suggestedStop) ? 8 : 0 }}>
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
              {waypoints.map((wp) => (
                <View key={wp.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: Colors.primary[400],
                      marginLeft: 1,
                    }}
                  />
                  <Text
                    style={{ fontSize: 11, fontWeight: '500', color: '#475569', flex: 1 }}
                    numberOfLines={1}
                  >
                    {wp.name}
                  </Text>
                </View>
              ))}
              {suggestedStop && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'orange',
                      marginLeft: 1,
                    }}
                  />
                  <Text
                    style={{ fontSize: 11, fontWeight: '500', color: '#92400e', flex: 1 }}
                    numberOfLines={1}
                  >
                    {suggestedStop.name} (sugerido)
                  </Text>
                </View>
              )}
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
