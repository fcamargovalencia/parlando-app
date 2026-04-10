import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Spinner } from '@/components/ui';
import { useUserProfile } from '@/hooks/useUserProfile';
import { UserProfileHeader } from '@/components/user/UserProfileHeader';
import { UserProfileCard } from '@/components/user/UserProfileCard';
import { UserRatingsList } from '@/components/user/UserRatingsList';

export default function UserProfileScreen() {
  const { user, ratings, loading, error, insets, avgScore, withComment, load, goBack } =
    useUserProfile();

  return (
    <View className="flex-1 bg-neutral-50">
      <UserProfileHeader paddingTop={insets.top} onBack={goBack} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      ) : error || !user ? (
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <Text className="text-sm text-neutral-500 text-center">
            {error ?? 'No encontrado'}
          </Text>
          <TouchableOpacity onPress={load}>
            <Text className="text-sm font-semibold text-primary-600">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}
        >
          <UserProfileCard user={user} ratings={ratings} avgScore={avgScore} />
          <UserRatingsList ratings={ratings} withComment={withComment} />
          <View style={{ height: insets.bottom + 16 }} />
        </ScrollView>
      )}
    </View>
  );
}
