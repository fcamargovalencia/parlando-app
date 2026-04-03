import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export interface FilterTab<K extends string> {
  key: K;
  label: string;
  count?: number;
}

interface FilterTabsProps<K extends string> {
  tabs: FilterTab<K>[];
  active: K;
  onSelect: (key: K) => void;
}

export function FilterTabs<K extends string>({ tabs, active, onSelect }: FilterTabsProps<K>) {
  return (
    <View className="flex-row px-6 mt-3 mb-4 gap-2">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            className={`flex-row items-center px-4 py-2 rounded-full ${isActive ? 'bg-primary-500' : 'bg-neutral-100'}`}
          >
            <Text
              className={`text-sm font-medium ${isActive ? 'text-white' : 'text-neutral-600'}`}
            >
              {tab.label}
            </Text>
            {(tab.count ?? 0) > 0 && (
              <View
                className={`ml-1.5 w-5 h-5 rounded-full items-center justify-center ${isActive ? 'bg-white/30' : 'bg-neutral-200'}`}
              >
                <Text
                  className={`text-xs font-bold ${isActive ? 'text-white' : 'text-neutral-600'}`}
                >
                  {(tab.count ?? 0) > 9 ? '9+' : tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
