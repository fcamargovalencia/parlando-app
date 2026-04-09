import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { TripTypeIcon } from '@/components/TripTypeIcon';
import { Colors } from '@/constants/colors';
import { TRIP_TYPE_OPTIONS } from '@/constants/trips';
import type { TripType } from '@/types/api';

interface TripTypeSheetProps {
  visible: boolean;
  tripType: TripType;
  onSelect: (type: TripType) => void;
  onClose: () => void;
}

export function TripTypeSheet({ visible, tripType, onSelect, onClose }: TripTypeSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        className="bg-white rounded-t-3xl px-5 pt-4 pb-8"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 16,
        }}
      >
        <View className="w-10 h-1 rounded-full bg-neutral-200 self-center mb-4" />
        <Text className="text-base font-bold text-neutral-900 mb-4">Tipo de viaje</Text>

        {TRIP_TYPE_OPTIONS.map((t) => {
          const selected = tripType === t.type;
          return (
            <TouchableOpacity
              key={t.type}
              onPress={() => { onSelect(t.type); onClose(); }}
              activeOpacity={0.7}
              className="flex-row items-center py-4 border-b border-neutral-100"
            >
              <View
                className="w-11 h-11 rounded-2xl items-center justify-center mr-4"
                style={{ backgroundColor: selected ? Colors.primary[50] : Colors.neutral[100] }}
              >
                <TripTypeIcon type={t.type} size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-neutral-900">{t.label}</Text>
                <Text className="text-xs text-neutral-400 mt-0.5">{t.subtitle}</Text>
              </View>
              {selected && (
                <View
                  className="w-5 h-5 rounded-full items-center justify-center"
                  style={{ backgroundColor: Colors.primary[500] }}
                >
                  <View className="w-2 h-2 rounded-full bg-white" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </Modal>
  );
}
