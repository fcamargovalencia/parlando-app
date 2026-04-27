import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Banknote, ChevronRight, Clock, Info, Pause, Pencil, Play, Repeat } from 'lucide-react-native';
import { RoutePreview } from '@/components/RoutePreview';
import { Colors } from '@/constants/colors';
import { formatCurrency } from '@/lib/utils';
import type { RoutineTripResponse, RoutineTripStatus, RecurrenceDay } from '@/types/api';

const DAY_SHORT: Record<RecurrenceDay, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mié', THU: 'Jue',
  FRI: 'Vie', SAT: 'Sáb', SUN: 'Dom',
};

const ALL_DAYS: RecurrenceDay[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const DAY_TO_NUM: Record<RecurrenceDay, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

const MONTH_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function computeNextTrip(days: RecurrenceDay[], departureTime: string): string | null {
  if (!days.length) return null;
  const now = new Date();
  const parts = departureTime.split(':');
  const hour = parseInt(parts[0] ?? '0', 10);
  const minute = parseInt(parts[1] ?? '0', 10);
  const numDays = days.map((d) => DAY_TO_NUM[d]);

  for (let i = 0; i <= 7; i++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + i);
    candidate.setHours(hour, minute, 0, 0);
    if (numDays.includes(candidate.getDay()) && candidate > now) {
      const dayKey = days.find((d) => DAY_TO_NUM[d] === candidate.getDay());
      const dayName = dayKey ? DAY_SHORT[dayKey] : '';
      const month = MONTH_ES[candidate.getMonth()];
      return `${dayName} ${candidate.getDate()} ${month} · ${departureTime}`;
    }
  }
  return null;
}

const STATUS_ACCENT: Record<RoutineTripStatus, string> = {
  DRAFT: Colors.neutral[300],
  ACTIVE: Colors.primary[500],
  PAUSED: '#F59E0B',
  COMPLETED: Colors.neutral[300],
  CANCELLED: Colors.neutral[300],
};

const STATUS_CHIP: Record<RoutineTripStatus, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: 'bg-neutral-100', text: 'text-neutral-600', label: 'Borrador' },
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Activa' },
  PAUSED: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pausada' },
  COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completada' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelada' },
};

export interface RoutineCardProps {
  trip: RoutineTripResponse;
  actioning: boolean;
  onPress: () => void;
  onEdit: () => void;
  onPause: () => void;
  onResume: () => void;
  onViewTrips: () => void;
}

export function RoutineCard({ trip, actioning, onPress, onEdit, onPause, onResume, onViewTrips }: RoutineCardProps) {
  const status = trip.status as RoutineTripStatus;
  const chip = STATUS_CHIP[status];
  const accentColor = STATUS_ACCENT[status];
  const activeDaySet = useMemo(
    () => new Set(trip.recurrenceDays as RecurrenceDay[]),
    [trip.recurrenceDays],
  );
  const nextTrip = useMemo(
    () => computeNextTrip(trip.recurrenceDays as RecurrenceDay[], trip.departureTime),
    [trip.recurrenceDays, trip.departureTime],
  );
  const isReadOnly = status === 'COMPLETED' || status === 'CANCELLED';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.neutral[100],
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 4, backgroundColor: accentColor }} />

          <View style={{ flex: 1, padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  width: 26, height: 26, borderRadius: 8,
                  backgroundColor: status === 'ACTIVE' ? Colors.primary[50] : '#FEF3C7',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Repeat size={13} color={status === 'ACTIVE' ? Colors.primary[500] : '#F59E0B'} />
                </View>
                <View className={`px-2.5 py-0.5 rounded-full ${chip.bg}`}>
                  <Text className={`text-xs font-semibold ${chip.text}`}>{chip.label}</Text>
                </View>
              </View>

              {!isReadOnly && (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); onEdit(); }}
                    style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Pencil size={13} color={Colors.neutral[600]} />
                  </TouchableOpacity>

                  {(status === 'ACTIVE' || status === 'PAUSED') && (
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation?.(); status === 'ACTIVE' ? onPause() : onResume(); }}
                      disabled={actioning}
                      style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center' }}
                    >
                      {actioning
                        ? <ActivityIndicator size={12} color={Colors.neutral[600]} />
                        : status === 'ACTIVE'
                          ? <Pause size={13} color={Colors.neutral[600]} />
                          : <Play size={13} color={Colors.neutral[600]} />
                      }
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            <RoutePreview
              originName={trip.originName}
              originSubtitle={trip.originSubtitle}
              destinationName={trip.destinationName}
              destinationSubtitle={trip.destinationSubtitle}
              compact
            />

            <View style={{ flexDirection: 'row', gap: 4, marginTop: 10 }}>
              {ALL_DAYS.map((day) => {
                const isActive = activeDaySet.has(day);
                return (
                  <View key={day} style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: isActive ? Colors.primary[500] : Colors.neutral[100],
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: isActive ? '#fff' : Colors.neutral[400] }}>
                      {DAY_SHORT[day].slice(0, 2)}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Clock size={12} color={Colors.neutral[400]} />
                <Text style={{ fontSize: 12, color: Colors.neutral[500] }}>
                  {trip.departureTime} → {trip.requiredArrivalTime}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Banknote size={12} color={Colors.neutral[400]} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.neutral[900] }}>
                  {formatCurrency(trip.pricePerSeat, trip.currency)}
                  <Text style={{ fontWeight: '400', color: Colors.neutral[500] }}> / asiento</Text>
                </Text>
              </View>
            </View>
          </View>
        </View>

        {status === 'ACTIVE' && (
          <View style={{
            borderTopWidth: 1,
            borderTopColor: Colors.neutral[100],
            backgroundColor: Colors.primary[50],
          }}>
            {nextTrip && (
              <View style={{ paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: Colors.primary[700] }}>
                    Próximo viaje
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.primary[700] }}>
                    {nextTrip}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation?.(); onViewTrips(); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.primary[500] }}>
                    Ver viajes
                  </Text>
                  <ChevronRight size={14} color={Colors.primary[500]} />
                </TouchableOpacity>
              </View>
            )}
            {!nextTrip && (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); onViewTrips(); }}
                style={{ paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.primary[500] }}>Ver viajes</Text>
                <ChevronRight size={14} color={Colors.primary[500]} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {status === 'PAUSED' && (
          <View style={{
            borderTopWidth: 1,
            borderTopColor: Colors.neutral[100],
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: '#FEF3C7',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            <Info size={14} color='#F59E0B' />
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#92400E', flex: 1 }}>
              Ruta pausada — no genera viajes nuevos
            </Text>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); onViewTrips(); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400E' }}>Ver viajes</Text>
              <ChevronRight size={14} color='#92400E' />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
