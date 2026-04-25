import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { ArrowLeft, Plus, ChevronUp, ChevronDown, X, Map } from 'lucide-react-native';
import { Colors, Shadows } from '@/constants/colors';
import { Button } from '@/components/ui';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import { useEditRouteModal } from '@/hooks/useEditRouteModal';
import type { TripResponse } from '@/types/api';

interface Props {
  visible: boolean;
  trip: TripResponse;
  onClose: () => void;
  onSuccess: (updated: TripResponse) => void;
}

export function EditRouteModal({ visible, trip, onClose, onSuccess }: Props) {
  const {
    mapRef,
    waypoints,
    routePolyline,
    isLoadingWaypoints,
    isCalculating,
    isSaving,
    showPicker,
    setShowPicker,
    origin,
    destination,
    handleAddWaypoint,
    handleRemove,
    handleMoveUp,
    handleMoveDown,
    handlePreviewRoute,
    handleUpdateRoute,
  } = useEditRouteModal(trip, visible, onSuccess, onClose);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        {/* Header */}
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
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#0f172a' }}>Modificar ruta</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Map */}
        <View style={{ height: 240 }}>
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
            <Marker
              coordinate={origin}
              title={trip.originName}
              pinColor={Colors.primary[600]}
            />
            {waypoints.map((w, i) => (
              <Marker
                key={`wp-${i}`}
                coordinate={{ latitude: w.latitude, longitude: w.longitude }}
                title={w.name}
                pinColor={Colors.primary[400]}
              />
            ))}
            <Marker
              coordinate={destination}
              title={trip.destinationName}
              pinColor={Colors.accent[600]}
            />
          </MapView>

          {(isCalculating || isLoadingWaypoints) && (
            <View
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
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
              <Text style={{ fontSize: 11, color: Colors.neutral[600] }}>
                {isLoadingWaypoints ? 'Cargando…' : 'Recalculando…'}
              </Text>
            </View>
          )}
        </View>

        {/* Stop list */}
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
                <Text
                  style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}
                  numberOfLines={1}
                >
                  {trip.originSubtitle}
                </Text>
              )}
            </View>
          </View>

          {/* Editable waypoints */}
          {waypoints.map((w, idx) => (
            <View
              key={`stop-${idx}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                backgroundColor: '#fff',
                paddingHorizontal: 12,
                paddingVertical: 10,
                ...Shadows.sm,
              }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '600' }}>
                  PARADA {idx + 1}
                </Text>
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
          ))}

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
                <Text
                  style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}
                  numberOfLines={1}
                >
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

          {/* Preview */}
          <Button
            variant="outline"
            onPress={handlePreviewRoute}
            loading={isCalculating}
            disabled={isSaving}
            icon={<Map size={16} color={Colors.primary[700]} />}
          >
            Ver ruta definitiva
          </Button>

          {/* Confirm */}
          <Button
            variant="primary"
            onPress={handleUpdateRoute}
            loading={isSaving}
            disabled={isCalculating || isLoadingWaypoints}
          >
            Actualizar ruta
          </Button>

          <View style={{ height: Platform.OS === 'ios' ? 32 : 16 }} />
        </ScrollView>
      </View>

      <LocationPickerModal
        visible={showPicker}
        title="Nueva parada"
        onConfirm={handleAddWaypoint}
        onClose={() => setShowPicker(false)}
      />
    </Modal>
  );
}
