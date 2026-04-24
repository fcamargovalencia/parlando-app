import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { FileText, Upload } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';

export interface DocumentUploadCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  preview?: string;
  fileLabel?: string;
  onPick: () => void;
  onRemove?: () => void;
}

export function DocumentUploadCard({
  title,
  description,
  icon,
  preview,
  fileLabel,
  onPick,
  onRemove,
}: DocumentUploadCardProps) {
  return (
    <Card className="mb-4">
      <TouchableOpacity className="flex-row items-center py-2" onPress={onPick} activeOpacity={0.8}>
        <View className="w-12 h-12 rounded-xl bg-primary-50 items-center justify-center mr-3">
          {icon}
        </View>
        <View className="flex-1 pr-3">
          <Text className="text-base text-neutral-800">{title}</Text>
          <Text className="text-xs text-neutral-400 mt-0.5">{description}</Text>
          {!!fileLabel && (
            <Text className="text-xs text-primary-700 mt-1" numberOfLines={1}>
              {fileLabel}
            </Text>
          )}
        </View>
        <View className="items-end">
          {preview ? (
            <>
              <Image source={{ uri: preview }} className="w-14 h-14 rounded-xl" resizeMode="cover" />
              {onRemove && (
                <TouchableOpacity onPress={onRemove} className="mt-2" hitSlop={8}>
                  <Text className="text-xs font-medium text-red-500">Quitar</Text>
                </TouchableOpacity>
              )}
            </>
          ) : fileLabel ? (
            <>
              <View className="w-14 h-14 rounded-xl bg-neutral-100 items-center justify-center">
                <FileText size={20} color={Colors.neutral[600]} />
              </View>
              {onRemove && (
                <TouchableOpacity onPress={onRemove} className="mt-2" hitSlop={8}>
                  <Text className="text-xs font-medium text-red-500">Quitar</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View className="items-center">
              <Upload size={18} color={Colors.primary[600]} />
              <Text className="text-xs font-medium text-primary-600 mt-1">Cargar</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );
}
