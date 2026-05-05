# Plan de Implementación: Sistema de Notificaciones Push con Firebase

> **App:** ParlAndo — Carpooling para Latinoamérica  
> **Stack:** Expo SDK 54 · React Native 0.81 · Zustand v5 · expo-notifications (ya instalado)  
> **Estado actual:** `expo-notifications` configurado en `app.json`; UI de toggles en settings existe pero sin integración real. Firebase **no instalado**.

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE (Expo)                        │
│                                                              │
│  ┌──────────────┐    ┌─────────────────┐   ┌─────────────┐  │
│  │  Pantallas   │───▶│ NotificationSvc │──▶│ Zustand     │  │
│  │  (app/)      │    │ (lib/)          │   │ Store       │  │
│  └──────────────┘    └────────┬────────┘   └─────────────┘  │
│                               │                              │
│                    ┌──────────▼──────────┐                   │
│                    │  expo-notifications  │                   │
│                    │  (FCM on Android    │                   │
│                    │   APNs on iOS)      │                   │
│                    └──────────┬──────────┘                   │
└───────────────────────────────┼─────────────────────────────┘
                                │ FCM Token
                    ┌───────────▼───────────┐
                    │   Firebase Cloud       │
                    │   Messaging (FCM)      │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Backend (Railway)    │
                    │   /api/notifications   │
                    │   /api/devices         │
                    └───────────────────────┘
```

**Flujo general:**
1. Al iniciar sesión, el cliente solicita permiso de notificaciones y obtiene el **FCM token** vía `expo-notifications`.
2. El token se registra en el backend (`POST /api/devices`) junto al `userId` y plataforma.
3. El backend envía mensajes FCM a través de la **Firebase Admin SDK** cuando ocurren eventos del sistema.
4. El cliente maneja la notificación según el estado de la app (primer plano, fondo, cerrada) y navega a la pantalla correspondiente al tocarla.

---

## Stack Tecnológico

| Paquete | Versión | Rol |
|---|---|---|
| `expo-notifications` | ~0.32.x *(ya instalado)* | Registro de token, recepción y manejo de notificaciones |
| `expo-device` | ~7.x | Verificar que es dispositivo físico antes de registrar |
| `@react-native-async-storage/async-storage` | ya instalado | Cache local de notificaciones |
| `expo-router` | ~6.x *(ya instalado)* | Deep linking al tocar una notificación |
| **Firebase Admin SDK** | (backend) | Enviar notificaciones desde el servidor |

> **Nota de arquitectura:** Se usa `expo-notifications` como capa unificada (FCM en Android, APNs en iOS) en lugar de `@react-native-firebase/messaging` para mantener compatibilidad con el workflow Expo sin necesidad de builds nativas adicionales. Si en el futuro se requieren funciones avanzadas (analytics de notificaciones, in-app messaging), se puede migrar a React Native Firebase.

---

## Sprints

---

### Sprint 1 — Configuración e Infraestructura Firebase

**Objetivo:** Tener Firebase configurado, el token FCM registrado en el backend y el sistema básico de permisos funcionando.

**Duración estimada:** 1 semana

#### Tareas Frontend

- [ ] **1.1 Crear proyecto Firebase**
  - Crear proyecto en [Firebase Console](https://console.firebase.google.com/)
  - Registrar app Android (`com.parlando.app`) y iOS
  - Descargar `google-services.json` (Android) y `GoogleService-Info.plist` (iOS)
  - Colocar los archivos en las rutas estándar para Expo (`/android/app/` y `/ios/`)

- [ ] **1.2 Configurar `app.json`**
  ```json
  {
    "expo": {
      "android": {
        "googleServicesFile": "./google-services.json"
      },
      "ios": {
        "googleServicesFile": "./GoogleService-Info.plist"
      },
      "plugins": [
        ["expo-notifications", {
          "icon": "./assets/notification-icon.png",
          "color": "#007380",
          "sounds": []
        }]
      ]
    }
  }
  ```

- [ ] **1.3 Crear el módulo `src/lib/notifications.ts`**
  - Función `registerForPushNotifications()`:
    - Verificar que es dispositivo físico con `expo-device`
    - Solicitar permisos con `Notifications.requestPermissionsAsync()`
    - Obtener token Expo/FCM con `Notifications.getExpoPushTokenAsync()` o `Notifications.getDevicePushTokenAsync()`
    - Configurar canales de Android (ver sección Canales)
  - Función `unregisterPushToken()` para logout

- [ ] **1.4 Definir canales de notificación Android**

  | Canal ID | Nombre visible | Importancia | Descripción |
  |---|---|---|---|
  | `bookings` | Reservas | HIGH | Aceptaciones, rechazos, cancelaciones |
  | `trips` | Viajes | HIGH | Inicio, recordatorios, completaciones |
  | `chat` | Mensajes | HIGH | Mensajes nuevos de chat |
  | `subscriptions` | Suscripciones | DEFAULT | Cambios en suscripciones rutinarias |
  | `verifications` | Verificaciones | DEFAULT | Estado de verificación de docs/identidad |
  | `system` | Sistema | LOW | Mantenimiento, actualizaciones |

- [ ] **1.5 Agregar nuevo store Zustand: `src/stores/notifications-store.ts`**
  - Estado: `fcmToken`, `permissionsGranted`, `unreadCount`, `lastNotification`
  - Acciones: `setToken()`, `setPermissions()`, `incrementUnread()`, `resetUnread()`

- [ ] **1.6 Integrar registro en el flujo de login**
  - En `src/api/auth.ts` o en el store de auth, después de login exitoso, llamar a `registerForPushNotifications()`
  - En logout, llamar a `unregisterPushToken()` y hacer `DELETE /api/devices/:token`

#### Tareas Backend

- [ ] **1.7 Instalar Firebase Admin SDK**
  ```bash
  npm install firebase-admin
  ```

- [ ] **1.8 Crear endpoint `POST /api/devices`**
  ```
  Body: { token: string, platform: "android" | "ios", userId: string }
  ```
  - Upsert del token en tabla `device_tokens`
  - Esquema DB: `id, user_id, token, platform, created_at, updated_at, active`

- [ ] **1.9 Crear endpoint `DELETE /api/devices/:token`**
  - Marcar token como inactivo en DB (no eliminar, para auditoría)

- [ ] **1.10 Crear el módulo `NotificationService` en backend**
  - Método `send(userId, title, body, data)`: busca tokens activos del usuario y envía FCM
  - Método `sendMulticast(userIds[], title, body, data)`: envío masivo
  - Manejo de tokens expirados (FCM retorna `registration-token-not-registered`)

#### Criterios de aceptación
- El token FCM se registra correctamente en el backend al hacer login
- Los canales de Android están creados y visibles en configuración del dispositivo
- Al hacer logout el token se desactiva en el backend

---

### Sprint 2 — Servicio Central de Notificaciones (Cliente)

**Objetivo:** Implementar el manejador de notificaciones en el cliente con navegación automática al tocar una notificación y persistencia local.

**Duración estimada:** 1 semana

#### Tareas

- [ ] **2.1 Handler global en `app/_layout.tsx`**
  - `Notifications.setNotificationHandler()` para notificaciones en primer plano:
    ```ts
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    ```
  - Listener `addNotificationReceivedListener` — actualizar badge/unread count en store
  - Listener `addNotificationResponseReceivedListener` — navegar al tocar

- [ ] **2.2 Sistema de deep linking por tipo de notificación**

  | `data.type` en el payload FCM | Ruta de navegación |
  |---|---|
  | `booking.accepted` | `/trip/[tripId]` |
  | `booking.rejected` | `/my-trips` |
  | `booking.cancelled` | `/my-trips` |
  | `booking.new_request` | `/trip/[tripId]` (driver) |
  | `trip.started` | `/trip/[tripId]` |
  | `trip.completed` | `/trip/[tripId]` |
  | `chat.new_message` | `/chat/[tripId]` |
  | `subscription.paused` | `/subscription/[id]` |
  | `subscription.cancelled` | `/subscription/[id]` |
  | `subscription.resumed` | `/subscription/[id]` |
  | `routine.occurrence_reminder` | `/routine/[id]` |
  | `routine.cancelled` | `/my-trips` |
  | `verification.approved` | `/verification` |
  | `verification.rejected` | `/verification/submit` |
  | `student_verification.approved` | `/student-verification` |
  | `vehicle.verification_rejected` | `/vehicle/[id]` |
  | `waitlist.promoted` | `/subscription/new` |

- [ ] **2.3 Manejo de notificaciones recibidas con app cerrada**
  - En `app/index.tsx`, al montar, verificar `Notifications.getLastNotificationResponseAsync()`
  - Navegar a la ruta correspondiente si existe una notificación pendiente

- [ ] **2.4 Crear API module `src/api/notifications.ts`**
  ```ts
  registerDevice(token: string, platform: string): Promise<void>
  unregisterDevice(token: string): Promise<void>
  updatePreferences(preferences: NotificationPreferences): Promise<void>
  getPreferences(): Promise<NotificationPreferences>
  ```

- [ ] **2.5 Definir tipo `NotificationPreferences` en `src/types/api.ts`**
  ```ts
  type NotificationPreferences = {
    push_enabled: boolean
    bookings: boolean
    chat: boolean
    trips: boolean
    subscriptions: boolean
    verifications: boolean
    marketing: boolean
  }
  ```

#### Criterios de aceptación
- Una notificación recibida en primer plano muestra la alerta nativa
- Al tocar cualquier tipo de notificación, la app navega a la pantalla correcta
- Si la app estaba cerrada, la navegación ocurre al abrirla

---

### Sprint 3 — Notificaciones de Reservas (Bookings)

**Objetivo:** Notificar a pasajeros y conductores de todos los eventos de reservas en viajes urbanos e interurbanos.

**Duración estimada:** 1 semana

#### Casos de uso

| Evento | Quién recibe | Título | Cuerpo | Canal |
|---|---|---|---|---|
| Pasajero solicita reserva | **Conductor** | "Nueva solicitud de reserva" | "[Nombre] quiere unirse a tu viaje [origen → destino]" | `bookings` |
| Conductor acepta reserva | **Pasajero** | "¡Reserva confirmada!" | "Tu reserva para [origen → destino] fue aceptada. Viaje el [fecha]" | `bookings` |
| Conductor rechaza reserva | **Pasajero** | "Reserva no disponible" | "Tu solicitud para [origen → destino] fue rechazada" | `bookings` |
| Pasajero cancela reserva | **Conductor** | "Cancelación de reserva" | "[Nombre] canceló su reserva para [fecha]" | `bookings` |
| Conductor cancela viaje | **Todos los pasajeros** | "Viaje cancelado" | "El viaje [origen → destino] del [fecha] fue cancelado por el conductor" | `bookings` |
| Pasajero pasa a lista de espera | **Pasajero** | "En lista de espera" | "Estás en lista de espera para [origen → destino]. Te notificaremos si hay cupo" | `bookings` |
| Se libera cupo en lista de espera | **Primer en lista** | "¡Hay un cupo disponible!" | "Se liberó un asiento en [origen → destino] del [fecha]. Confirma tu reserva antes de que expire" | `bookings` |
| Recordatorio de viaje (24h antes) | **Pasajero + Conductor** | "Tu viaje es mañana" | "Recuerda que tienes un viaje [origen → destino] mañana a las [hora]" | `trips` |
| Conductor inicia viaje | **Pasajeros con reserva activa** | "¡El viaje comenzó!" | "Tu conductor [nombre] inició el viaje. Encuentra tu punto de encuentro." | `trips` |
| Viaje completado | **Todos los participantes** | "¡Llegaron!" | "El viaje [origen → destino] fue completado. ¿Cómo fue la experiencia? Califica tu viaje." | `trips` |

#### Tareas Backend

- [ ] **3.1** Disparar notificación al conductor en `POST /api/bookings` (nueva solicitud)
- [ ] **3.2** Disparar al pasajero en `PATCH /api/bookings/:id` con `status: ACCEPTED`
- [ ] **3.3** Disparar al pasajero en `PATCH /api/bookings/:id` con `status: REJECTED`
- [ ] **3.4** Disparar al conductor en `DELETE /api/bookings/:id` (cancelación pasajero)
- [ ] **3.5** Disparar a todos los pasajeros en `DELETE /api/trips/:id` (cancelación conductor)
- [ ] **3.6** Disparar al pasajero cuando es promovido de lista de espera
- [ ] **3.7** Job programado (cron) para recordatorios 24h antes del viaje
- [ ] **3.8** Disparar a pasajeros en `POST /api/trips/:id/start`
- [ ] **3.9** Disparar a todos los participantes en `POST /api/trips/:id/complete` con CTA para calificar

#### Tareas Frontend

- [ ] **3.10** Asegurarse que los deep links a `/trip/[id]` y `/my-trips` están funcionando correctamente desde el handler

---

### Sprint 4 — Notificaciones de Viajes Rutinarios y Suscripciones

**Objetivo:** Notificar cambios en suscripciones a rutas rutinarias, ocurrencias y eventos del ciclo de vida de rutas rutinarias.

**Duración estimada:** 1 semana

#### Casos de uso

| Evento | Quién recibe | Título | Cuerpo | Canal |
|---|---|---|---|---|
| Pasajero se suscribe a ruta rutinaria | **Conductor** | "Nueva suscripción" | "[Nombre] se suscribió a tu ruta [origen → destino]" | `subscriptions` |
| Suscripción aceptada por conductor | **Pasajero** | "¡Suscripción activa!" | "Tu suscripción a [origen → destino] fue aceptada. Empieza el [fecha]" | `subscriptions` |
| Suscripción rechazada por conductor | **Pasajero** | "Suscripción no disponible" | "El conductor rechazó tu solicitud para [origen → destino]" | `subscriptions` |
| Conductor pausa ruta rutinaria | **Todos los suscriptores** | "Ruta pausada temporalmente" | "La ruta [origen → destino] fue pausada por el conductor hasta nuevo aviso" | `subscriptions` |
| Conductor retoma ruta rutinaria | **Todos los suscriptores** | "¡La ruta se reactivó!" | "La ruta [origen → destino] está activa nuevamente. Tu próximo viaje es el [fecha]" | `subscriptions` |
| Conductor cancela ruta rutinaria permanentemente | **Todos los suscriptores** | "Ruta cancelada" | "La ruta [origen → destino] fue cancelada. Tus reservas futuras han sido liberadas" | `subscriptions` |
| Pasajero pausa su suscripción | **Conductor** | "Suscriptor en pausa" | "[Nombre] pausó su suscripción del [fecha inicio] al [fecha fin]" | `subscriptions` |
| Pasajero cancela su suscripción | **Conductor** | "Cancelación de suscripción" | "[Nombre] canceló su suscripción a tu ruta [origen → destino]" | `subscriptions` |
| Recordatorio de ocurrencia rutinaria (2h antes) | **Pasajero suscrito activo** | "Tu viaje rutinario en 2 horas" | "Recuerda que tienes viaje a [destino] hoy a las [hora]. Punto: [waypoint]" | `trips` |
| Ocurrencia cancelada por el conductor | **Pasajeros de esa ocurrencia** | "Viaje de hoy cancelado" | "El viaje de hoy [origen → destino] a las [hora] fue cancelado" | `subscriptions` |
| Auto-pausa por verificación de vehículo expirada | **Todos los suscriptores** | "Servicio temporalmente suspendido" | "La ruta [origen → destino] fue suspendida por un inconveniente con el vehículo del conductor" | `subscriptions` |
| Pasajero promovido de lista de espera en ruta rutinaria | **Pasajero** | "¡Cupo disponible en tu ruta!" | "Se liberó un cupo en la ruta [origen → destino]. Confirma tu suscripción." | `subscriptions` |

#### Tareas Backend

- [ ] **4.1** Notificación al conductor en `POST /api/routine-subscriptions`
- [ ] **4.2** Notificación al pasajero en `PATCH /api/routine-subscriptions/:id` con `status: ACTIVE`
- [ ] **4.3** Notificación al pasajero en `PATCH /api/routine-subscriptions/:id` con `status: REJECTED`
- [ ] **4.4** Notificación masiva a suscriptores cuando un `RoutineTrip` pasa a `status: PAUSED`
- [ ] **4.5** Notificación masiva cuando `RoutineTrip` vuelve a `status: ACTIVE`
- [ ] **4.6** Notificación masiva cuando `RoutineTrip` pasa a `status: CANCELLED`
- [ ] **4.7** Notificación al conductor cuando un pasajero pausa su suscripción
- [ ] **4.8** Notificación al conductor cuando un pasajero cancela su suscripción
- [ ] **4.9** Job cron para recordatorios de ocurrencias 2h antes
- [ ] **4.10** Notificación cuando una ocurrencia específica es cancelada
- [ ] **4.11** Notificación en flujo de auto-pausa por vehículo (PHASE4_BUSINESS_LOGIC)
- [ ] **4.12** Notificación de promoción de lista de espera en rutina

---

### Sprint 5 — Notificaciones de Chat

**Objetivo:** Notificar mensajes nuevos cuando el usuario tiene la app en segundo plano o cerrada, complementando el WebSocket ya implementado.

**Duración estimada:** 0.5 semanas

#### Contexto

El chat ya usa WebSocket en tiempo real (`src/lib/chat-ws.ts`). Las notificaciones push de chat solo aplican cuando:
- El usuario **no está en la pantalla del chat** en ese momento
- La app está en **fondo o cerrada**

El backend debe detectar si el destinatario tiene una sesión WebSocket activa antes de enviar push para evitar duplicados.

#### Casos de uso

| Evento | Quién recibe | Título | Cuerpo | Canal |
|---|---|---|---|---|
| Mensaje nuevo en chat de viaje | **Destinatario** (sin sesión WS activa) | "[Nombre del remitente]" | "[Primeros 80 caracteres del mensaje]" | `chat` |
| Primer mensaje en conversación nueva | **Destinatario** | "Nuevo mensaje de [Nombre]" | "[Nombre] te escribió sobre el viaje [origen → destino]" | `chat` |

#### Tareas Backend

- [ ] **5.1** Al guardar un mensaje, verificar si el destinatario tiene sesión WS activa en la sala
- [ ] **5.2** Si no tiene sesión activa → disparar notificación push via FCM
- [ ] **5.3** El payload debe incluir `data.type: "chat.new_message"` y `data.tripId`

#### Tareas Frontend

- [ ] **5.4** Al entrar a la pantalla de chat (`/chat/[tripId]`), marcar conversación como "leída" y actualizar badge
- [ ] **5.5** La notificación push de chat NO debe mostrarse si el usuario ya está en `/chat/[tripId]` correspondiente (suprimir localmente)

---

### Sprint 6 — Notificaciones de Verificaciones y Administración

**Objetivo:** Notificar al usuario el resultado de verificaciones de identidad, estudiantil y de vehículo, así como acciones administrativas sobre su cuenta.

**Duración estimada:** 0.5 semanas

#### Casos de uso

| Evento | Quién recibe | Título | Cuerpo | Canal |
|---|---|---|---|---|
| Verificación de identidad aprobada | **Usuario** | "¡Identidad verificada!" | "Tu documento fue verificado exitosamente. Ya puedes disfrutar de todos los beneficios de ParlAndo" | `verifications` |
| Verificación de identidad rechazada | **Usuario** | "Verificación rechazada" | "Tu documento no pudo ser verificado. Revisa los requisitos e intenta nuevamente" | `verifications` |
| Verificación estudiantil aprobada | **Pasajero** | "¡Verificación estudiantil activa!" | "Tu carnet universitario fue verificado. Ya tienes acceso a tarifas estudiantiles" | `verifications` |
| Verificación estudiantil rechazada | **Pasajero** | "Verificación estudiantil rechazada" | "Tu carnet no pudo ser verificado. Asegúrate de que sea legible y esté vigente" | `verifications` |
| Verificación de vehículo aprobada | **Conductor** | "¡Vehículo verificado!" | "Tu vehículo [placa] fue aprobado. Ya puedes publicar viajes con él" | `verifications` |
| Verificación de vehículo rechazada | **Conductor** | "Documento de vehículo rechazado" | "Los documentos de tu vehículo [placa] tienen observaciones. Toca para ver los detalles" | `verifications` |
| Documento de vehículo próximo a vencer (30 días) | **Conductor** | "Documento próximo a vencer" | "El [SOAT/Tecnomecánica] de tu vehículo [placa] vence en 30 días. Actualízalo para seguir activo" | `verifications` |
| Cuenta suspendida por moderador | **Usuario** | "Cuenta suspendida" | "Tu cuenta fue suspendida temporalmente. Contáctanos en soporte@parlando.app si crees que es un error" | `system` |
| Cuenta reactivada | **Usuario** | "Cuenta reactivada" | "Tu cuenta ha sido reactivada. Bienvenido de vuelta a ParlAndo" | `system` |

#### Tareas Backend

- [ ] **6.1** Notificación en `PATCH /api/verifications/:id` con `status: VERIFIED / REJECTED`
- [ ] **6.2** Notificación en `PATCH /api/student-verifications/:id` con `status: VERIFIED / REJECTED`
- [ ] **6.3** Notificación en aprobación/rechazo de vehículo
- [ ] **6.4** Job cron para documentos de vehículo próximos a vencer (verificar diariamente, notificar a 30 y 7 días)
- [ ] **6.5** Notificación en cambio de `UserStatus` a `SUSPENDED / ACTIVE`

---

### Sprint 7 — Preferencias de Notificaciones

**Objetivo:** Conectar los toggles de settings (ya en la UI) con la lógica real de habilitación/deshabilitación por categoría.

**Duración estimada:** 0.5 semanas

#### Tareas Frontend

- [ ] **7.1** Actualizar `src/components/settings/NotificationsSection.tsx`
  - Cargar preferencias desde el backend al montar (`GET /api/notifications/preferences`)
  - Persistir en store de notificaciones
  - Al cambiar toggle → `PATCH /api/notifications/preferences`
  - Agregar toggles granulares por categoría (reservas, viajes, chat, suscripciones, verificaciones)

- [ ] **7.2** Al recibir notificación en el cliente, verificar preferencias locales antes de mostrar alert
  - Para notificaciones críticas (suspensión de cuenta, cancelación de viaje) ignorar preferencias y siempre mostrar

- [ ] **7.3** Manejo de revocación de permisos del sistema
  - Si el usuario revocó permisos en el SO → mostrar banner en settings con link a configuración del SO

#### Tareas Backend

- [ ] **7.4** Endpoint `GET /api/notifications/preferences`
- [ ] **7.5** Endpoint `PATCH /api/notifications/preferences`
  - Guardar preferencias en DB por usuario
  - Al enviar notificación, verificar preferencias del destinatario antes de hacer llamada FCM

---

## Matriz Completa de Notificaciones

| # | Evento | Disparador | Destinatario | Canal | Crítica* |
|---|---|---|---|---|---|
| 1 | Nueva solicitud de reserva | Pasajero hace booking | Conductor | bookings | No |
| 2 | Reserva aceptada | Conductor acepta | Pasajero | bookings | **Sí** |
| 3 | Reserva rechazada | Conductor rechaza | Pasajero | bookings | **Sí** |
| 4 | Pasajero cancela reserva | Pasajero cancela | Conductor | bookings | No |
| 5 | Conductor cancela viaje | Conductor cancela | Todos los pasajeros | bookings | **Sí** |
| 6 | Cupo disponible (lista espera) | Booking cancelado | Primer en lista | bookings | **Sí** |
| 7 | Recordatorio de viaje 24h | Cron job | Conductor + Pasajeros | trips | No |
| 8 | Conductor inicia viaje | Trip start | Pasajeros activos | trips | **Sí** |
| 9 | Viaje completado + CTA calificación | Trip complete | Conductor + Pasajeros | trips | No |
| 10 | Nueva suscripción a ruta | Pasajero subscribe | Conductor | subscriptions | No |
| 11 | Suscripción aceptada | Conductor acepta | Pasajero | subscriptions | **Sí** |
| 12 | Suscripción rechazada | Conductor rechaza | Pasajero | subscriptions | **Sí** |
| 13 | Ruta pausada por conductor | Driver pausa ruta | Todos los suscriptores | subscriptions | **Sí** |
| 14 | Ruta reactivada | Driver reactiva | Todos los suscriptores | subscriptions | **Sí** |
| 15 | Ruta cancelada permanentemente | Driver cancela | Todos los suscriptores | subscriptions | **Sí** |
| 16 | Pasajero pausa suscripción | Pasajero pausa | Conductor | subscriptions | No |
| 17 | Pasajero cancela suscripción | Pasajero cancela | Conductor | subscriptions | No |
| 18 | Recordatorio ocurrencia 2h | Cron job | Pasajeros activos | trips | No |
| 19 | Ocurrencia cancelada | Driver cancela ocurrencia | Pasajeros de esa ocurrencia | subscriptions | **Sí** |
| 20 | Auto-pausa por vehículo | Sistema | Todos los suscriptores | subscriptions | **Sí** |
| 21 | Promoción lista de espera (rutina) | Suscripción cancelada | Siguiente en espera | subscriptions | **Sí** |
| 22 | Mensaje nuevo en chat | Mensaje enviado | Destinatario (sin WS) | chat | No |
| 23 | Primera vez en conversación | Primer mensaje | Destinatario | chat | No |
| 24 | Verificación identidad aprobada | Admin aprueba | Usuario | verifications | No |
| 25 | Verificación identidad rechazada | Admin rechaza | Usuario | verifications | No |
| 26 | Verificación estudiantil aprobada | Admin aprueba | Pasajero | verifications | No |
| 27 | Verificación estudiantil rechazada | Admin rechaza | Pasajero | verifications | No |
| 28 | Vehículo verificado | Admin aprueba | Conductor | verifications | No |
| 29 | Documentos de vehículo rechazados | Admin rechaza | Conductor | verifications | No |
| 30 | Documento vehículo vence en 30 días | Cron job | Conductor | verifications | No |
| 31 | Documento vehículo vence en 7 días | Cron job | Conductor | verifications | No |
| 32 | Cuenta suspendida | Moderador suspende | Usuario | system | **Sí** |
| 33 | Cuenta reactivada | Moderador reactiva | Usuario | system | **Sí** |

> **\*Crítica:** Las notificaciones marcadas como críticas se envían independientemente de las preferencias del usuario configuradas en settings.

---

## Estructura de Archivos Nuevos

```
src/
├── api/
│   └── notifications.ts          # registerDevice, unregisterDevice, preferences
├── lib/
│   └── notifications.ts          # registerForPushNotifications, handlers, deep linking
├── stores/
│   └── notifications-store.ts    # Zustand store: token, permissions, unread count
└── types/
    └── api.ts                    # Agregar: NotificationPreferences, DeviceToken types
```

---

## Cambios en Archivos Existentes

| Archivo | Cambio |
|---|---|
| `app/_layout.tsx` | Agregar handlers globales (`setNotificationHandler`, listeners) |
| `app/index.tsx` | Verificar `getLastNotificationResponseAsync` para cold start |
| `src/stores/auth-store.ts` | Llamar a `registerForPushNotifications()` post-login y `unregisterPushToken()` en logout |
| `src/components/settings/NotificationsSection.tsx` | Conectar toggles a API de preferencias |
| `app.json` | Agregar `googleServicesFile` y `GoogleService-Info.plist` |

---

## Variables de Entorno Nuevas

```bash
# Frontend (app cliente)
# No se necesitan vars adicionales si se usa expo-notifications (el token se obtiene vía SDK)

# Backend
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
# O bien, usar el archivo de credenciales:
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
```

---

## Esquema de Base de Datos Nuevo (Backend)

```sql
-- Tabla de tokens de dispositivos
CREATE TABLE device_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  platform     VARCHAR(10) NOT NULL CHECK (platform IN ('android', 'ios')),
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_active  ON device_tokens(active);

-- Tabla de preferencias de notificaciones
CREATE TABLE notification_preferences (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  push_enabled   BOOLEAN NOT NULL DEFAULT true,
  bookings       BOOLEAN NOT NULL DEFAULT true,
  chat           BOOLEAN NOT NULL DEFAULT true,
  trips          BOOLEAN NOT NULL DEFAULT true,
  subscriptions  BOOLEAN NOT NULL DEFAULT true,
  verifications  BOOLEAN NOT NULL DEFAULT true,
  marketing      BOOLEAN NOT NULL DEFAULT false,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Consideraciones de Seguridad

- **Tokens FCM son sensibles**: almacenar siempre en el backend con acceso autenticado (requiere JWT válido para registro/eliminación).
- **No exponer Firebase Admin credentials** en el cliente. El envío de notificaciones siempre es server-side.
- **Validar `userId`** al registrar un token: el token solo puede asociarse al usuario autenticado (extraer del JWT del request, no del body).
- **Limpiar tokens expirados**: FCM devuelve `registration-token-not-registered` para tokens inválidos → marcarlos como `active = false` automáticamente.
- **Rate limiting** en el endpoint de registro de devices para evitar abusos.

---

## Orden de Ejecución Recomendado

```
Sprint 1 → Sprint 2 → Sprint 3 → Sprint 4 → Sprint 5 → Sprint 6 → Sprint 7
   ↑               ↑
Prerequisito    Prerequisito
para todo       para todo
lo demás        lo demás
```

Los Sprints 5 y 6 pueden desarrollarse en paralelo con el Sprint 4 una vez que Sprint 2 esté completo.
