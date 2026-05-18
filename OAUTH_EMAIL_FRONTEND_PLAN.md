# OAuth2 Google Sign-In + Email Transaccional — Plan Frontend

> Referencia backend: `OAUTH_EMAIL_BACKEND_PLAN.md`  
> Stack asumido: React Native (Expo) · Firebase SDK · React Navigation  
> Firebase ya integrado: FCM (push notifications) + Google Maps

---

## Resumen de funcionalidades

| ID | Funcionalidad | Sprint | Estado |
|----|---------------|--------|--------|
| F-1 | Configurar Firebase Auth en el proyecto | Sprint 1 | ❌ Pendiente |
| F-2 | Botón "Continuar con Google" en pantalla Login | Sprint 1 | ❌ Pendiente |
| F-3 | Botón "Continuar con Google" en pantalla Registro | Sprint 1 | ❌ Pendiente |
| F-4 | Integración con endpoint `POST /api/v1/auth/google` | Sprint 1 | ❌ Pendiente |
| F-5 | Manejo de auto-linking (usuario LOCAL existente) | Sprint 1 | ❌ Pendiente |
| F-6 | Pantalla / modal "Solicitar reset de contraseña" | Sprint 2 | ❌ Pendiente |
| F-7 | Pantalla "Nueva contraseña" (desde deep link o token) | Sprint 2 | ❌ Pendiente |
| F-8 | Banner / pantalla "Verifica tu email" | Sprint 2 | ❌ Pendiente |
| F-9 | Manejo de deep links para verificación y reset | Sprint 2 | ❌ Pendiente |
| F-10 | Notificaciones de viaje: renderizado de emails | Sprint 3 | ❌ Pendiente |
| F-11 | Feedback visual en flujos de email | Sprint 3 | ❌ Pendiente |
| F-12 | Tests y manejo de errores edge cases | Sprint 4 | ❌ Pendiente |

---

## Dependencias entre sprints

```
Sprint 1 (Google Sign-In)
  └─► Sprint 2 (Reset contraseña — necesita Auth context completo)
        └─► Sprint 3 (Notificaciones — necesita perfil user completo)
Sprint 4 (Tests — necesita todo lo anterior)
```

---

## Prerrequisitos — Firebase Console

Antes de comenzar el Sprint 1, realizar en **Firebase Console** (`console.firebase.google.com`):

1. **Habilitar Google Sign-In:**  
   `Authentication → Sign-in methods → Google → Enable`

2. **Agregar SHA-1 / SHA-256** (para Android):  
   `Project Settings → Your apps → Android app → Add fingerprint`  
   Obtener con: `cd android && ./gradlew signingReport`

3. **Descargar archivos de configuración actualizados:**
   - Android: `google-services.json` → reemplazar en `android/app/`
   - iOS: `GoogleService-Info.plist` → reemplazar en `ios/`

4. **Authorized domains** (si usas `signInWithPopup` en web):  
   `Authentication → Settings → Authorized domains` → agregar tu dominio

---

## Sprint 1 — Google Sign-In: Configuración + Flujo completo

**Objetivo:** El usuario puede registrarse e iniciar sesión con Google desde Login y Registro.  
**Duración estimada:** 1–2 días

---

### 1.1 Instalar dependencias

```bash
# Firebase Auth (si no está instalado aún)
npx expo install @react-native-firebase/auth

# Google Sign-In para React Native
npx expo install @react-native-google-signin/google-signin
```

> Si usas **Expo Go**, necesitas un **development build** (`npx expo run:android` / `npx expo run:ios`) porque estos módulos usan código nativo.

---

### 1.2 Configurar `GoogleSignin`

**Archivo:** `src/config/googleAuth.ts` (nuevo archivo)

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

/**
 * Inicializar Google Sign-In.
 * Llamar una vez al inicio de la app (App.tsx o equivalente).
 */
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    // webClientId: el Client ID de tipo "Web" de Google Cloud Console.
    // Se encuentra en Firebase Console → Project Settings → General → Web API Key
    // O en Google Cloud Console → APIs & Services → Credentials
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
};
```

**Archivo:** `App.tsx` (o `_layout.tsx` si usas Expo Router)

```typescript
import { configureGoogleSignIn } from './src/config/googleAuth';

// Llamar antes del primer render
configureGoogleSignIn();
```

**Variables de entorno:**

```env
# .env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxx.apps.googleusercontent.com
```

> El `webClientId` es el **OAuth 2.0 Client ID** de tipo `Web application` en Google Cloud Console.  
> **No** es el Client ID de Android ni iOS — debe ser el Web para que Firebase pueda verificar el token.

---

### 1.3 Servicio de Google Auth — `googleAuthService.ts`

**Archivo:** `src/services/auth/googleAuthService.ts`

```typescript
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export interface GoogleSignInResult {
  firebaseIdToken: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Ejecuta el flujo completo de Google Sign-In y retorna el Firebase ID Token
 * listo para enviar al backend.
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
  const googleCredential = auth.GoogleAuthProvider.credential(idToken);

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
 * Cierra sesión de Google (limpia el estado de GoogleSignin).
 * Llamar junto al logout del backend.
 */
export const signOutGoogle = async (): Promise<void> => {
  const isSignedIn = await GoogleSignin.isSignedIn();
  if (isSignedIn) {
    await GoogleSignin.signOut();
  }
  await auth().signOut();
};
```

---

### 1.4 Integración con el backend — `authApi.ts`

**Archivo:** `src/api/authApi.ts` (modificar archivo existente)

Agregar el método para el nuevo endpoint:

```typescript
/**
 * Envía el Firebase ID Token al backend para login/registro con Google.
 * El backend verifica el token y retorna un JWT pair propio.
 */
export const googleSignIn = async (firebaseIdToken: string): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/v1/auth/google', {
    firebaseIdToken,
  });
  return response.data;
};
```

---

### 1.5 Hook — `useGoogleSignIn.ts`

**Archivo:** `src/hooks/auth/useGoogleSignIn.ts`

```typescript
import { useState } from 'react';
import { signInWithGoogle } from '../../services/auth/googleAuthService';
import { googleSignIn as googleSignInApi } from '../../api/authApi';
import { useAuthStore } from '../../store/authStore'; // o tu store de auth existente

interface UseGoogleSignInReturn {
  loading: boolean;
  error: string | null;
  handleGoogleSignIn: () => Promise<void>;
}

export const useGoogleSignIn = (): UseGoogleSignInReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setTokens, setUser } = useAuthStore();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Flujo nativo Google → Firebase ID Token
      const { firebaseIdToken } = await signInWithGoogle();

      // 2. Intercambiar Firebase ID Token por JWT propio del backend
      const authResponse = await googleSignInApi(firebaseIdToken);

      // 3. Guardar tokens y navegar
      await setTokens(authResponse.accessToken, authResponse.refreshToken);
      setUser(authResponse.user);
    } catch (err: any) {
      // Cancelación explícita del usuario (presionó "Atrás" en selector de cuenta)
      if (err.code === 'SIGN_IN_CANCELLED') {
        return;
      }
      // Error de red o token inválido
      setError(
        err?.response?.data?.message ??
        'No se pudo iniciar sesión con Google. Intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, handleGoogleSignIn };
};
```

---

### 1.6 Componente — `GoogleSignInButton.tsx`

**Archivo:** `src/components/auth/GoogleSignInButton.tsx`

```typescript
import React from 'react';
import {
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

interface Props {
  onPress: () => void;
  loading?: boolean;
  label?: string;
}

export const GoogleSignInButton: React.FC<Props> = ({
  onPress,
  loading = false,
  label = 'Continuar con Google',
}) => (
  <TouchableOpacity
    style={styles.button}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator color="#757575" size="small" />
    ) : (
      <View style={styles.content}>
        <Image
          source={require('../../assets/icons/google-logo.png')}
          style={styles.logo}
        />
        <Text style={styles.label}>{label}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    color: '#3C4043',
    fontWeight: '500',
  },
});
```

> **Asset:** Descargar el logo oficial de Google en `src/assets/icons/google-logo.png`.  
> Dimensiones recomendadas: 48×48px o 96×96px.

---

### 1.7 Integrar en pantallas de Login y Registro

**Pantalla Login** (modificar archivo existente):

```typescript
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { useGoogleSignIn } from '../../hooks/auth/useGoogleSignIn';

// Dentro del componente:
const { loading: googleLoading, error: googleError, handleGoogleSignIn } = useGoogleSignIn();

// En el JSX, después del formulario de email/contraseña y antes del link de "¿No tienes cuenta?":
<View style={styles.dividerContainer}>
  <View style={styles.divider} />
  <Text style={styles.dividerText}>o</Text>
  <View style={styles.divider} />
</View>

<GoogleSignInButton
  onPress={handleGoogleSignIn}
  loading={googleLoading}
/>

{googleError && (
  <Text style={styles.errorText}>{googleError}</Text>
)}
```

**Pantalla Registro:** Mismo patrón — el backend maneja automáticamente si es registro o login.

---

### 1.8 Logout — incluir Google Sign-Out

**Archivo:** donde manejes el logout (store/hook existente)

```typescript
import { signOutGoogle } from '../services/auth/googleAuthService';

const logout = async () => {
  // 1. Revocar tokens en el backend (endpoint existente)
  await authApi.logout(accessToken, refreshToken);

  // 2. Limpiar estado de Google (si el usuario usó Google Sign-In)
  await signOutGoogle();

  // 3. Limpiar store local
  clearAuthStore();
};
```

---

### ✅ Checklist Sprint 1

- [ ] `google-services.json` / `GoogleService-Info.plist` actualizados con Google Auth habilitado
- [ ] `@react-native-google-signin/google-signin` instalado y funcionando
- [ ] `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` configurado en `.env`
- [ ] `googleAuthService.ts` implementado
- [ ] `useGoogleSignIn` hook funcional
- [ ] `GoogleSignInButton` componente renderiza correctamente
- [ ] Login con Google funciona end-to-end en Android
- [ ] Login con Google funciona end-to-end en iOS
- [ ] Logout limpia el estado de Google

---

## Sprint 2 — Reset de Contraseña + Verificación de Email

**Objetivo:** Flujos completos de recuperación de cuenta y verificación de email.  
**Duración estimada:** 2 días

---

### 2.1 Pantalla — `ForgotPasswordScreen.tsx`

**Archivo:** `src/screens/auth/ForgotPasswordScreen.tsx`

**Flujo UX:**
```
1. Input: "Ingresa tu email"
2. CTA: "Enviar instrucciones"
3. → POST /v1/auth/password-reset/request
4. Mostrar: "Si el email está registrado, recibirás instrucciones en unos minutos."
   (siempre el mismo mensaje — el backend no confirma si existe o no)
5. Link: "Volver al inicio de sesión"
```

> **Caso especial:** Si el backend retorna `"Cuenta vinculada con Google"`, mostrar:  
> `"Esta cuenta usa Google Sign-In. Inicia sesión con el botón de Google."`

---

### 2.2 Pantalla — `ResetPasswordScreen.tsx`

**Archivo:** `src/screens/auth/ResetPasswordScreen.tsx`

Esta pantalla se abre desde un **deep link** o desde un parámetro en la URL.

**Flujo UX:**
```
1. El usuario toca el enlace del email → abre la app
2. Extraer `token` de los params de navegación / deep link
3. Formulario: "Nueva contraseña" + "Confirmar contraseña"
4. Validación local: mínimo 8 chars, coinciden
5. CTA: "Guardar contraseña"
6. → POST /v1/auth/password-reset/confirm { token, newPassword }
7. Éxito → navegar a Login con banner "Contraseña actualizada correctamente"
8. Error (expirado/usado) → mostrar error con link "Solicitar nuevo enlace"
```

---

### 2.3 Configurar Deep Links

**Archivo:** `app.json` o `app.config.js`

```json
{
  "expo": {
    "scheme": "parlando",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [{ "scheme": "parlando" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

**Archivo:** `src/navigation/linking.ts`

```typescript
export const linking = {
  prefixes: ['parlando://', 'https://api.parlando.app'],
  config: {
    screens: {
      ResetPassword: 'api/v1/auth/password-reset/confirm',
      VerifyEmail: 'api/v1/auth/verify-email',
    },
  },
};
```

> El backend en `GET /v1/auth/verify-email?token=xxx` puede devolver un redirect al scheme `parlando://verify-email?token=xxx` para que la app lo maneje nativamente.

---

### 2.4 Banner — "Verifica tu email"

Mostrar después del registro si `emailVerified = false` en el perfil del usuario.

**Archivo:** `src/components/profile/EmailVerificationBanner.tsx`

```typescript
// Banner no bloqueante (puede descartarse)
// Aparece en: HomeScreen, ProfileScreen
// CTA: "Reenviar email" → POST /v1/auth/verify-email/send (con JWT)
```

**Lógica:**
- El banner desaparece cuando `user.emailVerified = true`
- Debounce en el botón "Reenviar" (ej: 60 segundos entre envíos)
- No mostrar para usuarios con `provider = 'GOOGLE'` (su email ya está verificado)

---

### 2.5 API calls — `authApi.ts` (ampliar)

```typescript
/** Solicita email de reset de contraseña. */
export const requestPasswordReset = async (email: string): Promise<void> => {
  await apiClient.post('/v1/auth/password-reset/request', { email });
};

/** Confirma el reset de contraseña con el token del email. */
export const confirmPasswordReset = async (
  token: string,
  newPassword: string
): Promise<void> => {
  await apiClient.post('/v1/auth/password-reset/confirm', { token, newPassword });
};

/** Solicita reenvío de email de verificación (requiere JWT). */
export const resendEmailVerification = async (): Promise<void> => {
  await apiClient.post('/v1/auth/verify-email/send');
};
```

---

### 2.6 `ForgotPassword` link en LoginScreen

**Archivo:** `src/screens/auth/LoginScreen.tsx`

Agregar debajo del campo de contraseña:

```typescript
<TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
  <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
</TouchableOpacity>
```

> Este link **solo aplica para usuarios con contraseña**. Para usuarios Google no es relevante, pero tampoco perjudica mostrarlo — el backend rechazará con mensaje descriptivo.

---

### ✅ Checklist Sprint 2

- [ ] `ForgotPasswordScreen` implementada con UX completo
- [ ] `ResetPasswordScreen` recibe token via deep link / params
- [ ] Deep links configurados en `app.json` y `linking.ts`
- [ ] `EmailVerificationBanner` no aparece para usuarios Google (`provider = 'GOOGLE'`)
- [ ] `EmailVerificationBanner` desaparece al refrescar perfil con `emailVerified = true`
- [ ] Botón "Reenviar" tiene debounce de 60 segundos
- [ ] Flujo completo probado: solicitar → recibir email → resetear → login

---

## Sprint 3 — Notificaciones de Viaje + Feedback Visual

**Objetivo:** UX completo de feedback para acciones que generan emails.  
**Duración estimada:** 1 día

---

### 3.1 Feedback visual post-acción

Para cada acción que dispara un email en el backend, mostrar confirmación visual en el frontend:

| Acción | Feedback |
|--------|----------|
| Registro exitoso | Toast/Banner: "¡Bienvenido! Revisa tu email para verificar tu cuenta." |
| Login con Google (nuevo usuario) | Toast: "¡Cuenta creada! Revisa tu email." |
| Reset contraseña solicitado | Pantalla dedicada con mensaje de confirmación |
| Reset contraseña confirmado | Toast en LoginScreen: "Contraseña actualizada correctamente" |
| Reserva confirmada | (Email enviado por backend) — Push notification + badge en reservas |
| Viaje cancelado | (Email enviado por backend) — Push notification + toast en app |

---

### 3.2 Componente — `Toast.tsx` (si no existe)

**Archivo:** `src/components/common/Toast.tsx`

Implementar un toast simple no bloqueante con variantes `success`, `error`, `info`.  
Alternativamente, usar una librería existente como `react-native-toast-message`.

```bash
npx expo install react-native-toast-message
```

---

### 3.3 Pantalla de perfil — mostrar estado de verificación

**Archivo:** `src/screens/profile/ProfileScreen.tsx` (modificar)

```typescript
// Mostrar badge o ícono según estado:
// emailVerified = false → ícono ⚠️ amarillo con texto "Email no verificado"
// emailVerified = true  → ícono ✅ verde
// provider = 'GOOGLE'   → ícono de Google con texto "Cuenta Google"
```

---

### 3.4 Actualización del User store post-Google Sign-In

**Archivo:** `src/store/authStore.ts` (o equivalente)

Asegurarse de que el store guarda y expone los nuevos campos del backend:
- `provider: 'LOCAL' | 'GOOGLE'`
- `emailVerified: boolean`

Esto permite condicionar UI en múltiples pantallas sin llamadas extra al backend.

---

### ✅ Checklist Sprint 3

- [ ] Toast de bienvenida al registrarse (email o Google)
- [ ] Toast de confirmación al resetear contraseña
- [ ] `ProfileScreen` muestra estado de verificación del email
- [ ] `ProfileScreen` muestra ícono de Google para cuentas `provider=GOOGLE`
- [ ] `user.provider` y `user.emailVerified` guardados en el store

---

## Sprint 4 — Tests + Edge Cases

**Objetivo:** Robustez ante fallos de red, tokens expirados y casos borde.  
**Duración estimada:** 1 día

---

### 4.1 Edge cases Google Sign-In

| Caso | Comportamiento esperado |
|------|------------------------|
| Usuario cancela selector de cuenta Google | Sin error (capturar `SIGN_IN_CANCELLED`) |
| Google Play Services no disponible (Android antiguo) | Mensaje: "Actualiza Google Play Services" |
| Sin conexión a internet | Toast de error de red |
| Token Firebase expirado (>1h sin usar) | `getIdToken(true)` fuerza refresh automático |
| Cuenta Google bloqueada en el backend | Mostrar mensaje del backend |

---

### 4.2 Edge cases Reset de contraseña

| Caso | Comportamiento esperado |
|------|------------------------|
| Token expirado en deep link | Pantalla de error con "Solicitar nuevo enlace" |
| Token ya utilizado | Mismo que expirado |
| App cerrada al abrir deep link | Navegar correctamente a `ResetPasswordScreen` |
| Contraseñas no coinciden (validación local) | Error bajo el input antes de llamar al backend |

---

### 4.3 Interceptor de `apiClient` para refresh token

Verificar que el interceptor de Axios/Fetch renueva el access token si recibe `401` durante las llamadas autenticadas (ej: reenvío de verificación de email).

```typescript
// En apiClient.ts — interceptor de respuesta:
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await refreshAccessToken(); // usa refresh token almacenado
      error.config.headers['Authorization'] = `Bearer ${newToken}`;
      return apiClient(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

### 4.4 Tests con Jest + React Native Testing Library

**Archivos a crear:**

- `__tests__/hooks/useGoogleSignIn.test.ts`
  - Mock `signInWithGoogle` → verifica que se llama a `googleSignInApi` con el token
  - Mock error `SIGN_IN_CANCELLED` → verifica que no se muestra error
  - Mock error de red → verifica que `error` state se populea

- `__tests__/screens/ForgotPasswordScreen.test.tsx`
  - Renderiza campos correctamente
  - Muestra mensaje de confirmación al enviar
  - Maneja error de cuenta Google

- `__tests__/components/GoogleSignInButton.test.tsx`
  - Renderiza con label correcto
  - Muestra spinner en `loading=true`

---

### ✅ Checklist Sprint 4

- [ ] Cancelación de Google Sign-In no muestra error al usuario
- [ ] Deep link de reset funciona con app cerrada y abierta
- [ ] Interceptor de refresh token funciona en llamadas autenticadas
- [ ] Tests unitarios de hooks y componentes pasan
- [ ] Probado en dispositivo físico iOS y Android (no solo simulador)

---

## Consideraciones finales

### Seguridad frontend
- **No almacenar** el `firebaseIdToken` en AsyncStorage — es temporal y solo se usa en el intercambio con el backend.
- El `accessToken` del backend (JWT propio) sí se almacena en SecureStore (`expo-secure-store`), no en AsyncStorage.
- El `firebaseIdToken` expira en **1 hora** — siempre llamar `getIdToken()` fresco antes de enviarlo al backend.

### UX — Usuarios sin contraseña (solo Google)
- Ocultar o deshabilitar la opción "Cambiar contraseña" en configuración de perfil para `provider = 'GOOGLE'`.
- Si intenta cambiar contraseña, mostrar: `"Tu cuenta está vinculada con Google. Gestiona tu contraseña desde Google."`

### Internacionalización
- Los mensajes de error del backend están en español (`"Token de Google invalido"`, etc.) — asegurarse de que el frontend los muestre directamente o los mapee a claves de i18n.

### Icono de Google
- Usar el logo oficial de Google (no recrearlo con CSS/SVG personalizado) — cumple las brandguidelines de Google.
- Link para descargar: [Google Brand Resource Center](https://about.google/brand-resource-center/)

