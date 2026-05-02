import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AtSign,
  Camera,
  CheckCircle2,
  GraduationCap,
  AlertTriangle,
  Hash,
  X,
} from 'lucide-react-native';
import { Button, Card } from '@/components/ui';
import { UniversityPicker } from '@/components/university/UniversityPicker';
import { Colors } from '@/constants/colors';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { useStudentVerification } from '@/hooks/useStudentVerification';
import type { UniversityResponse } from '@/types/api';

// ── helpers ──

async function pickCardImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permiso requerido', 'Debes permitir acceso a la galería para seleccionar el carnet.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
    aspect: [4, 3],
  });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}

function emailMatchesDomain(email: string, domain: string): boolean {
  const normalizedDomain = domain.startsWith('@') ? domain.slice(1) : domain;
  return email.trim().toLowerCase().endsWith(`@${normalizedDomain.toLowerCase()}`);
}

// ── Screen ──

export default function StudentVerificationSubmitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { universityId: preselectedUniversityId } = useLocalSearchParams<{
    universityId?: string;
  }>();

  const { submit, isSubmitting, submitError } = useStudentVerification();

  const [selectedUniversity, setSelectedUniversity] = useState<UniversityResponse | null>(null);
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>(
    preselectedUniversityId ?? '',
  );
  const [universityEmail, setUniversityEmail] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [cardImageUri, setCardImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<{
    university?: string;
    email?: string;
    studentId?: string;
    card?: string;
  }>({});

  // ── derived state ──
  const domain = selectedUniversity?.domainEmail ?? '';
  const emailMatchesDomainFlag =
    universityEmail.trim().length > 0 && domain ? emailMatchesDomain(universityEmail, domain) : null;

  // ── handlers ──

  const handleUniversityChange = useCallback(
    (id: string, university: UniversityResponse | null) => {
      setSelectedUniversityId(id);
      setSelectedUniversity(university);
      setErrors((prev) => ({ ...prev, university: undefined }));
    },
    [],
  );

  const handlePickImage = useCallback(async () => {
    const uri = await pickCardImage();
    if (uri) {
      setCardImageUri(uri);
      setErrors((prev) => ({ ...prev, card: undefined }));
    }
  }, []);

  const validate = useCallback(() => {
    const newErrors: typeof errors = {};
    if (!selectedUniversityId) newErrors.university = 'Selecciona una universidad';
    if (!universityEmail.trim()) newErrors.email = 'Ingresa tu correo institucional';
    else if (!universityEmail.includes('@')) newErrors.email = 'Ingresa un correo válido';
    if (!studentIdNumber.trim()) newErrors.studentId = 'Ingresa tu número de carnet';
    if (!cardImageUri) newErrors.card = 'Adjunta una foto de tu carnet estudiantil';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedUniversityId, universityEmail, studentIdNumber, cardImageUri]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    try {
      setIsUploading(true);
      const cardUrl = await uploadImageToCloudinary(cardImageUri!, {
        folder: 'student-cards',
      });
      setIsUploading(false);

      await submit({
        universityId: selectedUniversityId,
        universityEmail: universityEmail.trim(),
        studentIdNumber: studentIdNumber.trim(),
        studentCardUrl: cardUrl,
      });

      const isAutoApproval = emailMatchesDomainFlag === true;
      Alert.alert(
        isAutoApproval ? '¡Verificado!' : 'Solicitud enviada',
        isAutoApproval
          ? 'Tu estado estudiantil ha sido confirmado.'
          : 'Recibirás una respuesta en 24-48 horas.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch {
      setIsUploading(false);
      // submitError is set in the hook
    }
  }, [
    validate,
    cardImageUri,
    submit,
    selectedUniversityId,
    universityEmail,
    studentIdNumber,
    emailMatchesDomainFlag,
    router,
  ]);

  const isBusy = isSubmitting || isUploading;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-neutral-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: 16 }}
      >
        {/* Intro banner */}
        <View className="mx-4 mb-5 bg-primary-50 rounded-2xl p-4 flex-row items-start gap-3">
          <GraduationCap size={22} color={Colors.primary[600]} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-sm text-primary-700 leading-5">
            La verificación estudiantil te permite acceder a rutas exclusivas para estudiantes
            universitarios.
          </Text>
        </View>

        {/* University picker */}
        <View className="mx-4 mb-4">
          <Text className="text-sm font-semibold text-neutral-700 mb-2">Universidad</Text>
          <UniversityPicker
            value={selectedUniversityId}
            selectedLabel={selectedUniversity?.name}
            onChange={handleUniversityChange}
            placeholder="Buscar tu universidad..."
          />
          {errors.university && (
            <Text className="text-red-500 text-xs mt-1">{errors.university}</Text>
          )}
        </View>

        {/* Email input */}
        <View className="mx-4 mb-4">
          <Text className="text-sm font-semibold text-neutral-700 mb-2">
            Correo institucional
          </Text>
          <View
            className={`flex-row items-center gap-2 px-4 py-3.5 rounded-2xl border bg-white ${errors.email ? 'border-red-400' : 'border-neutral-200'
              }`}
          >
            <AtSign
              size={16}
              color={errors.email ? Colors.semantic.error : Colors.neutral[400]}
            />
            <TextInput
              value={universityEmail}
              onChangeText={(text) => {
                setUniversityEmail(text);
                setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder={domain ? `ejemplo@${domain.replace(/^@/, '')}` : 'correo@universidad.edu.co'}
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 text-base text-neutral-900"
            />
          </View>
          {errors.email && (
            <Text className="text-red-500 text-xs mt-1">{errors.email}</Text>
          )}

          {/* Domain match chip */}
          {emailMatchesDomainFlag === true && (
            <View className="flex-row items-center gap-1.5 mt-2">
              <CheckCircle2 size={13} color={Colors.semantic.success} />
              <Text className="text-xs text-green-700 font-medium">
                Auto-aprobación disponible
              </Text>
            </View>
          )}
          {emailMatchesDomainFlag === false && (
            <View className="flex-row items-center gap-1.5 mt-2">
              <AlertTriangle size={13} color={Colors.semantic.warning} />
              <Text className="text-xs text-yellow-700 font-medium">
                Requerirá revisión manual
              </Text>
            </View>
          )}
          {domain && !universityEmail && (
            <Text className="text-xs text-neutral-400 mt-1.5">
              Se espera un email {domain.startsWith('@') ? domain : `@${domain}`}
            </Text>
          )}
        </View>

        {/* Student ID input */}
        <View className="mx-4 mb-4">
          <Text className="text-sm font-semibold text-neutral-700 mb-2">
            Número de carnet
          </Text>
          <View
            className={`flex-row items-center gap-2 px-4 py-3.5 rounded-2xl border bg-white ${errors.studentId ? 'border-red-400' : 'border-neutral-200'
              }`}
          >
            <Hash
              size={16}
              color={errors.studentId ? Colors.semantic.error : Colors.neutral[400]}
            />
            <TextInput
              value={studentIdNumber}
              onChangeText={(text) => {
                setStudentIdNumber(text);
                setErrors((prev) => ({ ...prev, studentId: undefined }));
              }}
              placeholder="ej. 20231234"
              placeholderTextColor={Colors.neutral[400]}
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 text-base text-neutral-900"
            />
          </View>
          {errors.studentId && (
            <Text className="text-red-500 text-xs mt-1">{errors.studentId}</Text>
          )}
        </View>

        {/* Card upload */}
        <View className="mx-4 mb-4">
          <Text className="text-sm font-semibold text-neutral-700 mb-2">
            Carnet estudiantil
          </Text>
          <Card>
            <TouchableOpacity
              onPress={handlePickImage}
              activeOpacity={0.75}
              className="flex-row items-center gap-3 py-1"
            >
              <View className="w-12 h-12 rounded-xl bg-primary-50 items-center justify-center">
                <Camera size={22} color={Colors.primary[600]} />
              </View>
              <View className="flex-1">
                <Text className="text-base text-neutral-800 font-medium">
                  {cardImageUri ? 'Cambiar foto' : 'Seleccionar foto'}
                </Text>
                <Text className="text-xs text-neutral-400 mt-0.5">
                  Foto clara del anverso de tu carnet
                </Text>
              </View>
              {cardImageUri && (
                <TouchableOpacity
                  onPress={() => setCardImageUri(null)}
                  hitSlop={8}
                  activeOpacity={0.7}
                >
                  <X size={18} color={Colors.neutral[400]} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {cardImageUri && (
              <Image
                source={{ uri: cardImageUri }}
                className="w-full h-48 rounded-xl mt-3"
                resizeMode="cover"
              />
            )}
          </Card>
          {errors.card && (
            <Text className="text-red-500 text-xs mt-1">{errors.card}</Text>
          )}
        </View>

        {/* Upload progress hint */}
        {isUploading && (
          <View className="mx-4 mb-3 flex-row items-center gap-2">
            <ActivityIndicator size="small" color={Colors.primary[500]} />
            <Text className="text-sm text-neutral-500">Subiendo imagen...</Text>
          </View>
        )}

        {/* Submit error */}
        {submitError && (
          <View className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-2xl p-3">
            <Text className="text-sm text-red-700">{submitError}</Text>
          </View>
        )}

        {/* Submit button */}
        <View className="mx-4 mt-2">
          <Button
            onPress={handleSubmit}
            disabled={isBusy}
            variant="primary"
          >
            {isBusy ? 'Enviando...' : 'Enviar verificación'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
