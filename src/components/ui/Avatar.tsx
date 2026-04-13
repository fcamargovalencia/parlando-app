import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { ShieldCheck } from 'lucide-react-native';
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
  sm: { container: 'w-8 h-8', text: 'text-xs', badge: 'w-4 h-4', shieldSize: 10, borderWidth: 2 },
  md: { container: 'w-12 h-12', text: 'text-sm', badge: 'w-5 h-5', shieldSize: 12, borderWidth: 2 },
  lg: { container: 'w-16 h-16', text: 'text-lg', badge: 'w-6 h-6', shieldSize: 14, borderWidth: 2.5 },
  xl: { container: 'w-24 h-24', text: 'text-2xl', badge: 'w-7 h-7', shieldSize: 18, borderWidth: 3 },
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
      {/* Blue border ring when verified */}
      <View
        className="rounded-full items-center justify-center"
        style={verified ? { padding: s.borderWidth, backgroundColor: Colors.primary[500] } : undefined}
      >
        {uri ? (
          <Image
            source={{ uri }}
            className={`${s.container} rounded-full`}
            contentFit="cover"
            cachePolicy="memory-disk"
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
      </View>
      {verified && (
        <View
          className={`absolute -bottom-0.5 -right-0.5 ${s.badge} rounded-full items-center justify-center`}
          style={{ backgroundColor: Colors.primary[500] }}
        >
          <ShieldCheck size={s.shieldSize} color="#fff" strokeWidth={2.5} fill={Colors.primary[500]} />
        </View>
      )}
    </View>
  );
}
