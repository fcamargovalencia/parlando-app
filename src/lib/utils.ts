import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

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
