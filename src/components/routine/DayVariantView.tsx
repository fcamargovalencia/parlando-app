import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Users, Map } from 'lucide-react-native';
import { OccurrenceMapView } from '@/components/routine/OccurrenceMapView';
import { Colors } from '@/constants/colors';
import { useDayVariant } from '@/hooks/useDayVariant';
import type { RecurrenceDay, RoutineSubscriptionResponse } from '@/types/api';

// ── Day label ──

const DAY_LABELS: Record<RecurrenceDay, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mié', THU: 'Jue',
  FRI: 'Vie', SAT: 'Sáb', SUN: 'Dom',
};

const DAY_FULL: Record<RecurrenceDay, string> = {
  MON: 'Lunes', TUE: 'Martes', WED: 'Miércoles', THU: 'Jueves',
  FRI: 'Viernes', SAT: 'Sábado', SUN: 'Domingo',
};

// ── Subscriber row ──

function SubscriberRow({ sub }: { sub: RoutineSubscriptionResponse; }) {
  const name = sub.passenger?.name ?? 'Pasajero';
  const pickupLabel = sub.customPickupName
    ?? (sub.pickupType === 'ORIGIN' ? 'Origen del viaje' : 'Waypoint');

  return (
    <View style={styles.subRow}>
      <View style={styles.subDot} />
      <View style={styles.subInfo}>
        <Text style={styles.subName}>{name}</Text>
        <Text style={styles.subPickup} numberOfLines={1}>{pickupLabel}</Text>
      </View>
      {sub.passenger?.verified && (
        <Text style={styles.verifiedBadge}>✓</Text>
      )}
    </View>
  );
}

// ── Props ──

export interface DayVariantViewProps {
  routineTripId: string;
  recurrenceDays: RecurrenceDay[];
}

// ── Component ──

export function DayVariantView({ routineTripId, recurrenceDays }: DayVariantViewProps) {
  const [selectedDay, setSelectedDay] = useState<RecurrenceDay>(recurrenceDays[0]);

  const { routineTrip, dayStops, activeSubscriptions } = useDayVariant(routineTripId, selectedDay);

  if (!routineTrip) return null;

  return (
    <View style={styles.container}>
      {/* Day selector (single-select pill row) */}
      <View style={styles.dayRow}>
        {recurrenceDays.map((day) => (
          <TouchableOpacity
            key={day}
            onPress={() => setSelectedDay(day)}
            style={[styles.dayPill, selectedDay === day && styles.dayPillActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayPillText, selectedDay === day && styles.dayPillTextActive]}>
              {DAY_LABELS[day]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <OccurrenceMapView
          routeLine={routineTrip.routeLine ?? []}
          origin={{
            latitude: routineTrip.originLatitude,
            longitude: routineTrip.originLongitude,
            name: routineTrip.originName,
          }}
          destination={{
            latitude: routineTrip.destinationLatitude,
            longitude: routineTrip.destinationLongitude,
            name: routineTrip.destinationName,
          }}
          orderedStops={dayStops}
          fitOnMount
        />
      </View>

      {/* Subscribers list */}
      <View style={styles.listSection}>
        <View style={styles.listHeader}>
          <Users size={15} color={Colors.primary[500]} />
          <Text style={styles.listTitle}>
            Pasajeros los {DAY_FULL[selectedDay]} ({activeSubscriptions.length})
          </Text>
        </View>

        {activeSubscriptions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Ningún pasajero suscrito para este día</Text>
          </View>
        ) : (
          activeSubscriptions.map((sub) => (
            <SubscriberRow key={sub.id} sub={sub} />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dayPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    backgroundColor: Colors.neutral[50],
  },
  dayPillActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  dayPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.neutral[600],
  },
  dayPillTextActive: {
    color: Colors.white,
  },
  mapContainer: {
    height: 240,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.neutral[100],
  },
  listSection: { paddingHorizontal: 16, paddingTop: 16 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  listTitle: { fontSize: 14, fontWeight: '600', color: Colors.neutral[800] },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  subDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent[500],
  },
  subInfo: { flex: 1 },
  subName: { fontSize: 13, fontWeight: '600', color: Colors.neutral[900] },
  subPickup: { fontSize: 11, color: Colors.neutral[500], marginTop: 1 },
  verifiedBadge: { fontSize: 11, color: Colors.primary[600], fontWeight: '700' },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[100],
  },
  emptyText: { fontSize: 13, color: Colors.neutral[400] },
});
