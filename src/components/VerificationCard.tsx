import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FileCheck, Clock, XCircle, AlertCircle, ScanFace } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/constants/colors';
import { getDocumentTypeLabel, formatDate } from '@/lib/utils';
import type { IdentityVerificationResponse } from '@/types/api';

interface VerificationCardProps {
  verification: IdentityVerificationResponse;
  onPress?: () => void;
}

function getStatusInfo(status: string) {
  const map: Record<
    string,
    { label: string; variant: 'success' | 'warning' | 'error' | 'neutral'; icon: React.ReactNode; }
  > = {
    PENDING: {
      label: 'Pendiente',
      variant: 'warning',
      icon: <Clock size={18} color={Colors.semantic.warning} />,
    },
    VERIFIED: {
      label: 'Verificado',
      variant: 'success',
      icon: <FileCheck size={18} color={Colors.semantic.success} />,
    },
    REJECTED: {
      label: 'Rechazado',
      variant: 'error',
      icon: <XCircle size={18} color={Colors.semantic.error} />,
    },
    EXPIRED: {
      label: 'Expirado',
      variant: 'neutral',
      icon: <AlertCircle size={18} color={Colors.neutral[500]} />,
    },
  };
  return map[status] ?? { label: status, variant: 'neutral' as const, icon: null };
}

export function VerificationCard({ verification, onPress }: VerificationCardProps) {
  const status = getStatusInfo(verification.status);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card className="mb-3">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center mr-3">
            {status.icon}
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-neutral-900">
              {getDocumentTypeLabel(verification.documentType)}
            </Text>
            <Text className="text-sm text-neutral-500 mt-0.5">
              Enviado: {formatDate(verification.createdAt)}
            </Text>
            {verification.faceMatchConfirmed != null && verification.selfieUrl && (
              <View className="flex-row items-center mt-1 gap-1">
                <ScanFace
                  size={13}
                  color={
                    verification.faceMatchConfirmed
                      ? Colors.semantic.success
                      : Colors.semantic.error
                  }
                />
                <Text
                  className="text-xs font-medium"
                  style={{
                    color: verification.faceMatchConfirmed
                      ? Colors.semantic.success
                      : Colors.semantic.error,
                  }}
                >
                  {verification.faceMatchConfirmed ? 'Rostro coincide' : 'Rostro no coincide'}
                </Text>
              </View>
            )}
            {verification.rejectionReason && (
              <Text className="text-xs text-red-500 mt-1">
                {verification.rejectionReason}
              </Text>
            )}
          </View>
          <Badge label={status.label} variant={status.variant} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}
