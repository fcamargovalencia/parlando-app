import React from 'react';
import { View, Text } from 'react-native';

interface RoutePreviewProps {
  originName: string;
  originSubtitle?: string | null;
  destinationName: string;
  destinationSubtitle?: string | null;
  compact?: boolean;
  rightContent?: React.ReactNode;
}

export const RoutePreview = React.memo(function RoutePreview({
  originName,
  originSubtitle,
  destinationName,
  destinationSubtitle,
  compact = false,
  rightContent,
}: RoutePreviewProps) {
  const dotClass = compact ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const nameClass = compact
    ? 'text-xs font-medium text-neutral-800'
    : 'text-base font-semibold text-neutral-900';
  const subtitleClass = compact
    ? 'text-[11px] text-neutral-400'
    : 'text-sm text-neutral-500';

  return (
    <View className="flex-row items-stretch">
      <View className="items-center mr-3 pt-1.5 pb-1">
        <View className={`${dotClass} rounded-full bg-primary-500`} />
        <View className="flex-1 w-0.5 bg-neutral-200 my-1" />
        <View className={`${dotClass} rounded-full bg-accent-500`} />
      </View>
      <View className="flex-1 gap-3 py-0.5">
        <View>
          <Text className={nameClass} numberOfLines={1}>{originName}</Text>
          {originSubtitle ? (
            <Text className={subtitleClass} numberOfLines={1}>{originSubtitle}</Text>
          ) : null}
        </View>
        <View>
          <Text className={nameClass} numberOfLines={1}>{destinationName}</Text>
          {destinationSubtitle ? (
            <Text className={subtitleClass} numberOfLines={1}>{destinationSubtitle}</Text>
          ) : null}
        </View>
      </View>
      {rightContent}
    </View>
  );
});
