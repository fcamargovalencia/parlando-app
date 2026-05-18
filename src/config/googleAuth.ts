import { GoogleSignin } from '@react-native-google-signin/google-signin';

/**
 * Inicializar Google Sign-In.
 * Llamar una vez al inicio de la app (app/_layout.tsx).
 */
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    // webClientId: Client ID de tipo "Web application" en Google Cloud Console.
    // NO es el Client ID de Android/iOS — debe ser el Web para que Firebase valide el token.
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
};
