import React from 'react';
import { View, Text, Switch } from 'react-native';
import { Bell, Pencil, Plus } from 'lucide-react-native';
import { Card, Button, Input } from '@/components/ui';
import { Colors } from '@/constants/colors';
import type { EmergencyContactFormState } from '@/hooks/useEmergencyContactsScreen';

interface EmergencyContactFormCardProps {
  form: EmergencyContactFormState;
  isEditing: boolean;
  remaining: number;
  canCreate: boolean;
  submitting: boolean;
  error: string | null;
  onChangeName: (value: string) => void;
  onChangePhone: (value: string) => void;
  onChangeRelationship: (value: string) => void;
  onChangeNotifyOnTrip: (value: boolean) => void;
  onSubmit: () => void;
  onCancelEdit: () => void;
}

export function EmergencyContactFormCard({
  form,
  isEditing,
  remaining,
  canCreate,
  submitting,
  error,
  onChangeName,
  onChangePhone,
  onChangeRelationship,
  onChangeNotifyOnTrip,
  onSubmit,
  onCancelEdit,
}: EmergencyContactFormCardProps) {
  return (
    <Card className="mb-4 p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-semibold text-neutral-800">
          {isEditing ? 'Editar contacto' : 'Nuevo contacto'}
        </Text>
        <Text className="text-xs text-neutral-500">Cupos: {remaining}</Text>
      </View>

      <Input
        label="Nombre"
        value={form.name}
        onChangeText={onChangeName}
        placeholder="Ej: Maria Garcia"
        autoCapitalize="words"
        containerClassName="mb-3"
      />

      <Input
        label="Telefono"
        value={form.phone}
        onChangeText={onChangePhone}
        placeholder="Ej: +573001234567"
        keyboardType="phone-pad"
        containerClassName="mb-3"
      />

      <Input
        label="Relacion"
        value={form.relationship}
        onChangeText={onChangeRelationship}
        placeholder="Ej: Madre"
        autoCapitalize="words"
        containerClassName="mb-3"
      />

      <View className="flex-row items-center justify-between mb-4 py-1">
        <View className="flex-row items-center gap-2 flex-1 pr-2">
          <Bell size={16} color={Colors.primary[600]} />
          <Text className="text-sm text-neutral-700">Notificar al iniciar viaje</Text>
        </View>
        <Switch
          value={form.notifyOnTrip}
          onValueChange={onChangeNotifyOnTrip}
          trackColor={{ false: Colors.neutral[200], true: Colors.primary[400] }}
          thumbColor={form.notifyOnTrip ? Colors.primary[600] : Colors.neutral[50]}
        />
      </View>

      {error && <Text className="text-xs text-red-500 mb-3">{error}</Text>}

      <View className="flex-row gap-2">
        <Button
          onPress={onSubmit}
          loading={submitting}
          disabled={!isEditing && !canCreate}
          size="md"
          className="flex-1"
          icon={isEditing ? <Pencil size={16} color="#FFFFFF" /> : <Plus size={16} color="#FFFFFF" />}
        >
          {isEditing ? 'Guardar cambios' : 'Agregar contacto'}
        </Button>

        {isEditing && (
          <Button
            variant="outline"
            onPress={onCancelEdit}
            size="md"
            className="px-4"
          >
            Cancelar
          </Button>
        )}
      </View>

      {!canCreate && !isEditing && (
        <Text className="text-xs text-neutral-500 mt-3">
          Ya alcanzaste el maximo de 5 contactos. Elimina uno para agregar otro.
        </Text>
      )}
    </Card>
  );
}
