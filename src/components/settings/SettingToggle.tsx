import React, { useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  icon: React.ReactNode;
  label: string;
  defaultValue?: boolean;
  onToggle?: (value: boolean) => void;
}

export const SettingToggle = React.memo(function SettingToggle({ icon, label, defaultValue = false, onToggle }: Props) {
  const [enabled, setEnabled] = useState(defaultValue);

  return (
    <View className="flex-row items-center py-3">
      <View className="w-10 h-10 rounded-xl bg-neutral-50 items-center justify-center mr-3">
        {icon}
      </View>
      <Text className="text-base text-neutral-800 flex-1">{label}</Text>
      <Switch
        value={enabled}
        onValueChange={(v) => {
          setEnabled(v);
          onToggle?.(v);
        }}
        trackColor={{ false: Colors.neutral[200], true: Colors.primary[400] }}
        thumbColor={enabled ? Colors.primary[600] : Colors.neutral[50]}
      />
    </View>
  );
});
