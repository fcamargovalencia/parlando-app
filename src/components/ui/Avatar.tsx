import React from 'react';
import { View, Text, Image } from 'react-native';
import { Colors } from '@/constants/colors';
import { getInitials } from '@/lib/utils';

interface AvatarProps {
  uri?: string | null;
  firstName?: string;
  lastName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  verified?: boolean;
}

const sizeMap = {
  sm: { container: 'w-8 h-8', text: 'text-xs', badge: 'w-3 h-3' },
  md: { container: 'w-12 h-12', text: 'text-sm', badge: 'w-4 h-4' },
  lg: { container: 'w-16 h-16', text: 'text-lg', badge: 'w-5 h-5' },
  xl: { container: 'w-24 h-24', text: 'text-2xl', badge: 'w-6 h-6' },
};

export function Avatar({
  uri,
  firstName = '',
  lastName = '',
  size = 'md',
  verified,
}: AvatarProps) {
  const s = sizeMap[size];
  const initials = getInitials(firstName, lastName);

  return (
    <View className="relative">
      {uri ? (
        <Image
          source={{ uri }}
          className={`${s.container} rounded-full`}
          resizeMode="cover"
        />
      ) : (
        <View
          className={`${s.container} rounded-full bg-primary-100 items-center justify-center`}
        >
          <Text className={`${s.text} font-bold text-primary-700`}>
            {initials}
          </Text>
        </View>
      )}
      {verified && (
        <View
          className={`absolute -bottom-0.5 -right-0.5 ${s.badge} rounded-full items-center justify-center`}
          style={{ backgroundColor: Colors.semantic.success }}
        >
          <Text className="text-white text-[8px] font-bold">✓</Text>
        </View>
      )}
    </View>
  );
}
