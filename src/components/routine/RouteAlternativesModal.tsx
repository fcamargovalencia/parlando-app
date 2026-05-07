import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { ArrowLeft, ChevronRight, Check } from 'lucide-react-native';
import { formatDuration } from '@/lib/utils';
import { Colors } from '@/constants/colors';
import type { RouteAlternative } from '@/hooks/useRouteAlternatives';

interface RouteAlternativesModalProps {
  visible: boolean;
  onClose: () => void;
  alternatives: RouteAlternative[];
  selectedId: string;
  onSelect: (id: string) => void;
  origin: { latitude: number; longitude: number; name: string; };
  destination: { latitude: number; longitude: number; name: string; };
}

const ALT_COLORS = [Colors.primary[600], '#f59e0b', '#10b981'];
const ALT_COLORS_DIM = ['rgba(37,99,235,0.35)', 'rgba(245,158,11,0.35)', 'rgba(16,185,129,0.35)'];

export function RouteAlternativesModal({
  visible,
  onClose,
  alternatives,
  selectedId,
  onSelect,
  origin,
  destination,
}: RouteAlternativesModalProps) {
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();
  const selected = alternatives.find(r => r.id === selectedId) ?? alternatives[0] ?? null;
  const selectedIndex = alternatives.findIndex(r => r.id === selectedId);

  useEffect(() => {
    if (!visible || !selected || selected.points.length < 2) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(selected.points, {
        edgePadding: { top: 80, right: 48, bottom: 220, left: 48 },
        animated: true,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [visible, selectedId]);

  const handleOffset = (offset: number) => {
    if (alternatives.length < 2) return;
    const idx = alternatives.findIndex(r => r.id === selectedId);
    if (idx < 0) return;
    const next = (idx + offset + alternatives.length) % alternatives.length;
    const nextAlt = alternatives[next];
    if (nextAlt) onSelect(nextAlt.id);
  };

  if (!alternatives.length) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          mapType="standard"
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          initialRegion={{
            latitude: (origin.latitude + destination.latitude) / 2,
            longitude: (origin.longitude + destination.longitude) / 2,
            latitudeDelta: Math.max(Math.abs(origin.latitude - destination.latitude) * 1.8, 0.2),
            longitudeDelta: Math.max(Math.abs(origin.longitude - destination.longitude) * 1.8, 0.2),
          }}
        >
          <Marker
            coordinate={{ latitude: origin.latitude, longitude: origin.longitude }}
            title={origin.name}
            pinColor={Colors.primary[600]}
          />
          <Marker
            coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
            title={destination.name}
            pinColor={Colors.accent[500]}
          />

          {/* Non-selected routes (drawn first, below) */}
          {alternatives.map((alt, idx) => {
            if (alt.id === selectedId) return null;
            return (
              <Polyline
                key={`dim-${alt.id}`}
                coordinates={alt.points}
                strokeWidth={4}
                strokeColor={ALT_COLORS_DIM[idx] ?? 'rgba(148,163,184,0.4)'}
                lineCap="round"
                lineJoin="round"
                zIndex={1}
              />
            );
          })}

          {/* Selected route (drawn on top) */}
          {selected && (
            <>
              <Polyline
                coordinates={selected.points}
                strokeColor="rgba(15,23,42,0.3)"
                strokeWidth={9}
                lineCap="round"
                lineJoin="round"
                zIndex={2}
              />
              <Polyline
                coordinates={selected.points}
                strokeColor={ALT_COLORS[selectedIndex] ?? Colors.primary[600]}
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
                zIndex={3}
              />
            </>
          )}
        </MapView>

        {/* Header overlay */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seleccionar ruta</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Route count badge */}
        {alternatives.length > 1 && (
          <View style={[styles.badge, { top: insets.top + 76 }]}>
            <Text style={styles.badgeText}>
              {selectedIndex + 1} / {alternatives.length}
            </Text>
          </View>
        )}

        {/* Bottom selector */}
        {selected && (
          <View style={[styles.bottomPanel, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}>
            <View style={styles.selectorRow}>
              <TouchableOpacity
                onPress={() => handleOffset(-1)}
                disabled={alternatives.length < 2}
                style={[styles.arrowBtn, alternatives.length < 2 && { opacity: 0.3 }]}
              >
                <ArrowLeft size={18} color={Colors.neutral[700]} />
              </TouchableOpacity>

              <View style={styles.routeInfo}>
                <View style={[styles.colorDot, { backgroundColor: ALT_COLORS[selectedIndex] ?? Colors.primary[600] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeTitle}>{selected.title}</Text>
                  <Text style={styles.routeMeta}>
                    {selected.distanceKm.toFixed(1)} km
                    {' · '}
                    {formatDuration(selected.durationMin)}
                    {' · '}
                    {selected.hasTolls ? 'Con peajes' : 'Sin peajes'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleOffset(1)}
                disabled={alternatives.length < 2}
                style={[styles.arrowBtn, alternatives.length < 2 && { opacity: 0.3 }]}
              >
                <ChevronRight size={18} color={Colors.neutral[700]} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={onClose} activeOpacity={0.85}>
              <Check size={18} color="#fff" />
              <Text style={styles.confirmText}>Confirmar esta ruta</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e2e8f0',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(15,23,42,0.65)',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  badge: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    gap: 10,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  routeMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[600],
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
