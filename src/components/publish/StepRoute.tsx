import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import MapView, { Polyline, Marker, type Region } from 'react-native-maps';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { formatDuration } from '@/lib/utils';
import type { SelectedLocation } from '@/components/LocationPickerModal';
import type { useRouteAlternatives } from '@/hooks/useRouteAlternatives';

type RouteHook = ReturnType<typeof useRouteAlternatives>;

interface Props {
  form: { origin: SelectedLocation | null; destination: SelectedLocation | null };
  waypoints: SelectedLocation[];
  routeHook: RouteHook;
  windowHeight: number;
  goNext: () => void;
  submitting: boolean;
}

export function StepRoute({ form, waypoints, routeHook, windowHeight, goNext, submitting }: Props) {
  if (!form.origin || !form.destination) {
    return (
      <>
        <Text className="text-sm font-semibold text-neutral-700 mb-2">Selección de ruta</Text>
        <Card>
          <Text className="text-sm text-neutral-500">
            Define origen y destino para ver alternativas de ruta.
          </Text>
        </Card>
      </>
    );
  }

  return (
    <>
      <Text className="text-sm font-semibold text-neutral-700 mb-2">Selección de ruta</Text>
      <View
        className="rounded-2xl overflow-hidden border border-neutral-200 bg-white"
        style={{ height: Math.max(400, windowHeight - 345) }}
      >
        <MapView
          ref={routeHook.mapRef}
          style={{ flex: 1 }}
          mapType="standard"
          scrollEnabled
          zoomEnabled
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          initialRegion={
            {
              latitude: (form.origin.latitude + form.destination.latitude) / 2,
              longitude: (form.origin.longitude + form.destination.longitude) / 2,
              latitudeDelta: Math.max(
                Math.abs(form.origin.latitude - form.destination.latitude) * 1.8,
                0.2,
              ),
              longitudeDelta: Math.max(
                Math.abs(form.origin.longitude - form.destination.longitude) * 1.8,
                0.2,
              ),
            } as Region
          }
        >
          <Marker
            coordinate={{ latitude: form.origin.latitude, longitude: form.origin.longitude }}
            title="Origen"
          />
          {waypoints.map((w, idx) => (
            <Marker
              key={`wp-${idx}`}
              coordinate={{ latitude: w.latitude, longitude: w.longitude }}
              title={`Parada ${idx + 1}: ${w.name}`}
              pinColor={Colors.semantic.warning}
            />
          ))}
          <Marker
            coordinate={{
              latitude: form.destination.latitude,
              longitude: form.destination.longitude,
            }}
            title="Destino"
            pinColor={Colors.accent[500]}
          />
          {routeHook.selected && (
            <Polyline
              coordinates={routeHook.selected.points}
              strokeWidth={6}
              strokeColor="#2563EB"
              lineCap="round"
              lineJoin="round"
            />
          )}
        </MapView>

        {routeHook.alternatives.length > 0 && routeHook.selected && (
          <View
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              right: 12,
              backgroundColor: 'rgba(255,255,255,0.95)',
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => routeHook.selectByOffset(-1)}
                disabled={routeHook.locked || routeHook.alternatives.length < 2}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor:
                    routeHook.locked || routeHook.alternatives.length < 2 ? '#f5f5f5' : '#fff',
                  borderWidth: 1,
                  borderColor: '#e5e5e5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: routeHook.locked || routeHook.alternatives.length < 2 ? 0.5 : 1,
                }}
              >
                <ArrowLeft size={16} color={Colors.neutral[700]} />
              </TouchableOpacity>

              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <Text className="text-sm font-semibold text-neutral-900 text-center">
                  {routeHook.selected.title}
                </Text>
                <Text className="text-xs text-neutral-500 text-center mt-0.5">
                  {routeHook.selected.distanceKm.toFixed(1)} km ·{' '}
                  {formatDuration(routeHook.selected.durationMin)} ·{' '}
                  {routeHook.selected.hasTolls ? 'Con peajes' : 'Sin peajes'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => routeHook.selectByOffset(1)}
                disabled={routeHook.locked || routeHook.alternatives.length < 2}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor:
                    routeHook.locked || routeHook.alternatives.length < 2 ? '#f5f5f5' : '#fff',
                  borderWidth: 1,
                  borderColor: '#e5e5e5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: routeHook.locked || routeHook.alternatives.length < 2 ? 0.5 : 1,
                }}
              >
                <ChevronRight size={16} color={Colors.neutral[700]} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={goNext}
                disabled={submitting}
                activeOpacity={0.85}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: Colors.primary[500],
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                }}
              >
                <ChevronRight size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </>
  );
}
