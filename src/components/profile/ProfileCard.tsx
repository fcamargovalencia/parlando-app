import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Star, Edit2, Mail, Phone, CheckCircle, AlertTriangle } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { Card, Avatar, Badge, Divider } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { getVerificationLevelLabel } from '@/lib/utils';
import type { UserResponse } from '@/types/api';

/** Minimal Google "G" icon (SVG) */
function GoogleIcon({ size = 14 }: { size?: number; }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.2 0 5.9 1.1 8.1 2.9l6-6C34.5 3.1 29.6 1 24 1 14.8 1 6.9 6.6 3.2 14.5l7 5.4C12 13.8 17.5 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.4-4.1 7.1-10.1 7.1-17.1z" />
      <Path fill="#FBBC05" d="M10.2 28.5A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.7-4.5l-7-5.4A23.5 23.5 0 0 0 .5 24c0 3.8.9 7.4 2.5 10.5l7.2-6z" />
      <Path fill="#34A853" d="M24 47c5.5 0 10.2-1.8 13.6-4.9l-7.6-5.9c-1.9 1.3-4.4 2-6 2-6.5 0-12-4.3-14-10.2l-7.2 6C6.9 41.4 14.8 47 24 47z" />
    </Svg>
  );
}

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
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <Mail size={14} color={Colors.neutral[400]} />
            <Text className="text-sm text-neutral-600 ml-2 flex-1" numberOfLines={1}>{user?.email}</Text>
          </View>
          {user?.provider === 'GOOGLE' ? (
            <View className="flex-row items-center ml-2 px-2 py-0.5 bg-blue-50 rounded-full">
              <GoogleIcon size={12} />
              <Text className="text-xs font-medium text-blue-700 ml-1">Google</Text>
            </View>
          ) : user?.emailVerified ? (
            <View className="flex-row items-center ml-2">
              <CheckCircle size={14} color={Colors.semantic.success} />
            </View>
          ) : (
            <View className="flex-row items-center ml-2 px-2 py-0.5 bg-yellow-50 rounded-full">
              <AlertTriangle size={12} color="#CA8A04" />
              <Text className="text-xs font-medium text-yellow-700 ml-1">No verificado</Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center">
          <Phone size={14} color={Colors.neutral[400]} />
          <Text className="text-sm text-neutral-600 ml-2">{user?.phone}</Text>
        </View>
      </View>
    </Card>
  );
}
