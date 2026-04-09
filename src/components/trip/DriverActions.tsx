import React from 'react';
import { View } from 'react-native';
import { ChevronRight, Play, CheckCircle, XCircle } from 'lucide-react-native';
import { Button } from '@/components/ui';
import type { TripStatus } from '@/types/api';

interface DriverActionsProps {
  status: TripStatus;
  actionLoading: string | null;
  onPublish: () => void;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

export function DriverActions({
  status,
  actionLoading,
  onPublish,
  onStart,
  onComplete,
  onCancel,
}: DriverActionsProps) {
  return (
    <View className="gap-2">
      {status === 'DRAFT' && (
        <Button
          onPress={onPublish}
          loading={actionLoading === 'Publicar'}
          icon={<ChevronRight size={18} color="white" />}
        >
          Publicar viaje
        </Button>
      )}
      {status === 'PUBLISHED' && (
        <Button
          onPress={onStart}
          loading={actionLoading === 'Iniciar viaje'}
          icon={<Play size={16} color="white" />}
        >
          Iniciar viaje
        </Button>
      )}
      {status === 'IN_PROGRESS' && (
        <Button
          onPress={onComplete}
          loading={actionLoading === 'Completar'}
          icon={<CheckCircle size={16} color="white" />}
        >
          Completar viaje
        </Button>
      )}
      {(status === 'DRAFT' || status === 'PUBLISHED') && (
        <Button
          variant="danger"
          onPress={onCancel}
          loading={actionLoading === 'Cancelar viaje'}
          icon={<XCircle size={16} color="white" />}
        >
          Cancelar viaje
        </Button>
      )}
    </View>
  );
}
