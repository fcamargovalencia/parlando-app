import type { RecurrenceDay, RoutineTripStatus } from '@/types/api';

export const DAY_SHORT: Record<RecurrenceDay, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mié', THU: 'Jue',
  FRI: 'Vie', SAT: 'Sáb', SUN: 'Dom',
};

export const STATUS_LABELS: Record<RoutineTripStatus, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activa',
  PAUSED: 'Pausada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

export const STATUS_COLORS: Record<RoutineTripStatus, string> = {
  DRAFT: 'bg-neutral-200',
  ACTIVE: 'bg-green-100',
  PAUSED: 'bg-yellow-100',
  COMPLETED: 'bg-blue-100',
  CANCELLED: 'bg-red-100',
};

export const STATUS_TEXT_COLORS: Record<RoutineTripStatus, string> = {
  DRAFT: 'text-neutral-600',
  ACTIVE: 'text-green-700',
  PAUSED: 'text-yellow-700',
  COMPLETED: 'text-blue-700',
  CANCELLED: 'text-red-700',
};

export function formatDays(days: RecurrenceDay[] = []): string {
  if (!days.length) return '—';
  return days.map((d) => DAY_SHORT[d]).join(' · ');
}

export function formatCOP(amount: number): string {
  return `$${amount.toLocaleString('es-CO')} COP`;
}

export function metersLabel(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

export function secondsLabel(s: number): string {
  return `${Math.round(s / 60)} min`;
}
