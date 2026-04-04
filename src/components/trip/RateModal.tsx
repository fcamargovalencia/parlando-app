import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Star, X } from 'lucide-react-native';
import { Avatar } from '@/components/ui';
import { Colors } from '@/constants/colors';

interface RateModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (score: number, comment: string) => Promise<void>;
  title: string;
  subtitle?: string;
  avatarUri?: string | null;
  avatarFirstName?: string;
  avatarLastName?: string;
}

export function RateModal({
  visible,
  onClose,
  onSubmit,
  title,
  subtitle,
  avatarUri,
  avatarFirstName = '',
  avatarLastName = '',
}: RateModalProps) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (loading) return;
    setScore(0);
    setComment('');
    onClose();
  };

  const handleSubmit = async () => {
    if (score === 0 || loading) return;
    setLoading(true);
    try {
      await onSubmit(score, comment.trim());
      setScore(0);
      setComment('');
    } finally {
      setLoading(false);
    }
  };

  const starLabels = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <TouchableOpacity
          className="flex-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View className="bg-white rounded-t-3xl px-6 pb-10 pt-4">
          {/* Handle */}
          <View className="w-12 h-1 rounded-full bg-neutral-200 self-center mb-5" />

          {/* Close */}
          <TouchableOpacity
            onPress={handleClose}
            disabled={loading}
            className="absolute right-5 top-4 w-9 h-9 items-center justify-center rounded-full bg-neutral-100"
          >
            <X size={18} color={Colors.neutral[500]} />
          </TouchableOpacity>

          {/* Avatar + name */}
          <View className="items-center mb-5">
            <Avatar
              uri={avatarUri}
              firstName={avatarFirstName}
              lastName={avatarLastName}
              size="lg"
            />
            <Text className="text-lg font-bold text-neutral-900 mt-3 text-center">
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-sm text-neutral-500 mt-0.5 text-center">
                {subtitle}
              </Text>
            ) : null}
          </View>

          {/* Stars */}
          <Text className="text-sm text-neutral-500 text-center mb-3">
            ¿Cómo fue tu experiencia?
          </Text>
          <View className="flex-row justify-center gap-3 mb-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setScore(s)}
                disabled={loading}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Star
                  size={42}
                  color={s <= score ? '#F59E0B' : Colors.neutral[200]}
                  fill={s <= score ? '#F59E0B' : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-sm font-medium text-amber-500 text-center mb-5 h-5">
            {score > 0 ? starLabels[score] : ''}
          </Text>

          {/* Comment */}
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Añade un comentario (opcional)"
            placeholderTextColor={Colors.neutral[400]}
            multiline
            numberOfLines={3}
            editable={!loading}
            style={{
              backgroundColor: Colors.neutral[50],
              borderWidth: 1,
              borderColor: Colors.neutral[200],
              borderRadius: 16,
              padding: 14,
              fontSize: 15,
              color: Colors.neutral[900],
              minHeight: 80,
              textAlignVertical: 'top',
              marginBottom: 20,
            }}
          />

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={score === 0 || loading}
            style={{
              backgroundColor: score === 0 ? Colors.neutral[200] : Colors.primary[600],
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: score === 0 ? Colors.neutral[400] : 'white',
                }}
              >
                Enviar calificación
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
