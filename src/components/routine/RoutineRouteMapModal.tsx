import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { ArrowLeft, ChevronDown, ChevronUp, Save } from 'lucide-react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, Shadows } from '@/constants/colors';
import { haversineMeters } from '@/lib/geo';
import { tomtomCalculateRoute } from '@/lib/tomtom-routing';
import { routineTripsApi } from '@/api/routine-trips';
import type { RecurrenceDay } from '@/types/api';

// ── Types ──

interface WaypointMapStop {
  id: string;
  orderIndex?: number;
  latitude: number;
  longitude: number;
  name: string;
  applicableDays?: RecurrenceDay[];
  dayOrderOverrides?: Record<string, number>;
}

interface SuggestedStop {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
}

type OrderedStop =
  | { kind: 'waypoint'; data: WaypointMapStop; }
  | { kind: 'suggested'; data: SuggestedStop; };

interface RoutineRouteMapModalProps {
  visible: boolean;
  onClose: () => void;
  routineTripId?: string;
  subscriptionId?: string;
  onAccept?: (subscriptionId: string) => Promise<void>;
  onAcceptComplete?: () => void;
  originName: string;
  originLatitude: number;
  originLongitude: number;
  destinationName: string;
  destinationLatitude: number;
  destinationLongitude: number;
  routeLine?: [number, number][];
  waypoints?: WaypointMapStop[];
  suggestedStop?: SuggestedStop;
  subscribedDays?: RecurrenceDay[];
}

// ── Helpers ──

function closestRouteIdx(
  coords: { latitude: number; longitude: number; }[],
  lat: number,
  lng: number,
): number {
  let best = 0;
  let minD = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const d = haversineMeters(coords[i].latitude, coords[i].longitude, lat, lng);
    if (d < minD) { minD = d; best = i; }
  }
  return best;
}

function buildInitialOrder(
  waypoints: WaypointMapStop[],
  suggestedStop: SuggestedStop | undefined,
  routeLine: [number, number][] | undefined,
  selectedDay: RecurrenceDay | null,
): OrderedStop[] {
  const baseCoords = routeLine?.map((p) => ({ latitude: p[0], longitude: p[1] })) ?? [];

  const waypointIdx = (wp: WaypointMapStop): number => {
    // 1. Day-specific override persisted by backend
    if (selectedDay && wp.dayOrderOverrides?.[selectedDay] !== undefined) {
      return wp.dayOrderOverrides[selectedDay];
    }
    // 2. Global orderIndex from backend
    if (wp.orderIndex !== undefined) return wp.orderIndex;
    // 3. Fallback: nearest point on route polyline
    return baseCoords.length >= 2
      ? closestRouteIdx(baseCoords, wp.latitude, wp.longitude)
      : 0;
  };

  const entries: Array<{ stop: OrderedStop; idx: number; }> = [
    ...waypoints.map((wp) => ({
      stop: { kind: 'waypoint' as const, data: wp },
      idx: waypointIdx(wp),
    })),
    ...(suggestedStop
      ? [{
        stop: { kind: 'suggested' as const, data: suggestedStop },
        idx: baseCoords.length >= 2
          ? closestRouteIdx(baseCoords, suggestedStop.latitude, suggestedStop.longitude)
          : 0,
      }]
      : []),
  ];

  return entries.sort((a, b) => a.idx - b.idx).map((e) => e.stop);
}

// ── Day labels ──

const DAY_LABELS: Record<RecurrenceDay, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mié', THU: 'Jue', FRI: 'Vie', SAT: 'Sáb', SUN: 'Dom',
};

const EMPTY_WAYPOINTS: WaypointMapStop[] = [];

// ── Component ──

export function RoutineRouteMapModal({
  visible,
  onClose,
  routineTripId,
  subscriptionId,
  onAccept,
  onAcceptComplete,
  originName,
  originLatitude,
  originLongitude,
  destinationName,
  destinationLatitude,
  destinationLongitude,
  routeLine,
  waypoints = EMPTY_WAYPOINTS,
  suggestedStop,
  subscribedDays,
}: RoutineRouteMapModalProps) {
  const mapRef = useRef<MapView>(null);
  const [routeLineCoords, setRouteLineCoords] = useState<{ latitude: number; longitude: number; }[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderedStops, setOrderedStops] = useState<OrderedStop[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<RecurrenceDay | null>(
    subscribedDays?.[0] ?? null,
  );

  const filteredWaypoints = useMemo(() => {
    if (selectedDay === null) return waypoints;
    return waypoints.filter(
      (w) => !w.applicableDays?.length || w.applicableDays.includes(selectedDay),
    );
  }, [waypoints, selectedDay]);

  // Reset selectedDay and dirty flag when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedDay(subscribedDays?.[0] ?? null);
      setIsDirty(false);
    }
  }, [visible, subscribedDays]);

  // Rebuild ordered stops whenever day filter or route data changes
  useEffect(() => {
    if (visible) {
      setOrderedStops(buildInitialOrder(filteredWaypoints, suggestedStop, routeLine, selectedDay));
      setIsDirty(false);
    }
  }, [visible, filteredWaypoints, suggestedStop, routeLine, selectedDay]);

  const fallbackCoords = [
    { latitude: originLatitude, longitude: originLongitude },
    { latitude: destinationLatitude, longitude: destinationLongitude },
  ];
  const renderedRouteLine = routeLineCoords.length >= 2 ? routeLineCoords : fallbackCoords;

  // Recalculate route using user-defined order whenever orderedStops changes
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    const baseCoords = routeLine?.map((p) => ({ latitude: p[0], longitude: p[1] })) ?? [];

    // No intermediate stops or no base route → just draw straight line
    if (orderedStops.length === 0 || baseCoords.length < 2) {
      setRouteLineCoords(baseCoords);
      return;
    }

    const tomtomStops = [
      { latitude: originLatitude, longitude: originLongitude },
      ...orderedStops.map((s) => ({ latitude: s.data.latitude, longitude: s.data.longitude })),
      { latitude: destinationLatitude, longitude: destinationLongitude },
    ];

    setLoading(true);
    tomtomCalculateRoute(tomtomStops)
      .then((result) => { if (!cancelled) setRouteLineCoords(result.points); })
      .catch(() => { if (!cancelled) setRouteLineCoords(baseCoords); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [visible, routeLine, orderedStops, originLatitude, originLongitude, destinationLatitude, destinationLongitude]);

  // Fit map to all coords after route loads
  useEffect(() => {
    if (!visible || loading) return;
    const allCoords = [
      ...renderedRouteLine,
      ...orderedStops.map((s) => ({ latitude: s.data.latitude, longitude: s.data.longitude })),
    ];
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(allCoords, {
        edgePadding: { top: 80, right: 48, bottom: 280, left: 48 },
        animated: true,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [visible, loading, renderedRouteLine, orderedStops]);

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setOrderedStops((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
    setIsDirty(true);
  };

  const moveDown = (idx: number) => {
    setOrderedStops((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
    setIsDirty(true);
  };

  const handleAccept = async () => {
    if (!routineTripId || !subscriptionId || !onAccept) return;
    setIsSaving(true);
    try {
      let finalStops = [...orderedStops];

      // 1. Register suggested stop as a waypoint
      const suggestedIdx = finalStops.findIndex((s) => s.kind === 'suggested');
      if (suggestedIdx !== -1) {
        const suggested = finalStops[suggestedIdx].data;
        const newWaypoint = await routineTripsApi.addWaypoint(routineTripId, {
          orderIndex: waypoints.length,
          latitude: suggested.latitude,
          longitude: suggested.longitude,
          name: suggested.name,
          isPickupPoint: true,
          estimatedMinutesOffset: 0,
        });
        const createdWp = newWaypoint.data.data!;
        // Replace suggested entry with the real waypoint
        finalStops = finalStops.map((s, i) =>
          i === suggestedIdx
            ? { kind: 'waypoint' as const, data: { id: createdWp.id, latitude: createdWp.latitude, longitude: createdWp.longitude, name: createdWp.name } }
            : s,
        );
      }

      // 2. Reorder all waypoints in the user-defined order
      const orderedIds = finalStops
        .filter((s): s is { kind: 'waypoint'; data: WaypointMapStop; } => s.kind === 'waypoint')
        .map((s) => s.data.id);
      if (orderedIds.length > 0) {
        await routineTripsApi.reorderWaypoints(routineTripId, { orderedIds, day: selectedDay ?? undefined });
      }

      // 3. Accept the subscription
      await onAccept(subscriptionId);

      onAcceptComplete?.();
    } catch {
      Alert.alert('Error', 'No se pudo aceptar la suscripción. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOrder = async () => {
    if (!routineTripId || !isDirty) return;
    setIsSaving(true);
    try {
      const waypointIds = orderedStops
        .filter((s): s is { kind: 'waypoint'; data: WaypointMapStop; } => s.kind === 'waypoint')
        .map((s) => s.data.id);
      await routineTripsApi.reorderWaypoints(routineTripId, { orderedIds: waypointIds, day: selectedDay ?? undefined });
      setIsDirty(false);
    } catch {
      Alert.alert('Error', 'No se pudo guardar el orden de las paradas.');
    } finally {
      setIsSaving(false);
    }
  };

  const canReorder = orderedStops.length > 1;

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
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Ruta del viaje</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Day selector — only shown when subscription spans multiple days */}
        {subscribedDays && subscribedDays.length > 1 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              <TouchableOpacity
                onPress={() => setSelectedDay(null)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: selectedDay === null ? Colors.primary[500] : 'transparent',
                  borderWidth: 1,
                  borderColor: selectedDay === null ? Colors.primary[500] : 'rgba(255,255,255,0.3)',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Todos</Text>
              </TouchableOpacity>
              {subscribedDays.map((day) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => setSelectedDay(day)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: selectedDay === day ? Colors.primary[500] : 'transparent',
                    borderWidth: 1,
                    borderColor: selectedDay === day ? Colors.primary[500] : 'rgba(255,255,255,0.3)',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>
                    {DAY_LABELS[day]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: '#94a3b8', marginTop: 12, fontSize: 13 }}>Calculando ruta…</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
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
              {orderedStops.map((stop) =>
                stop.kind === 'waypoint' ? (
                  <Marker
                    key={stop.data.id}
                    coordinate={{ latitude: stop.data.latitude, longitude: stop.data.longitude }}
                    title={stop.data.name}
                    pinColor={Colors.primary[400]}
                  />
                ) : (
                  <Marker
                    key={`suggested-${stop.data.id}`}
                    coordinate={{ latitude: stop.data.latitude, longitude: stop.data.longitude }}
                    title={stop.data.name}
                    pinColor="orange"
                  />
                ),
              )}
              <Marker
                coordinate={{ latitude: destinationLatitude, longitude: destinationLongitude }}
                title={destinationName}
                pinColor={Colors.accent[600]}
              />
            </MapView>

            {/* Bottom panel */}
            <View
              style={{
                position: 'absolute',
                bottom: Platform.OS === 'ios' ? 40 : 24,
                left: 16,
                right: 16,
                backgroundColor: '#fff',
                borderRadius: 16,
                maxHeight: 280,
                ...Shadows.lg,
              }}
            >
              <ScrollView
                style={{ paddingHorizontal: 16, paddingTop: 16 }}
                contentContainerStyle={{ paddingBottom: 4 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Day preview info */}
                {selectedDay !== null && (
                  <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 8, textAlign: 'center' }}>
                    Orden del {DAY_LABELS[selectedDay]} · "Todos" muestra el orden global
                  </Text>
                )}
                {selectedDay !== null && suggestedStop && (
                  <View style={{ backgroundColor: '#FFFBEB', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 8 }}>
                    <Text style={{ fontSize: 11, color: '#92400e' }}>
                      El punto de recogida (naranja) aplica a todos los días
                    </Text>
                  </View>
                )}
                {/* Origin (fixed) */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary[500] }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#1e293b', flex: 1 }} numberOfLines={1}>
                    {originName}
                  </Text>
                </View>

                {/* Reorderable stops (waypoints + suggested) */}
                {orderedStops.map((stop, idx) => {
                  const isSuggested = stop.kind === 'suggested';
                  const dotColor = isSuggested ? '#F59E0B' : Colors.primary[400];
                  const textColor = isSuggested ? '#92400e' : '#475569';
                  const label = isSuggested
                    ? `${stop.data.name} (sugerido)`
                    : stop.data.name;

                  return (
                    <View
                      key={stop.kind === 'waypoint' ? stop.data.id : `suggested-${stop.data.id}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 8,
                        backgroundColor: isSuggested ? '#FFFBEB' : '#F8FAFC',
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}
                    >
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor, marginLeft: 1 }} />
                      <Text style={{ fontSize: 11, fontWeight: '500', color: textColor, flex: 1 }} numberOfLines={1}>
                        {label}
                      </Text>
                      {canReorder && (
                        <View style={{ flexDirection: 'row', gap: 2 }}>
                          <TouchableOpacity
                            onPress={() => moveUp(idx)}
                            disabled={idx === 0}
                            style={{ padding: 4, opacity: idx === 0 ? 0.3 : 1 }}
                          >
                            <ChevronUp size={14} color={Colors.primary[600]} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => moveDown(idx)}
                            disabled={idx === orderedStops.length - 1}
                            style={{ padding: 4, opacity: idx === orderedStops.length - 1 ? 0.3 : 1 }}
                          >
                            <ChevronDown size={14} color={Colors.primary[600]} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Destination (fixed) */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent[500] }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#1e293b', flex: 1 }} numberOfLines={1}>
                    {destinationName}
                  </Text>
                </View>
              </ScrollView>

              {/* Accept subscription (when there's a suggested stop) */}
              {suggestedStop && subscriptionId && onAccept && (
                <TouchableOpacity
                  onPress={handleAccept}
                  disabled={isSaving}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginHorizontal: 16,
                    marginBottom: 16,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: Colors.primary[500],
                    opacity: isSaving ? 0.6 : 1,
                  }}
                >
                  {isSaving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Save size={14} color="#fff" />
                  }
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
                    {isSaving ? 'Aceptando…' : 'Aceptar suscripción'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Save waypoint order only (no suggested stop context) */}
              {!suggestedStop && isDirty && routineTripId && (
                <TouchableOpacity
                  onPress={handleSaveOrder}
                  disabled={isSaving}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginHorizontal: 16,
                    marginBottom: 16,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: Colors.primary[500],
                    opacity: isSaving ? 0.6 : 1,
                  }}
                >
                  {isSaving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Save size={14} color="#fff" />
                  }
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
                    {isSaving ? 'Guardando…' : 'Guardar orden'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
