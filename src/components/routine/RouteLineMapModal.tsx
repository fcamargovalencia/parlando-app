import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface Point {
  latitude: number;
  longitude: number;
}

interface RouteLineMapModalProps {
  visible: boolean;
  onClose: () => void;
  routePolyline: Array<{ latitude: number; longitude: number; }>;
  origin: Point & { name: string; };
  destination: Point & { name: string; };
}

export function RouteLineMapModal({
  visible,
  onClose,
  routePolyline,
  origin,
  destination,
}: RouteLineMapModalProps) {
  const mapRef = useRef<MapView>(null);
  const polyline = routePolyline.length >= 2 ? routePolyline : [origin, destination];

  useEffect(() => {
    if (!visible || polyline.length < 2) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(polyline, {
        edgePadding: { top: 80, right: 48, bottom: 80, left: 48 },
        animated: true,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Ruta trazada</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Map */}
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
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
            strokeColor={Colors.primary[600]}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
            zIndex={2}
          />
          <Marker
            coordinate={origin}
            title={origin.name}
            pinColor={Colors.primary[600]}
          />
          <Marker
            coordinate={destination}
            title={destination.name}
            pinColor={Colors.accent[500]}
          />
        </MapView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
