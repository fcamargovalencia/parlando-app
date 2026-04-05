import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

// ── Date formatting ──

export function formatDate(date: string | Date): string {
  return dayjs(date).format('D MMM YYYY');
}

export function formatDateTime(date: string | Date): string {
  return dayjs(date).format('D MMM YYYY, HH:mm');
}

export function formatRelative(date: string | Date): string {
  const diff = dayjs().diff(dayjs(date), 'minute');
  if (diff < 1) return 'ahora';
  if (diff < 60) return `hace ${diff}m`;
  if (diff < 1440) return `hace ${Math.floor(diff / 60)}h`;
  if (diff < 10080) return `hace ${Math.floor(diff / 1440)}d`;
  return dayjs(date).format('D MMM');
}

export function formatDeparture(iso: string): string {
  const d = dayjs(iso);
  const today = dayjs();
  if (d.isSame(today, 'day')) return `Hoy, ${d.format('h:mm A')}`;
  if (d.isSame(today.add(1, 'day'), 'day')) return `Mañana, ${d.format('h:mm A')}`;
  return d.format('D MMM, h:mm A');
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m} min`;
  return `${h} h ${m} min`;
}

export function formatCurrency(amount: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function getVerificationLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    NONE: 'Sin verificar',
    BASIC: 'Básico',
    IDENTITY: 'Identidad',
    FULL: 'Completo',
    PREMIUM: 'Premium',
  };
  return labels[level] ?? level;
}

export function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    CEDULA_CIUDADANIA: 'Cédula de Ciudadanía',
    CEDULA_EXTRANJERIA: 'Cédula de Extranjería',
    PASAPORTE: 'Pasaporte',
    LICENCIA_CONDUCCION: 'Licencia de Conducción',
    CARNET_UNIVERSITARIO: 'Carné Universitario',
    SOAT: 'SOAT',
    TECNICOMECANICA: 'Revisión Técnico-Mecánica',
    TARJETA_PROPIEDAD: 'Tarjeta de Propiedad',
  };
  return labels[type] ?? type;
}

export function getTripTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    INTERCITY: 'Interurbano',
    URBAN: 'Urbano',
    ROUTINE: 'Rutinario',
  };
  return labels[type] ?? type;
}

export function getStatusColor(status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    ACTIVE: 'success',
    INACTIVE: 'neutral',
    SUSPENDED: 'warning',
    BANNED: 'error',
    PENDING: 'warning',
    VERIFIED: 'success',
    REJECTED: 'error',
    EXPIRED: 'neutral',
    PENDING_VERIFICATION: 'info',
  };
  return variants[status] ?? 'neutral';
}

// ── Geo helpers ──

export function distanceKm(
  a: { latitude: number; longitude: number; },
  b: { latitude: number; longitude: number; },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

export function normalizePlace(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(',')[0]
    .trim();
}

// ── Polyline simplification (Douglas-Peucker) ──

type Point = { latitude: number; longitude: number; };

export function simplifyPolyline(points: Point[], tolerance = 0.0005): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPolyline(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPolyline(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

/**
 * Simplifies a polyline to fit within a max point count by
 * progressively increasing tolerance, then rounds coordinates
 * to reduce JSON payload size (~5 decimals ≈ 1.1m precision).
 */
export function compactPolyline(points: Point[], maxPoints = 300): Point[] {
  if (points.length <= 2) return points.map(roundPoint);

  let tolerance = 0.0003;
  let result = simplifyPolyline(points, tolerance);

  while (result.length > maxPoints && tolerance < 0.01) {
    tolerance *= 1.5;
    result = simplifyPolyline(points, tolerance);
  }

  return result.slice(0, maxPoints).map(roundPoint);
}

function roundPoint(p: Point): Point {
  return {
    latitude: Math.round(p.latitude * 1e5) / 1e5,
    longitude: Math.round(p.longitude * 1e5) / 1e5,
  };
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.longitude - a.longitude;
  const dy = b.latitude - a.latitude;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.sqrt(
      (p.longitude - a.longitude) ** 2 + (p.latitude - a.latitude) ** 2,
    );
  }
  return (
    Math.abs(
      dy * p.longitude -
      dx * p.latitude +
      b.longitude * a.latitude -
      b.latitude * a.longitude,
    ) / Math.sqrt(lenSq)
  );
}
