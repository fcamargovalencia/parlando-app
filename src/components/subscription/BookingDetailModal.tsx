import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal } from 'react-native';
import { Clock, CheckCircle2, XCircle, AlertCircle, UserCheck, Timer } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { Colors } from '@/constants/colors';
import type { RoutineBookingResponse, RoutineBookingStatus } from '@/types/api';

const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Confirmado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  REJECTED: 'Rechazado',
  BOARDED: 'Abordado',
  NO_SHOW: 'No se presentó',
};

const STATUS_ICON: Record<RoutineBookingStatus, { icon: React.ComponentType<{ size: number; color: string; }>; color: string; bg: string; }> = {
  PENDING: { icon: Clock, color: Colors.semantic.warning, bg: 'bg-yellow-50' },
  ACCEPTED: { icon: CheckCircle2, color: Colors.semantic.success, bg: 'bg-green-50' },
  REJECTED: { icon: XCircle, color: Colors.neutral[400], bg: 'bg-neutral-100' },
  BOARDED: { icon: UserCheck, color: Colors.primary[600], bg: 'bg-primary-50' },
  CANCELLED: { icon: XCircle, color: Colors.neutral[400], bg: 'bg-neutral-100' },
  NO_SHOW: { icon: AlertCircle, color: Colors.semantic.error, bg: 'bg-red-50' },
};

function formatDate(iso: string): string {
  try {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
}

function parseISO(s: string): Date {
  const [y, m, day] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day);
}

function useCountdown(targetMs: number | null): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (targetMs === null) { setLabel(null); return; }
    function tick() {
      const diff = targetMs! - Date.now();
      if (diff <= 0) { setLabel('En curso'); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      if (h > 0) setLabel(`${h}h ${String(m).padStart(2, '0')}min`);
      else if (m > 0) setLabel(`${m}min ${String(s).padStart(2, '0')}s`);
      else setLabel(`${s}s`);
    }
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [targetMs]);

  return label;
}

export interface BookingDetailModalProps {
  visible: boolean;
  selectedBooking: RoutineBookingResponse | null;
  /** HH:mm departure time from the routine trip, used to compute the countdown */
  departureTime?: string;
  bottomInset: number;
  onClose: () => void;
}

export function BookingDetailModal({
  visible, selectedBooking, departureTime, bottomInset, onClose,
}: BookingDetailModalProps) {
  const occurrenceDate = selectedBooking?.occurrenceDate ?? '';
  const status = selectedBooking?.status;
  const isToday = !!occurrenceDate && occurrenceDate.slice(0, 10) === new Date().toISOString().slice(0, 10);

  const departureMs = useMemo(() => {
    if (!isToday || !departureTime || !occurrenceDate) return null;
    const [hh, mm] = departureTime.split(':').map(Number);
    const d = parseISO(occurrenceDate);
    d.setHours(hh, mm, 0, 0);
    return d.getTime();
  }, [isToday, departureTime, occurrenceDate]);

  const countdown = useCountdown(departureMs);

  if (!selectedBooking) return null;

  const statusCfg = STATUS_ICON[selectedBooking.status];
  const StatusIcon = statusCfg?.icon ?? Clock;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: Colors.overlay }}>
        <View className="bg-white rounded-t-3xl px-6 pt-5" style={{ paddingBottom: bottomInset + 24 }}>
          <View className="w-10 h-1 rounded-full bg-neutral-300 self-center mb-5" />

          {/* Header */}
          <Text className="text-lg font-bold text-neutral-900 mb-1 capitalize">
            {formatDate(selectedBooking.occurrenceDate)}
          </Text>

          {/* Status badge */}
          <View className={`self-start flex-row items-center gap-1.5 px-3 py-1.5 rounded-full mb-5 ${statusCfg?.bg ?? 'bg-neutral-100'}`}>
            <StatusIcon size={13} color={statusCfg?.color ?? Colors.neutral[500]} />
            <Text className="text-xs font-semibold" style={{ color: statusCfg?.color ?? Colors.neutral[500] }}>
              {BOOKING_STATUS_LABEL[selectedBooking.status] ?? selectedBooking.status}
            </Text>
          </View>

          {/* Countdown — booking is today, ACCEPTED, departure not yet passed */}
          {isToday && countdown && selectedBooking.status === 'ACCEPTED' && (
            <View className="flex-row items-center gap-3 bg-primary-50 border border-primary-100 rounded-2xl px-4 py-3 mb-5">
              <Timer size={18} color={Colors.primary[600]} />
              <View>
                <Text className="text-xs text-primary-500 font-medium">Tiempo para el viaje</Text>
                <Text className="text-xl font-bold text-primary-700">{countdown}</Text>
              </View>
            </View>
          )}

          {/* boardedAt timestamp */}
          {selectedBooking.status === 'BOARDED' && selectedBooking.boardedAt && (
            <View className="flex-row items-center gap-2 bg-neutral-50 rounded-xl px-4 py-3 mb-5">
              <UserCheck size={14} color={Colors.primary[600]} />
              <Text className="text-sm text-neutral-600">
                Abordó a las{' '}
                <Text className="font-semibold text-neutral-800">
                  {new Date(selectedBooking.boardedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Text>
            </View>
          )}

          <Button variant="outline" onPress={onClose}>
            Cerrar
          </Button>
        </View>
      </View>
    </Modal>
  );
}
