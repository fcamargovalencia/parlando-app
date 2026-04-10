import React from 'react';
import { Text } from 'react-native';

interface Props {
  title: string;
}

export function SectionTitle({ title }: Props) {
  return (
    <Text className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2 ml-1">
      {title}
    </Text>
  );
}
