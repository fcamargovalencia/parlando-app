import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import type { RoutineBookingResponse, RoutineBookingStatus } from '@/types/api';

// ── Helpers ──

const DAY_ABBR = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// Build list of next N dates starting from today
function buildDateRange(days: number): Date[] {
  const result: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    result.push(d);
  }
  return result;
}

// ── Status visual config ──

interface StatusConfig {
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  iconColor: string;
}

const BOOKING_STATUS_CONFIG: Record<RoutineBookingStatus, StatusConfig> = {
  ACCEPTED: {
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    borderClass: 'border-green-200',
    icon: CheckCircle2,
    iconColor: Colors.semantic.success,
  },
  COMPLETED: {
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    borderClass: 'border-green-200',
    icon: CheckCircle2,
    iconColor: Colors.semantic.success,
  },
  CANCELLED: {
    bgClass: 'bg-neutral-50',
    textClass: 'text-neutral-400',
    borderClass: 'border-neutral-200',
    icon: XCircle,
    iconColor: Colors.neutral[400],
  },
  NO_SHOW: {
    bgClass: 'bg-red-50',
    textClass: 'text-red-600',
    borderClass: 'border-red-200',
    icon: AlertCircle,
    iconColor: Colors.semantic.error,
  },
};

const STATUS_LABEL: Record<RoutineBookingStatus, string> = {
  ACCEPTED: 'Confirmado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'No se presentó',
};

// ── Props ──

export interface RoutineCalendarViewProps {
  bookings: RoutineBookingResponse[];
  daysAhead?: number;
  onPressBooking?: (booking: RoutineBookingResponse) => void;
}

// ── Component ──

export function RoutineCalendarView({
  bookings,
  daysAhead = 14,
  onPressBooking,
}: RoutineCalendarViewProps) {
  const dateRange = useMemo(() => buildDateRange(daysAhead), [daysAhead]);

  // Map from "YYYY-MM-DD" → booking
  const bookingByDate = useMemo(() => {
    const map: Record<string, RoutineBookingResponse> = {};
    for (const b of bookings) {
      map[b.occurrenceDate] = b;
    }
    return map;
  }, [bookings]);

  // Group dates by week (rows of 7)
  const weeks = useMemo(() => {
    const rows: Date[][] = [];
    let current: Date[] = [];
    for (const d of dateRange) {
      current.push(d);
      if (current.length === 7) {
        rows.push(current);
        current = [];
      }
    }
    if (current.length > 0) rows.push(current);
    return rows;
  }, [dateRange]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  return (
    <View className="gap-2">
      {/* Day headers */}
      <View className="flex-row">
        {DAY_ABBR.map((d) => (
          <View key={d} className="flex-1 items-center">
            <Text className="text-xs font-medium text-neutral-400">{d}</Text>
          </View>
        ))}
      </View>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <View key={wi} className="flex-row gap-1">
          {week.map((day, di) => {
            const isoDate = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
            const booking = bookingByDate[isoDate];
            const isToday = isSameDay(day, today);

            if (!booking) {
              // No booking for this day
              return (
                <View
                  key={di}
                  className="flex-1 items-center justify-center py-2 rounded-lg bg-neutral-50 border border-neutral-100"
                >
                  <Text className={`text-xs ${isToday ? 'font-bold text-primary-500' : 'text-neutral-300'}`}>
                    {day.getDate()}
                  </Text>
                </View>
              );
            }

            const config = BOOKING_STATUS_CONFIG[booking.status];
            const Icon = config.icon;

            return (
              <TouchableOpacity
                key={di}
                onPress={() => onPressBooking?.(booking)}
                className={`flex-1 items-center justify-center py-2 rounded-lg border ${config.bgClass} ${config.borderClass}`}
                activeOpacity={0.7}
              >
                <Text className={`text-xs font-semibold ${config.textClass} ${isToday ? 'font-bold' : ''}`}>
                  {day.getDate()}
                </Text>
                <Icon size={10} color={config.iconColor} />
                <Text className={`text-[9px] ${config.textClass} mt-0.5`}>
                  {booking.estimatedPickupTime}
                </Text>
              </TouchableOpacity>
            );
          })}
          {/* Fill remaining cells in last week */}
          {week.length < 7 &&
            Array.from({ length: 7 - week.length }).map((_, i) => (
              <View key={`empty-${i}`} className="flex-1" />
            ))}
        </View>
      ))}

      {/* Legend */}
      <View className="flex-row flex-wrap gap-x-4 gap-y-1 mt-1">
        {(Object.keys(STATUS_LABEL) as RoutineBookingStatus[]).map((s) => {
          const cfg = BOOKING_STATUS_CONFIG[s];
          const Ico = cfg.icon;
          return (
            <View key={s} className="flex-row items-center gap-1">
              <Ico size={11} color={cfg.iconColor} />
              <Text className="text-xs text-neutral-500">{STATUS_LABEL[s]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
