import React from 'react';
import { View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

interface ScreenProps extends ViewProps {
  /** Wrap with SafeAreaView (default: true). Pass false for full-bleed screens. */
  safe?: boolean;
  /** Which edges to protect. Only used when safe=true. Default: all edges. */
  edges?: Edge[];
  children: React.ReactNode;
}

export function Screen({
  safe = true,
  edges,
  children,
  className = '',
  ...props
}: ScreenProps) {
  if (!safe) {
    return (
      <View className={`flex-1 bg-surface-muted ${className}`} {...props}>
        {children}
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={edges}
      className={`flex-1 bg-surface-muted ${className}`}
      {...props}
    >
      {children}
    </SafeAreaView>
  );
}
