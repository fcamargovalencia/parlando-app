import React, { useEffect, useRef } from 'react';
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
import type { TripResponse, RouteWaypointResponse } from '@/types/api';

interface RouteMapModalProps {
  trip: TripResponse;
  visible: boolean;
  onClose: () => void;
  waypoints: RouteWaypointResponse[];
  routePolyline: Array<{ latitude: number; longitude: number; }>;
  loading: boolean;
}

export function RouteMapModal({
  trip,
  visible,
  onClose,
  waypoints,
  routePolyline,
  loading,
}: RouteMapModalProps) {
  const mapRef = useRef<MapView>(null);

  const sortedWaypoints = waypoints
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const allPoints = [
    { latitude: trip.originLatitude, longitude: trip.originLongitude },
    ...sortedWaypoints.map((w) => ({
      latitude: w.latitude,
      longitude: w.longitude,
    })),
    {
      latitude: trip.destinationLatitude,
      longitude: trip.destinationLongitude,
    },
  ];
  const renderedPolyline = routePolyline.length >= 2 ? routePolyline : allPoints;
  const pickupWaypoints = sortedWaypoints.filter((w) => w.isPickupPoint);

  useEffect(() => {
    if (!visible || loading || renderedPolyline.length < 2) return;
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
            style={{
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>
            Ruta del viaje
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {loading ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator size="large" color="#fff" />
            <Text
              style={{ color: '#94a3b8', marginTop: 12, fontSize: 13 }}
            >
              Cargando ruta…
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={{
                latitude:
                  (trip.originLatitude + trip.destinationLatitude) / 2,
                longitude:
                  (trip.originLongitude + trip.destinationLongitude) / 2,
                latitudeDelta:
                  Math.abs(
                    trip.originLatitude - trip.destinationLatitude,
                  ) *
                  2.5 +
                  0.5,
                longitudeDelta:
                  Math.abs(
                    trip.originLongitude - trip.destinationLongitude,
                  ) *
                  2.5 +
                  0.5,
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
                coordinate={{
                  latitude: trip.originLatitude,
                  longitude: trip.originLongitude,
                }}
                title={trip.originName}
                description={trip.originSubtitle}
                pinColor={Colors.primary[600]}
              />
              {pickupWaypoints.map((w, idx) => (
                <Marker
                  key={w.id ?? idx}
                  coordinate={{
                    latitude: w.latitude,
                    longitude: w.longitude,
                  }}
                  title={w.name}
                  description={w.subtitle}
                  pinColor={Colors.primary[400]}
                />
              ))}
              <Marker
                coordinate={{
                  latitude: trip.destinationLatitude,
                  longitude: trip.destinationLongitude,
                }}
                title={trip.destinationName}
                description={trip.destinationSubtitle}
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
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: Colors.primary[500],
                  }}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#1e293b',
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {trip.originName}
                </Text>
                {!!trip.originSubtitle && (
                  <Text
                    style={{ fontSize: 11, color: '#94a3b8' }}
                    numberOfLines={1}
                  >
                    {trip.originSubtitle}
                  </Text>
                )}
              </View>

              {pickupWaypoints.map((w, idx) => (
                <View
                  key={w.id ?? idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: Colors.primary[300],
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '500',
                      color: '#334155',
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {w.name}
                  </Text>
                  {!!w.subtitle && (
                    <Text
                      style={{ fontSize: 11, color: '#94a3b8' }}
                      numberOfLines={1}
                    >
                      {w.subtitle}
                    </Text>
                  )}
                </View>
              ))}

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: Colors.accent[500],
                  }}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#1e293b',
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {trip.destinationName}
                </Text>
                {!!trip.destinationSubtitle && (
                  <Text
                    style={{ fontSize: 11, color: '#94a3b8' }}
                    numberOfLines={1}
                  >
                    {trip.destinationSubtitle}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
