// ── Re-exports from domain modules ──
// Import directly from '@/lib/geo' or '@/lib/format' for new code.
export {
  distanceKm,
  routeTotalKm,
  normalizePlace,
  simplifyPolyline,
  compactPolyline,
} from './geo';

export {
  formatDate,
  formatDateTime,
  formatRelative,
  formatDeparture,
  formatDuration,
  formatCurrency,
  getInitials,
  truncate,
  getVerificationLevelLabel,
  getDocumentTypeLabel,
  getTripTypeLabel,
  getStatusColor,
} from './format';

// ── Error helpers ──

export function extractApiError(err: unknown, fallback: string): string {
  const e = err as Record<string, any>;
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

// ── Date helpers ──

/**
 * Returns an ISO-8601 string preserving the local UTC offset so the backend
 * can interpret the time in the user's timezone (e.g. "2025-04-02T10:00:00-05:00").
 */
export function toLocalISOString(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - offsetMs);
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0');
  const mm = String(Math.abs(offsetMin) % 60).padStart(2, '0');
  return local.toISOString().slice(0, 19) + `${sign}${hh}:${mm}`;
}
