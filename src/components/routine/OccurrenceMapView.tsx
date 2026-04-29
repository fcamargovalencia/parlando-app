import React, { useEffect, useRef } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Colors } from '@/constants/colors';
import type { OrderedStop } from '@/hooks/useOccurrenceDetail';
import type { DayStop } from '@/types/api';

// OccurrenceMapView accepts both OrderedStop (Layer C) and DayStop (Layer B)
type AnyStop = OrderedStop | DayStop;

export interface OccurrenceMapViewProps {
  routeLine: [number, number][];      // [lat, lng] pairs
  origin: { latitude: number; longitude: number; name: string; };
  destination: { latitude: number; longitude: number; name: string; };
  orderedStops: AnyStop[];
  style?: ViewStyle;
  fitOnMount?: boolean;
}

function stopCoords(stop: AnyStop): { latitude: number; longitude: number; } | null {
  if (stop.kind === 'origin' || stop.kind === 'destination') {
    return { latitude: stop.lat, longitude: stop.lng };
  }
  if (stop.kind === 'waypoint') {
    return { latitude: stop.data.latitude, longitude: stop.data.longitude };
  }
  if (stop.kind === 'passenger') {
    return { latitude: stop.pickupLat, longitude: stop.pickupLng };
  }
  if (stop.kind === 'subscriber') {
    const sub = stop.sub;
    if (sub.customPickupLatitude != null && sub.customPickupLongitude != null) {
      return { latitude: sub.customPickupLatitude, longitude: sub.customPickupLongitude };
    }
    return null;
  }
  return null;
}

function stopTitle(stop: AnyStop): string {
  if (stop.kind === 'origin') return stop.name;
  if (stop.kind === 'destination') return stop.name;
  if (stop.kind === 'waypoint') return stop.data.name;
  if (stop.kind === 'passenger') return stop.sub.passenger?.name ?? 'Pasajero';
  if (stop.kind === 'subscriber') return stop.sub.passenger?.name ?? 'Pasajero';
  return '';
}

function stopColor(stop: AnyStop): string {
  if (stop.kind === 'origin') return Colors.primary[600];
  if (stop.kind === 'destination') return Colors.accent[600];
  if (stop.kind === 'waypoint') return Colors.primary[400];
  return Colors.accent[500];   // passenger / subscriber
}

export function OccurrenceMapView({
  routeLine,
  origin,
  destination,
  orderedStops,
  style,
  fitOnMount = false,
}: OccurrenceMapViewProps) {
  const mapRef = useRef<MapView>(null);

  const polyline = routeLine.length >= 2
    ? routeLine.map((p) => ({ latitude: p[0], longitude: p[1] }))
    : [origin, destination];

  useEffect(() => {
    if (!fitOnMount || polyline.length < 2) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(polyline, {
        edgePadding: { top: 80, right: 48, bottom: 80, left: 48 },
        animated: true,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [fitOnMount]);

  const markerStops = [
    { kind: 'origin' as const, lat: origin.latitude, lng: origin.longitude, name: origin.name },
    ...orderedStops,
    { kind: 'destination' as const, lat: destination.latitude, lng: destination.longitude, name: destination.name },
  ] as AnyStop[];

  return (
    <MapView
      ref={mapRef}
      style={[StyleSheet.absoluteFillObject, style]}
      initialRegion={{
        latitude: (origin.latitude + destination.latitude) / 2,
        longitude: (origin.longitude + destination.longitude) / 2,
        latitudeDelta: Math.abs(origin.latitude - destination.latitude) * 2.5 + 0.05,
        longitudeDelta: Math.abs(origin.longitude - destination.longitude) * 2.5 + 0.05,
      }}
    >
      {/* Shadow polyline */}
      <Polyline
        coordinates={polyline}
        strokeColor="rgba(15, 23, 42, 0.4)"
        strokeWidth={9}
        lineCap="round"
        lineJoin="round"
        zIndex={1}
      />
      {/* Main polyline */}
      <Polyline
        coordinates={polyline}
        strokeColor={Colors.primary[500]}
        strokeWidth={5}
        lineCap="round"
        lineJoin="round"
        zIndex={2}
      />
      {/* Markers */}
      {markerStops.map((stop, i) => {
        const coords = stopCoords(stop);
        if (!coords) return null;
        return (
          <Marker
            key={i}
            coordinate={coords}
            title={stopTitle(stop)}
            pinColor={stopColor(stop)}
            zIndex={3}
          />
        );
      })}
    </MapView>
  );
}
