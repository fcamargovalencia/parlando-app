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

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    SUSPENDED: 'bg-yellow-100 text-yellow-800',
    BANNED: 'bg-red-100 text-red-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    VERIFIED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    EXPIRED: 'bg-gray-100 text-gray-800',
    PENDING_VERIFICATION: 'bg-blue-100 text-blue-800',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-800';
}
