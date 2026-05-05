import React, { useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  icon: React.ReactNode;
  label: string;
  /** Uncontrolled initial value (ignored when `value` is provided). */
  defaultValue?: boolean;
  /** Controlled value. When provided the component delegates state to the parent. */
  value?: boolean;
  onToggle?: (value: boolean) => void;
  disabled?: boolean;
}

export const SettingToggle = React.memo(function SettingToggle({ icon, label, defaultValue = false, value, onToggle, disabled = false }: Props) {
  const [internalEnabled, setInternalEnabled] = useState(defaultValue);
  const controlled = value !== undefined;
  const enabled = controlled ? value : internalEnabled;

  return (
    <View className="flex-row items-center py-3">
      <View className="w-10 h-10 rounded-xl bg-neutral-50 items-center justify-center mr-3">
        {icon}
      </View>
      <Text className={`text-base flex-1 ${disabled ? 'text-neutral-400' : 'text-neutral-800'}`}>{label}</Text>
      <Switch
        value={enabled}
        onValueChange={(v) => {
          if (!controlled) setInternalEnabled(v);
          onToggle?.(v);
        }}
        disabled={disabled}
        trackColor={{ false: Colors.neutral[200], true: Colors.primary[400] }}
        thumbColor={enabled ? Colors.primary[600] : Colors.neutral[50]}
      />
    </View>
  );
});
