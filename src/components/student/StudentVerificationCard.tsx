import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/constants/colors';
import { formatDate } from '@/lib/utils';
import type { StudentVerificationResponse, StudentVerificationStatus } from '@/types/api';

interface StatusConfig {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'neutral';
  Icon: React.ComponentType<{ size: number; color: string; }>;
  iconColor: string;
}

const STATUS_CONFIG: Record<StudentVerificationStatus, StatusConfig> = {
  PENDING: {
    label: 'En revisión',
    variant: 'warning',
    Icon: Clock,
    iconColor: Colors.semantic.warning,
  },
  APPROVED: {
    label: 'Aprobado',
    variant: 'success',
    Icon: CheckCircle2,
    iconColor: Colors.semantic.success,
  },
  REJECTED: {
    label: 'Rechazado',
    variant: 'error',
    Icon: XCircle,
    iconColor: Colors.semantic.error,
  },
  EXPIRED: {
    label: 'Expirado',
    variant: 'neutral',
    Icon: AlertTriangle,
    iconColor: Colors.neutral[500],
  },
};

export interface StudentVerificationCardProps {
  verification: StudentVerificationResponse;
  onRenew?: () => void;
  onRetry?: () => void;
}

export function StudentVerificationCard({
  verification,
  onRenew,
  onRetry,
}: StudentVerificationCardProps) {
  const config = STATUS_CONFIG[verification.status] ?? {
    label: verification.status,
    variant: 'neutral' as const,
    Icon: GraduationCap,
    iconColor: Colors.neutral[500],
  };
  const { Icon, iconColor } = config;

  const universityName = verification.universityName;

  return (
    <Card className="mb-3">
      <View className="flex-row items-start">
        {/* Icon */}
        <View className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center mr-3 mt-0.5">
          <GraduationCap size={20} color={Colors.primary[600]} />
        </View>

        {/* Content */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-neutral-900 flex-1 mr-2" numberOfLines={1}>
              {universityName}
            </Text>
            <Badge label={config.label} variant={config.variant} />
          </View>

          <Text className="text-sm text-neutral-500 mt-0.5">{verification.universityEmail}</Text>

          <Text className="text-xs text-neutral-400 mt-1">
            Enviado: {formatDate(verification.createdAt)}
          </Text>

          {/* Status-specific details */}
          {verification.status === 'APPROVED' && verification.expiresAt && (
            <View className="mt-2 flex-row items-center gap-1">
              <Icon size={12} color={iconColor} />
              <Text className="text-xs text-green-700">
                Válido hasta {formatDate(verification.expiresAt)}
              </Text>
            </View>
          )}

          {verification.status === 'EXPIRED' && (
            <View className="mt-2">
              {verification.expiresAt && (
                <View className="flex-row items-center gap-1 mb-1.5">
                  <Icon size={12} color={iconColor} />
                  <Text className="text-xs text-neutral-500">
                    Venció el {formatDate(verification.expiresAt)}
                  </Text>
                </View>
              )}
              {onRenew && (
                <TouchableOpacity onPress={onRenew} activeOpacity={0.7} className="self-start">
                  <Text className="text-xs font-bold text-primary-600 underline">
                    Renovar verificación →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {verification.status === 'REJECTED' && (
            <View className="mt-2">
              {verification.reviewerNote && (
                <Text className="text-xs text-red-600 leading-4 mb-1.5">
                  Motivo: {verification.reviewerNote}
                </Text>
              )}
              {onRetry && (
                <TouchableOpacity onPress={onRetry} activeOpacity={0.7} className="self-start">
                  <Text className="text-xs font-bold text-red-600 underline">
                    Intentar de nuevo →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {verification.status === 'PENDING' && (
            <View className="mt-2 flex-row items-center gap-1">
              <Icon size={12} color={iconColor} />
              <Text className="text-xs text-yellow-700">
                Tu solicitud está siendo revisada
              </Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}
