import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import Svg, { Path, G, Rect, ClipPath, Defs } from 'react-native-svg';

interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
  label?: string;
  disabled?: boolean;
}

function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Defs>
        <ClipPath id="clip">
          <Rect width={48} height={48} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#clip)">
        <Path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <Path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <Path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <Path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </G>
    </Svg>
  );
}

export function GoogleSignInButton({
  onPress,
  loading = false,
  label = 'Continuar con Google',
  disabled = false,
}: GoogleSignInButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      className="w-full flex-row items-center justify-center bg-white border border-neutral-200 rounded-2xl py-4 px-6"
      style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 }}
    >
      {loading ? (
        <ActivityIndicator color="#757575" size="small" />
      ) : (
        <View className="flex-row items-center gap-3">
          <GoogleLogo />
          <Text className="text-base font-medium text-neutral-700">{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
