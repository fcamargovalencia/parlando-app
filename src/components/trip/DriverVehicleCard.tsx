import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  Car,
  ChevronRight,
  Star,
  MessageSquare,
  PaintBucket,
  FileText,
  Send,
} from 'lucide-react-native';
import { Card, Avatar } from '@/components/ui';
import { Colors } from '@/constants/colors';
import type { TripResponse, VehicleResponse, BookingResponse } from '@/types/api';

interface DriverVehicleCardProps {
  trip: TripResponse;
  vehicle: VehicleResponse | null;
  myBooking: BookingResponse | null | undefined;
  driverCommentCount: number | null;
  isDriverRated: boolean;
  onNavigateToDriver: () => void;
  onRateDriver: () => void;
  onContactDriver: () => void;
}

export function DriverVehicleCard({
  trip,
  vehicle,
  myBooking,
  driverCommentCount,
  isDriverRated,
  onNavigateToDriver,
  onRateDriver,
  onContactDriver,
}: DriverVehicleCardProps) {
  const driver = trip.driver;
  if (!driver) return null;

  const showRating = myBooking?.status === 'COMPLETED';
  const alreadyRated = isDriverRated || !!myBooking?.driverRatingId;
  const canContact = trip.status === 'PUBLISHED' || trip.status === 'IN_PROGRESS';

  return (
    <>
      <Card>
        <TouchableOpacity
          className="flex-row items-center gap-3"
          activeOpacity={0.7}
          onPress={onNavigateToDriver}
        >
          <Avatar
            uri={driver.profilePhotoUrl}
            firstName={driver.firstName}
            lastName={driver.lastName}
            size="md"
          />
          <View className="flex-1">
            <Text className="text-lg font-semibold text-neutral-900">
              {driver.firstName} {driver.lastName}
            </Text>
            <View className="flex-row items-center gap-3 mt-0.5">
              <View className="flex-row items-center gap-1">
                <Star size={14} color={Colors.semantic.warning} fill={Colors.semantic.warning} />
                <Text className="text-base font-semibold text-neutral-700">
                  {driver.trustScore} / 5
                </Text>
              </View>
              {driverCommentCount !== null && (
                <View className="flex-row items-center gap-1">
                  <MessageSquare size={14} color={Colors.neutral[400]} />
                  <Text className="text-base font-semibold text-neutral-700">
                    {driverCommentCount} comentarios
                  </Text>
                </View>
              )}
            </View>
          </View>
          <ChevronRight size={20} color={Colors.neutral[600]} strokeWidth={2.5} />
        </TouchableOpacity>

        {vehicle && (
          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-neutral-100">
            <View className="flex-row items-center gap-2">
              <Car size={15} color={Colors.neutral[400]} />
              <Text className="text-base font-semibold text-neutral-900">
                {vehicle.brand} {vehicle.model} {vehicle.year}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <PaintBucket size={13} color={Colors.neutral[400]} />
              <Text className="text-base text-neutral-500">{vehicle.color}</Text>
            </View>
            <View className="flex-row items-center gap-1 bg-green-100 rounded-full px-2 py-0.5">
              <FileText size={11} color="#15803D" />
              <Text className="text-xs font-semibold text-green-700">SOAT</Text>
            </View>
          </View>
        )}

        {showRating && (
          <View className="mt-3 pt-3 border-t border-neutral-100 items-end">
            {alreadyRated ? (
              <View
                className="flex-row items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-full"
                style={{ borderWidth: 1, borderColor: '#BBF7D0' }}
              >
                <Star size={13} color="#16A34A" fill="#16A34A" />
                <Text className="text-sm font-semibold text-green-700">
                  Conductor calificado
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={onRateDriver}
                className="flex-row items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full"
                style={{ borderWidth: 1, borderColor: '#FDE68A' }}
              >
                <Star size={13} color={Colors.semantic.warning} fill={Colors.semantic.warning} />
                <Text className="text-sm font-semibold text-amber-600">
                  Calificar conductor
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>

      {/* Contact driver button */}
      {canContact && (
        <TouchableOpacity
          onPress={onContactDriver}
          className="flex-row items-center justify-center gap-2 py-3.5 rounded-2xl"
          style={{
            backgroundColor: Colors.primary[50],
            borderWidth: 1,
            borderColor: Colors.primary[200],
          }}
        >
          <Send size={16} color={Colors.primary[600]} />
          <Text className="text-base font-semibold" style={{ color: Colors.primary[600] }}>
            Contactar al conductor
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}
