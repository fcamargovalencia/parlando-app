import React from 'react';
import { View, Text } from 'react-native';
import {
  CheckCircle2,
  Clock,
  PauseCircle,
  XCircle,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import type { SubscriptionStatus } from '@/types/api';

interface SubscriptionStatusConfig {
  label: string;
  description: string;
  bgClass: string;
  textClass: string;
  iconColor: string;
  Icon: React.ComponentType<{ size: number; color: string; }>;
}

const STATUS_CONFIG: Record<SubscriptionStatus, SubscriptionStatusConfig> = {
  PENDING: {
    label: 'Pendiente',
    description: 'Esperando confirmación del conductor',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800',
    iconColor: Colors.semantic.warning,
    Icon: Clock,
  },
  ACCEPTED: {
    label: 'Activa',
    description: 'Suscripción activa',
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
    iconColor: Colors.semantic.success,
    Icon: CheckCircle2,
  },
  PAUSED: {
    label: 'Pausada',
    description: 'Suscripción pausada',
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-800',
    iconColor: '#F97316',
    Icon: PauseCircle,
  },
  COMPLETED: {
    label: 'Completada',
    description: 'Suscripción finalizada',
    bgClass: 'bg-neutral-100',
    textClass: 'text-neutral-600',
    iconColor: Colors.neutral[500],
    Icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Cancelada',
    description: 'Suscripción cancelada',
    bgClass: 'bg-neutral-100',
    textClass: 'text-neutral-600',
    iconColor: Colors.neutral[500],
    Icon: XCircle,
  },
};

interface SubscriptionStatusBadgeProps {
  status: SubscriptionStatus;
  /** When true, also shows the description text below the badge */
  showDescription?: boolean;
}

export function SubscriptionStatusBadge({
  status,
  showDescription = false,
}: SubscriptionStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const { Icon } = config;

  return (
    <View className="items-start gap-1">
      <View className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${config.bgClass}`}>
        <Icon size={14} color={config.iconColor} />
        <Text className={`text-sm font-semibold ${config.textClass}`}>{config.label}</Text>
      </View>
      {showDescription && (
        <Text className="text-xs text-neutral-500 px-1">{config.description}</Text>
      )}
    </View>
  );
}
