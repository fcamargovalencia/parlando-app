import React from 'react';
import { View, Alert } from 'react-native';
import { Edit3, Trash2 } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { Colors } from '@/constants/colors';

interface Props {
  deleting: boolean;
  onDelete: () => void;
}

export function VehicleActions({ deleting, onDelete }: Props) {
  return (
    <View className="px-6 gap-3">
      <Button
        variant="outline"
        onPress={() =>
          Alert.alert('Próximamente', 'La edición de vehículos estará disponible pronto.')
        }
        size="lg"
        icon={<Edit3 size={18} color={Colors.primary[600]} />}
        className="w-full"
      >
        Editar vehículo
      </Button>
      <Button
        variant="danger"
        onPress={onDelete}
        loading={deleting}
        size="lg"
        icon={<Trash2 size={18} color="white" />}
        className="w-full"
      >
        Eliminar vehículo
      </Button>
    </View>
  );
}
