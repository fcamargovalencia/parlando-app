import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CheckCircle2, XCircle, AlertCircle, Clock, UserCheck } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import type { RoutineBookingResponse, RoutineBookingStatus } from '@/types/api';

// ── Helpers ──

const DAY_ABBR = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function parseLocalDate(iso: string): Date {
  // Take only the date portion in case a full ISO timestamp is passed
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Build a list of N calendar dates starting from `fromDate` (defaults to today).
 * The list is expanded backwards to the nearest Sunday so that the first row
 * is a complete week — this aligns day headers with actual weekdays.
 */
function buildDateRange(days: number, fromDate?: string): { dates: Date[]; leadingBlanks: number; } {
  const start = fromDate ? parseLocalDate(fromDate) : new Date();
  start.setHours(0, 0, 0, 0);

  // How many blank cells before the first real day (0 = Sunday … 6 = Saturday)
  // Guard against Invalid Date (e.g. unexpected API format) to avoid Array(NaN) crash.
  const rawDay = start.getDay();
  const leadingBlanks = Number.isFinite(rawDay) ? rawDay : 0;

  const dates: Date[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return { dates, leadingBlanks };
}

// ── Status visual config ──

interface StatusConfig {
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: React.ComponentType<{ size: number; color: string; }>;
  iconColor: string;
}

const BOOKING_STATUS_CONFIG: Record<RoutineBookingStatus, StatusConfig> = {
  PENDING: {
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-700',
    borderClass: 'border-yellow-200',
    icon: Clock,
    iconColor: Colors.semantic.warning,
  },
  ACCEPTED: {
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    borderClass: 'border-green-200',
    icon: CheckCircle2,
    iconColor: Colors.semantic.success,
  },
  REJECTED: {
    bgClass: 'bg-neutral-50',
    textClass: 'text-neutral-400',
    borderClass: 'border-neutral-200',
    icon: XCircle,
    iconColor: Colors.neutral[400],
  },
  BOARDED: {
    bgClass: 'bg-primary-50',
    textClass: 'text-primary-700',
    borderClass: 'border-primary-200',
    icon: UserCheck,
    iconColor: Colors.primary[600],
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
  PENDING: 'Pendiente',
  ACCEPTED: 'Confirmado',
  REJECTED: 'Rechazado',
  BOARDED: 'Abordado',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'No se presentó',
};

// ── Props ──

export interface RoutineCalendarViewProps {
  bookings: RoutineBookingResponse[];
  /** ISO date "YYYY-MM-DD" — calendar starts here. Defaults to today. */
  fromDate?: string;
  daysAhead?: number;
  onPressBooking?: (booking: RoutineBookingResponse) => void;
}

// ── Component ──

export function RoutineCalendarView({
  bookings,
  fromDate,
  daysAhead = 14,
  onPressBooking,
}: RoutineCalendarViewProps) {
  const { dates: dateRange, leadingBlanks } = useMemo(
    () => buildDateRange(daysAhead, fromDate),
    [daysAhead, fromDate],
  );

  // Map from "YYYY-MM-DD" → booking (normalize occurrenceDate to date-only key)
  const bookingByDate = useMemo(() => {
    const map: Record<string, RoutineBookingResponse> = {};
    for (const b of bookings) {
      const key = b.occurrenceDate.slice(0, 10);
      map[key] = b;
    }
    return map;
  }, [bookings]);

  // Check if there's at least one booking visible in the date range
  const hasVisibleBookings = useMemo(
    () => dateRange.some((d) => bookingByDate[toISO(d)] !== undefined),
    [dateRange, bookingByDate],
  );

  // Group dates into calendar rows of 7 (first row may start with blank cells)
  const weeks = useMemo(() => {
    const rows: (Date | null)[][] = [];
    // First row: pad with nulls for days before the start
    let current: (Date | null)[] = Array(leadingBlanks).fill(null);
    for (const d of dateRange) {
      current.push(d);
      if (current.length === 7) {
        rows.push(current);
        current = [];
      }
    }
    if (current.length > 0) rows.push(current);
    return rows;
  }, [dateRange, leadingBlanks]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Month label for the range header
  const rangeLabel = useMemo(() => {
    if (dateRange.length === 0) return '';
    const first = dateRange[0];
    const last = dateRange[dateRange.length - 1];
    const firstLabel = `${MONTH_ABBR[first.getMonth()]} ${first.getFullYear()}`;
    const lastLabel = `${MONTH_ABBR[last.getMonth()]} ${last.getFullYear()}`;
    return firstLabel === lastLabel ? firstLabel : `${firstLabel} – ${lastLabel}`;
  }, [dateRange]);

  return (
    <View className="gap-2">
      {/* Month / range header */}
      <Text className="text-xs font-semibold text-neutral-500 capitalize">{rangeLabel}</Text>

      {/* Day-of-week headers */}
      <View className="flex-row">
        {DAY_ABBR.map((d) => (
          <View key={d} className="flex-1 items-center">
            <Text className="text-xs font-medium text-neutral-400">{d}</Text>
          </View>
        ))}
      </View>

      {/* Empty state */}
      {!hasVisibleBookings && (
        <View className="py-4 items-center">
          <Text className="text-sm text-neutral-400 text-center">
            No hay viajes programados en este período
          </Text>
        </View>
      )}

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <View key={wi} className="flex-row gap-1">
          {week.map((day, di) => {
            // Blank leading cell
            if (day === null) {
              return <View key={`blank-${di}`} className="flex-1" />;
            }

            const isoDate = toISO(day);
            const booking = bookingByDate[isoDate];
            const isToday = isSameDay(day, today);

            if (!booking) {
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
              </TouchableOpacity>
            );
          })}
          {/* Fill trailing cells in last partial row */}
          {week.length < 7 &&
            Array.from({ length: 7 - week.length }).map((_, i) => (
              <View key={`trail-${i}`} className="flex-1" />
            ))}
        </View>
      ))}

      {/* Legend — only show statuses that appear in this booking set */}
      {hasVisibleBookings && (
        <View className="flex-row flex-wrap gap-x-4 gap-y-1 mt-1">
          {(Object.keys(STATUS_LABEL) as RoutineBookingStatus[])
            .filter((s) => bookings.some((b) => b.status === s))
            .map((s) => {
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
      )}
    </View>
  );
}
