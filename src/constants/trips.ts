import type { TripStatus, TripType, BookingStatus } from '@/types/api';

// ── Trip status badge config ──

export const TRIP_STATUS_BADGE: Record<
  TripStatus,
  { label: string; variant: 'success' | 'warning' | 'info' | 'error' | 'neutral'; }
> = {
  DRAFT: { label: 'Borrador', variant: 'neutral' },
  PUBLISHED: { label: 'Publicado', variant: 'success' },
  IN_PROGRESS: { label: 'En curso', variant: 'info' },
  COMPLETED: { label: 'Completado', variant: 'success' },
  CANCELLED: { label: 'Cancelado', variant: 'error' },
};

// ── Booking status badge config ──

export const BOOKING_STATUS_BADGE: Record<
  BookingStatus,
  { label: string; variant: 'success' | 'warning' | 'info' | 'error' | 'neutral'; }
> = {
  PENDING: { label: 'Pendiente', variant: 'warning' },
  ACCEPTED: { label: 'Aceptado', variant: 'success' },
  REJECTED: { label: 'Rechazado', variant: 'error' },
  BOARDED: { label: 'Abordo', variant: 'info' },
  COMPLETED: { label: 'Completado', variant: 'success' },
  CANCELLED: { label: 'Cancelado', variant: 'neutral' },
  NO_SHOW: { label: 'No asistió', variant: 'error' },
};

// ── Trip type options (for selectors) ──

export const TRIP_TYPE_OPTIONS: { type: TripType; label: string; subtitle: string; }[] = [
  { type: 'INTERCITY', label: 'Interurbano', subtitle: 'Ciudad a ciudad' },
  { type: 'URBAN', label: 'Urbano', subtitle: 'Dentro de tu ciudad' },
  { type: 'ROUTINE', label: 'Rutinario', subtitle: 'Universidad / Empresa' },
];
