import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { ArrowLeft, Plus, ChevronUp, ChevronDown, X, Maximize2, Minimize2 } from 'lucide-react-native';
import { Colors, Shadows } from '@/constants/colors';
import { Button, Toggle } from '@/components/ui';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import { useRoutineEditRouteModal } from '@/hooks/useRoutineEditRouteModal';
import type { RoutineTripResponse, RoutineWaypointResponse } from '@/types/api';

interface Props {
  visible: boolean;
  trip: RoutineTripResponse;
  existingWaypoints: RoutineWaypointResponse[];
  onClose: () => void;
  onDone: () => void;
}

export function RoutineEditRouteModal({
  visible,
  trip,
  existingWaypoints,
  onClose,
  onDone,
}: Props) {
  const {
    mapRef,
    waypoints,
    routePolyline,
    isCalculating,
    isSaving,
    showPicker,
    hasNewWaypoints,
    setShowPicker,
    fitMap,
    origin,
    destination,
    handleAddWaypoint,
    handleRemove,
    handleMoveUp,
    handleMoveDown,
    handleUpdateMinutes,
    handleTogglePickup,
    handleUpdateRoute,
  } = useRoutineEditRouteModal(trip, existingWaypoints, visible, onDone);

  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const mapContent = (
    <>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: (origin.latitude + destination.latitude) / 2,
          longitude: (origin.longitude + destination.longitude) / 2,
          latitudeDelta: Math.abs(origin.latitude - destination.latitude) * 2.5 + 0.05,
          longitudeDelta: Math.abs(origin.longitude - destination.longitude) * 2.5 + 0.05,
        }}
      >
        {routePolyline.length >= 2 && (
          <>
            <Polyline
              coordinates={routePolyline}
              strokeColor="rgba(15, 23, 42, 0.45)"
              strokeWidth={9}
              lineCap="round"
              lineJoin="round"
              zIndex={1}
            />
            <Polyline
              coordinates={routePolyline}
              strokeColor="#2563EB"
              strokeWidth={5.5}
              lineCap="round"
              lineJoin="round"
              zIndex={2}
            />
          </>
        )}
        <Marker coordinate={origin} title={trip.originName} pinColor={Colors.primary[600]} />
        {waypoints.map((w, i) => (
          <Marker
            key={`wp-${i}`}
            coordinate={{ latitude: w.latitude, longitude: w.longitude }}
            title={w.name}
            pinColor={w.id ? Colors.primary[400] : Colors.semantic.warning}
          />
        ))}
        <Marker
          coordinate={destination}
          title={trip.destinationName}
          pinColor={Colors.accent[600]}
        />
      </MapView>

      {/* Calculating indicator */}
      {isCalculating && (
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            ...Shadows.sm,
          }}
        >
          <ActivityIndicator size="small" color={Colors.primary[600]} />
          <Text style={{ fontSize: 11, color: Colors.neutral[600] }}>Recalculando…</Text>
        </View>
      )}

      {/* Expand / collapse button */}
      <TouchableOpacity
        onPress={() => {
          const next = !isMapExpanded;
          setIsMapExpanded(next);
          if (next) fitMap(routePolyline.length >= 2 ? routePolyline : [origin, destination]);
        }}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 34,
          height: 34,
          borderRadius: 8,
          backgroundColor: 'rgba(255,255,255,0.92)',
          alignItems: 'center',
          justifyContent: 'center',
          ...Shadows.sm,
        }}
      >
        {isMapExpanded ? (
          <Minimize2 size={17} color={Colors.neutral[700]} />
        ) : (
          <Maximize2 size={17} color={Colors.neutral[700]} />
        )}
      </TouchableOpacity>
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={isMapExpanded ? () => setIsMapExpanded(false) : onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        {/* Header — hidden when map expanded */}
        {!isMapExpanded && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 12,
              backgroundColor: '#fff',
              borderBottomWidth: 1,
              borderBottomColor: '#f1f5f9',
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={22} color={Colors.neutral[700]} />
            </TouchableOpacity>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#0f172a' }}>
              Modificar ruta
            </Text>
            <View style={{ width: 36 }} />
          </View>
        )}

        {/* Map */}
        <View style={isMapExpanded ? { flex: 1 } : { height: 240 }}>{mapContent}</View>

        {/* Stop list — hidden when map expanded */}
        {!isMapExpanded && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Origin (fixed) */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: Colors.primary[200],
                backgroundColor: Colors.primary[50],
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: Colors.primary[500],
                  marginRight: 8,
                  marginTop: 4,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: Colors.primary[600], fontWeight: '600' }}>
                  ORIGEN
                </Text>
                <Text
                  style={{ fontSize: 14, fontWeight: '500', color: '#0f172a' }}
                  numberOfLines={1}
                >
                  {trip.originName}
                </Text>
                {!!trip.originSubtitle && (
                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }} numberOfLines={1}>
                    {trip.originSubtitle}
                  </Text>
                )}
              </View>
            </View>

            {/* Editable waypoints */}
            {waypoints.map((w, idx) => {
              const isNew = !w.id;
              return (
                <View
                  key={`stop-${idx}`}
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isNew ? Colors.primary[300] : '#e2e8f0',
                    backgroundColor: '#fff',
                    padding: 12,
                    ...Shadows.sm,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '600' }}>
                          PARADA {idx + 1}
                        </Text>
                        {isNew && (
                          <View
                            style={{
                              backgroundColor: Colors.primary[100],
                              borderRadius: 4,
                              paddingHorizontal: 5,
                              paddingVertical: 1,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 9,
                                color: Colors.primary[700],
                                fontWeight: '700',
                              }}
                            >
                              NUEVA
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={{ fontSize: 14, fontWeight: '500', color: '#0f172a' }}
                        numberOfLines={1}
                      >
                        {w.name}
                      </Text>
                      {!!w.subtitle && (
                        <Text
                          style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}
                          numberOfLines={1}
                        >
                          {w.subtitle}
                        </Text>
                      )}
                      {!isNew && (
                        <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                          {w.estimatedMinutesOffset} min desde salida ·{' '}
                          {w.isPickupPoint ? 'Punto de recogida' : 'Parada intermedia'}
                        </Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <TouchableOpacity
                        onPress={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: idx === 0 ? 0.3 : 1,
                        }}
                      >
                        <ChevronUp size={14} color={Colors.neutral[600]} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleMoveDown(idx)}
                        disabled={idx === waypoints.length - 1}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: idx === waypoints.length - 1 ? 0.3 : 1,
                        }}
                      >
                        <ChevronDown size={14} color={Colors.neutral[600]} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRemove(idx)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <X size={14} color={Colors.neutral[500]} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* New waypoint extra fields */}
                  {isNew && (
                    <View
                      style={{
                        marginTop: 10,
                        paddingTop: 10,
                        borderTopWidth: 1,
                        borderTopColor: '#f1f5f9',
                        gap: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 12, color: '#64748b', flex: 1 }}>
                          Minutos desde salida
                        </Text>
                        <TextInput
                          value={String(w.estimatedMinutesOffset)}
                          onChangeText={(v) => handleUpdateMinutes(idx, v)}
                          keyboardType="number-pad"
                          style={{
                            width: 60,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            borderRadius: 8,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            fontSize: 13,
                            color: '#0f172a',
                            textAlign: 'center',
                            backgroundColor: '#f8fafc',
                          }}
                        />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 12, color: '#64748b', flex: 1 }}>
                          Punto de recogida
                        </Text>
                        <Toggle value={w.isPickupPoint} onPress={() => handleTogglePickup(idx)} />
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Destination (fixed) */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: Colors.accent[200],
                backgroundColor: Colors.accent[50],
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: Colors.accent[500],
                  marginRight: 8,
                  marginTop: 4,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: Colors.accent[600], fontWeight: '600' }}>
                  DESTINO
                </Text>
                <Text
                  style={{ fontSize: 14, fontWeight: '500', color: '#0f172a' }}
                  numberOfLines={1}
                >
                  {trip.destinationName}
                </Text>
                {!!trip.destinationSubtitle && (
                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }} numberOfLines={1}>
                    {trip.destinationSubtitle}
                  </Text>
                )}
              </View>
            </View>

            {/* Add stop */}
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: Colors.primary[300],
                borderStyle: 'dashed',
                gap: 8,
                marginTop: 4,
              }}
            >
              <Plus size={16} color={Colors.primary[600]} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.primary[600] }}>
                Agregar parada
              </Text>
            </TouchableOpacity>

            {/* Confirm */}
            <Button
              variant="primary"
              onPress={handleUpdateRoute}
              loading={isSaving}
              disabled={isCalculating || !hasNewWaypoints}
            >
              Actualizar ruta
            </Button>

            <View style={{ height: Platform.OS === 'ios' ? 32 : 16 }} />
          </ScrollView>
        )}
      </View>

      <LocationPickerModal
        visible={showPicker}
        title="Nueva parada"
        routeLine={trip.routeLine}
        onConfirm={handleAddWaypoint}
        onClose={() => setShowPicker(false)}
      />
    </Modal>
  );
}
