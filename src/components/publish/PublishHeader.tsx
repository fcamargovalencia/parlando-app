import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface Props {
  step: number;
  totalSteps: number;
  submitting: boolean;
  progressValue: SharedValue<number>;
  onBack: () => void;
}

export function PublishHeader({ step, totalSteps, submitting, progressValue, onBack }: Props) {
  const barStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  return (
    <View className="mb-5">
      <View className="mb-2">
        <TouchableOpacity
          onPress={onBack}
          disabled={step === 1 || submitting}
          className={`w-9 h-9 rounded-full border border-neutral-200 bg-white items-center justify-center ${
            step === 1 ? 'opacity-30' : 'opacity-100'
          }`}
        >
          <ArrowLeft size={18} color={Colors.neutral[700]} />
        </TouchableOpacity>
      </View>
      <View className="h-2 rounded-full bg-neutral-100 overflow-hidden">
        <Animated.View className="h-2 bg-primary-500" style={barStyle} />
      </View>
    </View>
  );
}
