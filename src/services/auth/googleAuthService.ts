import auth, { GoogleAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export interface GoogleSignInResult {
  firebaseIdToken: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Ejecuta el flujo completo de Google Sign-In y retorna el Firebase ID Token
 * listo para enviar al backend en POST /v1/auth/google.
 */
export const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
  // 1. Verificar disponibilidad de Google Play Services (Android)
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // 2. Iniciar flujo nativo de selección de cuenta Google
  const signInResult = await GoogleSignin.signIn();

  // 3. Obtener ID token de Google
  const idToken = signInResult.data?.idToken;
  if (!idToken) {
    throw new Error('No se obtuvo ID token de Google');
  }

  // 4. Crear credencial de Firebase con el token de Google
  const googleCredential = GoogleAuthProvider.credential(idToken);

  // 5. Autenticar en Firebase (necesario para que Firebase genere su propio ID Token)
  const userCredential = await auth().signInWithCredential(googleCredential);

  // 6. Obtener el Firebase ID Token (este es el que va al backend)
  const firebaseIdToken = await userCredential.user.getIdToken();

  return {
    firebaseIdToken,
    email: userCredential.user.email ?? '',
    displayName: userCredential.user.displayName,
    photoURL: userCredential.user.photoURL,
  };
};

/**
 * Cierra sesión de Google (limpia el estado de GoogleSignin y Firebase Auth).
 * Llamar junto al logout del backend.
 */
export const signOutGoogle = async (): Promise<void> => {
  try {
    const isSignedIn = await GoogleSignin.isSignedIn();
    if (isSignedIn) {
      await GoogleSignin.signOut();
    }
    await auth().signOut();
  } catch {
    // Best-effort: no lanzar si ya estaba desconectado
  }
};
