import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '@/constants/colors';

interface RoutePreviewProps {
  originName: string;
  originSubtitle?: string;
  destinationName: string;
  destinationSubtitle?: string;
  rightContent?: React.ReactNode;
}

export function RoutePreview({
  originName,
  originSubtitle,
  destinationName,
  destinationSubtitle,
  rightContent,
}: RoutePreviewProps) {
  return (
    <View className="flex-row items-start">
      <View className="items-center mr-3 pt-1">
        <View className="w-2.5 h-2.5 rounded-full bg-primary-500" />
        <View className="w-0.5 h-5 bg-neutral-200 my-1" />
        <View className="w-2.5 h-2.5 rounded-full bg-accent-500" />
      </View>
      <View className="flex-1 gap-1">
        <View>
          <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
            {originName}
          </Text>
          {originSubtitle ? (
            <Text className="text-xs text-neutral-400" numberOfLines={1}>{originSubtitle}</Text>
          ) : null}
        </View>
        <View>
          <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
            {destinationName}
          </Text>
          {destinationSubtitle ? (
            <Text className="text-xs text-neutral-400" numberOfLines={1}>{destinationSubtitle}</Text>
          ) : null}
        </View>
      </View>
      {rightContent}
    </View>
  );
}
