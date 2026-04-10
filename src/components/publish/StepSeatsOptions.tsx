import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Users, DollarSign, Luggage, GraduationCap } from 'lucide-react-native';
import { Input, Card, Toggle } from '@/components/ui';
import { Colors } from '@/constants/colors';
import type { PublishAction } from '@/hooks/usePublishForm';
import type { TripType } from '@/types/api';

interface Props {
  availableSeats: string;
  pricePerSeat: string;
  allowsLuggage: boolean;
  studentsOnly: boolean;
  tripType: TripType;
  dispatch: React.Dispatch<PublishAction>;
}

export function StepSeatsOptions({
  availableSeats,
  pricePerSeat,
  allowsLuggage,
  studentsOnly,
  tripType,
  dispatch,
}: Props) {
  return (
    <>
      <View className="flex-row gap-3 mb-5">
        <View className="flex-1">
          <Input
            label="Asientos disponibles"
            placeholder="3"
            keyboardType="number-pad"
            value={availableSeats}
            onChangeText={(v) =>
              dispatch({ type: 'SET_SEATS', payload: v.replace(/\D/g, '') })
            }
            leftIcon={<Users size={18} color={Colors.neutral[400]} />}
          />
        </View>
        <View className="flex-1">
          <Input
            label="Precio / asiento (COP)"
            placeholder="50000"
            keyboardType="number-pad"
            value={pricePerSeat}
            onChangeText={(v) =>
              dispatch({ type: 'SET_PRICE', payload: v.replace(/\D/g, '') })
            }
            leftIcon={<DollarSign size={18} color={Colors.neutral[400]} />}
          />
        </View>
      </View>

      <Card className="mb-2">
        <TouchableOpacity
          className="flex-row items-center justify-between py-1"
          onPress={() => dispatch({ type: 'TOGGLE_LUGGAGE' })}
        >
          <View className="flex-row items-center">
            <Luggage size={20} color={Colors.neutral[600]} />
            <Text className="text-base text-neutral-800 ml-3">Permite equipaje</Text>
          </View>
          <Toggle
            value={allowsLuggage}
            onPress={() => dispatch({ type: 'TOGGLE_LUGGAGE' })}
          />
        </TouchableOpacity>

        <View className="h-px bg-neutral-100 my-3" />

        {tripType === 'ROUTINE' ? (
          <TouchableOpacity
            className="flex-row items-center justify-between py-1"
            onPress={() => dispatch({ type: 'TOGGLE_STUDENTS' })}
          >
            <View className="flex-row items-center">
              <GraduationCap size={20} color={Colors.neutral[600]} />
              <Text className="text-base text-neutral-800 ml-3">Solo estudiantes</Text>
            </View>
            <Toggle
              value={studentsOnly}
              onPress={() => dispatch({ type: 'TOGGLE_STUDENTS' })}
            />
          </TouchableOpacity>
        ) : (
          <View className="py-1">
            <Text className="text-xs text-neutral-500">
              Para viajes interurbanos no se aplica restricción de solo estudiantes.
            </Text>
          </View>
        )}
      </Card>
    </>
  );
}
