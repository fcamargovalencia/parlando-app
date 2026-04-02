import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/colors';

interface Props {
  visible: boolean;
  value: Date;
  mode: 'date' | 'time';
  title: string;
  minimumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

/**
 * Cross-platform date/time picker.
 * - iOS: bottom-sheet Modal with spinner + draft state (Cancel discards changes).
 * - Android: native dialog (no wrapper needed).
 */
export function DatePickerModal({ visible, value, mode, title, minimumDate, onConfirm, onCancel }: Props) {
  // Draft keeps changes while the picker is open; only committed on "Confirmar".
  const [draft, setDraft] = useState(value);

  // Sync draft whenever the modal opens with a new value.
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  if (Platform.OS !== 'ios') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display="default"
        minimumDate={minimumDate}
        onValueChange={(_, date) => {
          if (date) onConfirm(date);
          else onCancel();
        }}
        onDismiss={onCancel}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
        activeOpacity={1}
        onPress={onCancel}
      />

      {/* Sheet */}
      <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <TouchableOpacity onPress={onCancel} hitSlop={8}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.neutral[500] }}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.neutral[900] }}>{title}</Text>
          <TouchableOpacity onPress={() => onConfirm(draft)} hitSlop={8}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.primary[700] }}>Confirmar</Text>
          </TouchableOpacity>
        </View>

        <DateTimePicker
          value={draft}
          mode={mode}
          display="spinner"
          minimumDate={minimumDate}
          themeVariant="light"
          onValueChange={(_, date) => { if (date) setDraft(date); }}
        />
      </View>
    </Modal>
  );
}
