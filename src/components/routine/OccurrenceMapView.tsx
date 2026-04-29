import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Colors } from '@/constants/colors';
import { tomtomCalculateRoute } from '@/lib/tomtom-routing';
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
  if (stop.kind === 'passenger') return `Pasajero: ${stop.sub.passenger?.name ?? 'Pasajero'}`;
  if (stop.kind === 'subscriber') return `Pasajero: ${stop.sub.passenger?.name ?? 'Pasajero'}`;
  return '';
}

function stopColor(stop: AnyStop): string {
  if (stop.kind === 'origin') return Colors.primary[600];
  if (stop.kind === 'destination') return Colors.accent[600];
  if (stop.kind === 'waypoint') return Colors.primary[400];
  return 'orange';   // passenger / subscriber
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
  const [computedLine, setComputedLine] = useState<{ latitude: number; longitude: number; }[]>([]);

  const baseLine = routeLine.length >= 2
    ? routeLine.map((p) => ({ latitude: p[0], longitude: p[1] }))
    : [{ latitude: origin.latitude, longitude: origin.longitude }, { latitude: destination.latitude, longitude: destination.longitude }];

  // Compute TomTom route through all ordered stops so the line passes through every pickup
  useEffect(() => {
    let cancelled = false;

    const intermediates = orderedStops.flatMap((stop) => {
      if (stop.kind === 'origin' || stop.kind === 'destination') return [];
      const c = stopCoords(stop);
      return c ? [c] : [];
    });

    const tomtomStops = [
      { latitude: origin.latitude, longitude: origin.longitude },
      ...intermediates,
      { latitude: destination.latitude, longitude: destination.longitude },
    ];

    tomtomCalculateRoute(tomtomStops)
      .then((result) => { if (!cancelled) setComputedLine(result.points); })
      .catch(() => { if (!cancelled) setComputedLine(baseLine); });

    return () => { cancelled = true; };
  }, [origin.latitude, origin.longitude, destination.latitude, destination.longitude, orderedStops]);

  const polyline = computedLine.length >= 2 ? computedLine : baseLine;

  useEffect(() => {
    if (!fitOnMount || polyline.length < 2) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(polyline, {
        edgePadding: { top: 80, right: 48, bottom: 80, left: 48 },
        animated: true,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [fitOnMount, computedLine.length]);

  // orderedStops already includes origin/destination from the build helpers,
  // so use it directly as the marker list to avoid duplicate keys.
  const markerStops = orderedStops.length > 0
    ? orderedStops
    : [
      { kind: 'origin' as const, lat: origin.latitude, lng: origin.longitude, name: origin.name },
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
        // Use stable identity-based keys so React Native Maps remounts markers
        // when their data changes (e.g. pinColor won't update on index-key reuse).
        let key: string;
        if (stop.kind === 'origin') key = 'origin';
        else if (stop.kind === 'destination') key = 'destination';
        else if (stop.kind === 'waypoint') key = `wp-${stop.data.id}`;
        else if (stop.kind === 'passenger') key = `pax-${stop.booking.id}`;
        else if (stop.kind === 'subscriber') key = `sub-${stop.sub.id}`;
        else key = `stop-${i}`;
        return (
          <Marker
            key={key}
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
