import React from 'react';
import { Bus, Building2, GraduationCap } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

const ICON_CONFIG: Record<string, { Icon: typeof Bus; color: string; }> = {
  INTERCITY: { Icon: Bus, color: Colors.primary[600] },
  URBAN: { Icon: Building2, color: Colors.accent[600] },
  ROUTINE: { Icon: GraduationCap, color: '#3B82F6' },
};

export function TripTypeIcon({ type, size = 16 }: { type: string; size?: number; }) {
  const config = ICON_CONFIG[type] ?? ICON_CONFIG.ROUTINE;
  const { Icon, color } = config;
  return <Icon size={size} color={color} />;
}
