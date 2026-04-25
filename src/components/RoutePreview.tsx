import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface WaypointStop {
  name: string;
  subtitle?: string | null;
}

interface RoutePreviewProps {
  originName: string;
  originSubtitle?: string | null;
  destinationName: string;
  destinationSubtitle?: string | null;
  compact?: boolean;
  rightContent?: React.ReactNode;
  waypoints?: WaypointStop[];
  expandable?: boolean;
}

export const RoutePreview = React.memo(function RoutePreview({
  originName,
  originSubtitle,
  destinationName,
  destinationSubtitle,
  compact = false,
  rightContent,
  waypoints,
  expandable = false,
}: RoutePreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const dotSize = compact ? 8 : 10;
  const dotClass = compact ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const nameClass = compact
    ? 'text-xs font-medium text-neutral-800'
    : 'text-base font-semibold text-neutral-900';
  const subtitleClass = compact
    ? 'text-[11px] text-neutral-400'
    : 'text-sm text-neutral-500';

  const hasWaypoints = waypoints && waypoints.length > 0;

  if (!hasWaypoints) {
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
  }

  const waypointNameClass = compact
    ? 'text-[11px] font-medium text-neutral-600'
    : 'text-sm font-medium text-neutral-600';
  const waypointSubtitleClass = compact
    ? 'text-[10px] text-neutral-400'
    : 'text-xs text-neutral-400';
  const lineSegmentHeight = compact ? 8 : 10;

  const waypointCount = waypoints.length;
  const showStops = !expandable || expanded;

  return (
    <View className="flex-row items-stretch">
      <View className="flex-1">
        {/* Origin */}
        <View className="flex-row items-start">
          <View className="items-center mr-3 pt-1" style={{ width: dotSize }}>
            <View className={`${dotClass} rounded-full bg-primary-500`} />
          </View>
          <View className="flex-1 pb-2">
            <Text className={nameClass} numberOfLines={1}>{originName}</Text>
            {originSubtitle ? (
              <Text className={subtitleClass} numberOfLines={1}>{originSubtitle}</Text>
            ) : null}
          </View>
        </View>

        {/* Expandable toggle (collapsed) */}
        {expandable && !expanded && (
          <TouchableOpacity
            onPress={() => setExpanded(true)}
            className="flex-row items-center"
            activeOpacity={0.7}
          >
            <View className="items-center mr-3" style={{ width: dotSize }}>
              <View className="w-0.5 bg-neutral-200 flex-1" style={{ height: lineSegmentHeight * 2 }} />
            </View>
            <View className="flex-row items-center gap-1 py-0.5">
              <Text className={compact ? 'text-[10px] text-primary-500' : 'text-xs text-primary-500'}>
                {waypointCount} parada{waypointCount !== 1 ? 's' : ''}
              </Text>
              <ChevronDown size={compact ? 10 : 12} color={Colors.primary[500]} />
            </View>
          </TouchableOpacity>
        )}

        {/* Waypoints (visible when not expandable, or when expanded) */}
        {showStops && waypoints.map((wp, i) => (
          <React.Fragment key={i}>
            <View className="flex-row">
              <View className="items-center mr-3" style={{ width: dotSize }}>
                <View className="w-0.5 bg-neutral-200" style={{ height: lineSegmentHeight }} />
              </View>
            </View>
            <View className="flex-row items-start">
              <View className="items-center mr-3 pt-0.5" style={{ width: dotSize }}>
                <View className={`${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-neutral-400`} />
              </View>
              <View className="flex-1 pb-2">
                <Text className={waypointNameClass} numberOfLines={1}>{wp.name}</Text>
                {wp.subtitle ? (
                  <Text className={waypointSubtitleClass} numberOfLines={1}>{wp.subtitle}</Text>
                ) : null}
              </View>
            </View>
          </React.Fragment>
        ))}

        {/* Expandable toggle (expanded — collapse button) */}
        {expandable && expanded && (
          <TouchableOpacity
            onPress={() => setExpanded(false)}
            className="flex-row items-center"
            activeOpacity={0.7}
          >
            <View className="items-center mr-3" style={{ width: dotSize }}>
              <View className="w-0.5 bg-neutral-200" style={{ height: lineSegmentHeight }} />
            </View>
            <View className="flex-row items-center gap-1 py-0.5">
              <Text className={compact ? 'text-[10px] text-primary-500' : 'text-xs text-primary-500'}>
                Ocultar paradas
              </Text>
              <ChevronUp size={compact ? 10 : 12} color={Colors.primary[500]} />
            </View>
          </TouchableOpacity>
        )}

        {/* Connector to destination */}
        <View className="flex-row">
          <View className="items-center mr-3" style={{ width: dotSize }}>
            <View className="w-0.5 bg-neutral-200" style={{ height: lineSegmentHeight }} />
          </View>
        </View>

        {/* Destination */}
        <View className="flex-row items-start">
          <View className="items-center mr-3 pt-1" style={{ width: dotSize }}>
            <View className={`${dotClass} rounded-full bg-accent-500`} />
          </View>
          <View className="flex-1">
            <Text className={nameClass} numberOfLines={1}>{destinationName}</Text>
            {destinationSubtitle ? (
              <Text className={subtitleClass} numberOfLines={1}>{destinationSubtitle}</Text>
            ) : null}
          </View>
        </View>
      </View>
      {rightContent}
    </View>
  );
});
