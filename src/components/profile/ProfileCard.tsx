import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Star, Edit2, Mail, Phone } from 'lucide-react-native';
import { Card, Avatar, Badge, Divider } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { getVerificationLevelLabel } from '@/lib/utils';
import type { UserResponse } from '@/types/api';

function verificationBadge(level: string | undefined) {
  const l = level ?? 'NONE';
  const variant =
    l === 'FULL' || l === 'PREMIUM'
      ? 'success'
      : l === 'IDENTITY' || l === 'BASIC'
        ? 'warning'
        : 'neutral';
  return <Badge label={getVerificationLevelLabel(l)} variant={variant} />;
}

interface Props {
  user: UserResponse | null;
  onEdit: () => void;
}

export function ProfileCard({ user, onEdit }: Props) {
  const isVerified =
    user?.verificationLevel === 'FULL' || user?.verificationLevel === 'PREMIUM';

  return (
    <Card className="mb-6">
      <View className="flex-row items-center">
        <Avatar
          uri={user?.profilePhotoUrl}
          firstName={user?.firstName ?? 'U'}
          lastName={user?.lastName ?? ''}
          size="lg"
          verified={isVerified}
        />
        <View className="flex-1 ml-4">
          <Text className="text-lg font-bold text-neutral-900">
            {user?.firstName} {user?.lastName}
          </Text>
          <View className="flex-row items-center mt-1">
            <Star size={14} color={Colors.accent[500]} />
            <Text className="text-sm text-neutral-600 ml-1">
              {user?.trustScore?.toFixed(1) ?? '0.0'}
            </Text>
            <Text className="text-sm text-neutral-400 ml-1">· {user?.role}</Text>
          </View>
          <View className="mt-2">{verificationBadge(user?.verificationLevel)}</View>
        </View>
        <TouchableOpacity
          onPress={onEdit}
          className="w-9 h-9 rounded-full bg-primary-50 items-center justify-center"
        >
          <Edit2 size={16} color={Colors.primary[600]} />
        </TouchableOpacity>
      </View>

      <Divider className="my-4" />

      <View className="gap-2.5">
        <View className="flex-row items-center">
          <Mail size={14} color={Colors.neutral[400]} />
          <Text className="text-sm text-neutral-600 ml-2">{user?.email}</Text>
        </View>
        <View className="flex-row items-center">
          <Phone size={14} color={Colors.neutral[400]} />
          <Text className="text-sm text-neutral-600 ml-2">{user?.phone}</Text>
        </View>
      </View>
    </Card>
  );
}
