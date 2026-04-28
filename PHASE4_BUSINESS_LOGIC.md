# Fase 4 — Viajes Rutinarios: Lógica de Negocio Completa
> Documento de referencia para backend y frontend  
> Cubre todas las entidades, estados, condiciones, variantes y flujos de la modalidad de viajes rutinarios/universitarios

---

## 1. Concepto y propósito

Los viajes rutinarios están diseñados para personas que realizan el mismo trayecto de forma periódica hacia un destino institucional fijo (universidad, empresa, oficina). A diferencia de un viaje interurbano que se reserva puntualmente, aquí el pasajero **se suscribe a una ruta** y el sistema gestiona automáticamente la generación de viajes y reservas para cada día de operación.

**Características que los diferencian de otros tipos de viaje:**
- La ruta y el horario son fijos y repetibles
- El pasajero debe llegar a su destino **antes de una hora límite** (`required_arrival_time`)
- El pasajero puede ser recogido en un punto intermedio de la ruta, no necesariamente en el origen
- El conductor no necesita definir puntos de parada con anticipación; los pasajeros pueden **sugerir su propio punto de recogida** dentro de un rango de desviación aceptable
- La relación conductor–pasajero es continua y de confianza creciente

---

## 2. Modelo conceptual — tres niveles

```
RoutineTrip  (plantilla — la define el conductor una sola vez)
    │
    ├── RoutineTripWaypoint[]   (paradas predefinidas opcionales)
    │
    └── TripOccurrence[]       (un Trip generado por cada fecha de operación)
            │                  trip_type = ROUTINE, heredado de la plantilla
            │
            └── Booking[]      (una reserva por cada suscriptor activo en esa ocurrencia)

RoutineSubscription  (suscripción del pasajero a la plantilla)
    │
    └── genera Booking en cada TripOccurrence dentro del período suscrito
```

**Principio clave:** `RoutineTrip` define el *qué y cuándo*. `TripOccurrence` es la ejecución real en una fecha concreta. `RoutineSubscription` es el contrato entre conductor y pasajero que existe por encima de las ocurrencias individuales.

---

## 3. Entidad `RoutineTrip` — la plantilla

### 3.1 Campos y semántica

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único |
| `driverId` | UUID | Conductor propietario |
| `vehicleId` | UUID | Vehículo asignado a esta plantilla |
| `originName` / `originSubtitle` | String | Nombre y contexto del punto de inicio |
| `originLatitude` / `originLongitude` | Double | Coordenadas del origen |
| `destinationName` / `destinationSubtitle` | String | Nombre y contexto del destino |
| `destinationLatitude` / `destinationLongitude` | Double | Coordenadas del destino |
| `universityId` | UUID? | Si el destino es una universidad del catálogo |
| `studentsOnly` | Boolean | Solo pasajeros con verificación estudiantil activa |
| `departureTime` | Time | Hora de salida (sin fecha — ej. `06:30`) |
| `requiredArrivalTime` | Time | Hora límite de llegada al destino (ej. `07:30`) |
| `recurrenceDays` | String[] | Días de operación: `[MON, TUE, WED, THU, FRI]` |
| `validFrom` | Date | Fecha de inicio de vigencia |
| `validUntil` | Date? | Fecha de fin de vigencia (`null` = indefinido) |
| `availableSeats` | Int | Cupos disponibles por ocurrencia |
| `pricePerSeat` | Decimal | Precio por cupo |
| `currency` | String | Moneda (default `COP`) |
| `allowsLuggage` | Boolean | Si acepta equipaje |
| `allowsCustomPickup` | Boolean | Si los pasajeros pueden sugerir puntos personalizados |
| `maxPickupDeviationMeters` | Int | Máxima desviación aceptable del punto sugerido (default 500m) |
| `maxTimeOverheadSeconds` | Int | Máximo tiempo extra aceptable por el desvío (default 300s = 5 min) |
| `autoApproveBookings` | Boolean | Si las suscripciones se aprueban automáticamente |
| `routeLine` | Geometry | Polilínea de la ruta base (LINESTRING PostGIS) |
| `status` | Enum | Estado actual de la plantilla |

### 3.2 Estados de `RoutineTrip`

```
DRAFT ──────────► ACTIVE ──────────► PAUSED ──────────► ACTIVE
  │                  │                                      │
  │                  └──────────────► COMPLETED             │
  │                  │                                      │
  └──────────────────┴──────────────► CANCELLED ────────────┘
```

| Transición | Quién la ejecuta | Condición |
|---|---|---|
| `DRAFT → ACTIVE` | Conductor | Vehículo con SOAT vigente; `departureTime + duración estimada ≤ requiredArrivalTime`; ruta con `routeLine` definido |
| `ACTIVE → PAUSED` | Conductor | Manual; por rango de fechas opcional |
| `ACTIVE → PAUSED` | Sistema | SOAT del vehículo vence |
| `PAUSED → ACTIVE` | Conductor | Reactivación manual después de resolver la causa |
| `ACTIVE → COMPLETED` | Conductor / Sistema | Al llegar a `validUntil` |
| `DRAFT/ACTIVE/PAUSED → CANCELLED` | Conductor / Admin | Cancelación definitiva |

**Efectos de cada transición:**
- `DRAFT → ACTIVE`: el sistema genera ocurrencias (`TripOccurrence`) para los próximos 14 días según `recurrenceDays`
- `ACTIVE → PAUSED`: ocurrencias futuras sin bookings se cancelan; las que tienen bookings activos se respetan
- `ACTIVE/PAUSED → CANCELLED`: todas las ocurrencias futuras se cancelan junto con sus bookings; suscriptores notificados
- `PAUSED → ACTIVE`: se reanudan la generación de ocurrencias para los próximos 14 días

### 3.3 Reglas de validación al crear/publicar

1. El conductor no puede tener dos `RoutineTrip` en estado `ACTIVE` con el mismo destino y `departureTime` solapado (±30 min).
2. `recurrenceDays` no puede estar vacío.
3. `validFrom` no puede ser anterior a la fecha actual.
4. Si `studentsOnly = true`, `universityId` es obligatorio.
5. `requiredArrivalTime` debe ser mayor que `departureTime`.
6. Al publicar: el sistema valida internamente que la duración estimada de la ruta (calculada sobre `routeLine`) deja margen antes de `requiredArrivalTime`. Si no hay margen → error con mensaje de acción: *"La ruta estimada llega a las HH:MM, posterior a la hora límite de HH:MM"*.
7. Al cambiar `vehicleId` en un `RoutineTrip ACTIVE`: se valida SOAT y capacidad del nuevo vehículo antes de aplicar el cambio.

---

## 4. Waypoints predefinidos — `RoutineTripWaypoint`

Son los puntos de parada que el conductor define opcionalmente en su plantilla. Son análogos a `RouteWaypoint` pero ligados a la plantilla, no a una ocurrencia concreta.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | — |
| `routineTripId` | UUID | Plantilla a la que pertenece |
| `orderIndex` | Int | Orden en la ruta |
| `latitude` / `longitude` | Double | Coordenadas |
| `name` / `subtitle` | String | Nombre y contexto del punto |
| `isPickupPoint` | Boolean | Si es un punto de recogida disponible para pasajeros |
| `estimatedMinutesOffset` | Int | Minutos desde `departureTime` en que el conductor pasa por aquí |
| `applicableDays` | String[]? | Días de recurrencia en los que aplica este waypoint. `null` = todos los días de la plantilla. Subconjunto de `routineTrip.recurrenceDays`. |

**Reglas:**
- En estado `DRAFT`: se pueden agregar, eliminar y reordenar libremente.
- En estado `ACTIVE`:
  - **Agregar:** permitido. El nuevo waypoint se propaga inmediatamente a todas las ocurrencias futuras publicadas (`departure_at > NOW()`). Si tiene `applicableDays`, solo se propaga a ocurrencias cuyo día de semana esté en ese conjunto.
  - **Eliminar:** no permitido (podría invalidar suscripciones con `pickupType = WAYPOINT` que referencian el waypoint).
  - **Reordenar:** permitido. El nuevo orden se propaga a las ocurrencias futuras publicadas, actualizando `order_index` en los `RouteWaypoint` correspondientes. Las suscripciones con `pickupType = WAYPOINT` mantienen su `pickupWaypointId` sin cambios; solo varía el momento en que el conductor pasa por ese punto.
- Al generarse una `TripOccurrence`, el sistema copia los waypoints de la plantilla como `RouteWaypoint`s, calculando `estimatedArrival = occurrenceDate + departureTime + estimatedMinutesOffset`. Si un waypoint tiene `applicableDays`, solo se copia si el día de la ocurrencia está incluido.

**Propagación de reorden — mecanismo:**
La tabla `route_waypoints` incluye `routine_trip_waypoint_id` (FK nullable hacia `routine_trip_waypoints`). Al copiar waypoints de la plantilla a una ocurrencia, este campo queda poblado. Al reordenar en `ACTIVE`, el sistema actualiza `order_index` en `route_waypoints` filtrando por `routine_trip_waypoint_id`, sin tocar waypoints custom de pasajeros (`routine_trip_waypoint_id IS NULL`).

**Promoción de punto sugerido a waypoint con applicable_days:**
Si el conductor acepta un punto personalizado (`ACCEPTED_CUSTOM`) de un suscriptor y quiere que esté disponible para otros pasajeros en los mismos días, puede llamar al endpoint de agregar waypoint con `applicableDays = subscribedDays` de esa suscripción. La suscripción original **no** migra automáticamente a `WAYPOINT`; permanece `ACCEPTED_CUSTOM`. El nuevo waypoint beneficia a futuros suscriptores que lo seleccionen explícitamente.

**Validación de `applicableDays`:** debe ser subconjunto no vacío de `routineTrip.recurrenceDays`. Error si se envían días que la plantilla no opera.

**Implicación para el frontend:** Si el conductor no define waypoints, la UI debe presentar al pasajero la opción de sugerir un punto personalizado o seleccionar el origen del viaje (ver sección 7).

---

## 5. Generación de ocurrencias (`TripOccurrence`)

### 5.1 Qué es una ocurrencia

Una `TripOccurrence` es un registro `Trip` normal con `tripType = ROUTINE` y un campo adicional `routineTripId` que apunta a su plantilla. Desde la perspectiva del modelo de ejecución (conductor inicia viaje, pasajeros abordan, viaje se completa), se comporta exactamente igual que cualquier otro `Trip`.

### 5.2 Lógica de generación

- Un scheduler corre **diariamente a las 02:00** y genera ocurrencias para todos los `RoutineTrip` en estado `ACTIVE`.
- La ventana de generación es siempre de **14 días a partir de hoy**.
- El proceso es **idempotente**: si ya existe una ocurrencia para esa fecha + `routineTripId`, se omite sin error.
- Por cada fecha en la ventana que coincida con los `recurrenceDays` de la plantilla:
  1. Se crea un `Trip` con `departureAt = fecha + departureTime`, heredando origen/destino/precio/cupos/flags de la plantilla.
  2. Se copian los `RoutineTripWaypoint`s como `RouteWaypoint`s con `estimatedArrival` calculado.
  3. El `Trip` nace en estado `PUBLISHED` directamente (no necesita `DRAFT`; el conductor ya validó la plantilla).
- Al activarse una suscripción, los bookings se generan sobre las ocurrencias existentes en la ventana. Las ocurrencias que se generen después (próximas semanas) también reciben automáticamente sus bookings si la suscripción está activa.

### 5.3 Cancelación de ocurrencias

| Evento | Ocurrencias afectadas |
|---|---|
| Conductor cancela `RoutineTrip` | Todas las futuras |
| Conductor pausa `RoutineTrip` | Futuras sin bookings activos |
| Conductor cancela una ocurrencia puntual | Solo esa fecha |
| SOAT del vehículo vence | Igual que pausa |

---

## 6. `RoutineSubscription` — el contrato del pasajero

### 6.1 Campos y semántica

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | — |
| `routineTripId` | UUID | Plantilla a la que se suscribe |
| `passengerId` | UUID | Pasajero |
| `subscribedDays` | String[] | Subset de los días de la plantilla (ej. `[MON, WED, FRI]`) |
| `startDate` | Date | Desde cuándo aplica la suscripción |
| `endDate` | Date? | Hasta cuándo (`null` = hasta que cancele) |
| `seatsRequired` | Int | Cupos requeridos (default 1) |
| `specialRequirements` | String? | Ej. silla de ruedas, mascota, instrumento |
| `pickupWaypointId` | UUID? | Waypoint predefinido elegido |
| `customPickupLatitude` / `customPickupLongitude` | Double? | Punto sugerido por el pasajero |
| `customPickupName` | String? | Nombre del punto sugerido |
| `routeDeviationMeters` | Int? | Calculado al crear la suscripción |
| `timeOverheadSeconds` | Int? | Calculado al crear la suscripción |
| `pickupType` | Enum | `ORIGIN` / `WAYPOINT` / `SUGGESTED` / `ACCEPTED_CUSTOM` |
| `dropoffWaypointId` | UUID? | Punto de bajada si el destino tiene múltiples entradas |
| `status` | Enum | Estado actual de la suscripción |
| `consecutiveNoShows` | Int | Contador para suspensión automática |

### 6.2 Estados de `RoutineSubscription`

```
PENDING ──────────► ACCEPTED ──────────► PAUSED ──────────► ACCEPTED
   │                    │                                       │
   └──► CANCELLED       └──────────────► COMPLETED             │
                        │                                       │
                        └──────────────► CANCELLED ────────────┘
```

| Transición | Quién | Condición |
|---|---|---|
| `PENDING → ACCEPTED` | Conductor | Hay cupos suficientes en las ocurrencias afectadas |
| `PENDING → CANCELLED` | Conductor (rechazo) | Con motivo opcional |
| `PENDING → CANCELLED` | Pasajero | Cancelación antes de respuesta |
| `ACCEPTED → PAUSED` | Pasajero | Manual; por período (ej. semana de exámenes) |
| `ACCEPTED → CANCELLED` | Pasajero / Conductor | Con política de cancelación |
| `ACCEPTED → COMPLETED` | Sistema | Al llegar a `endDate` o fin de `RoutineTrip` |
| `ACCEPTED → PAUSED` | Sistema | 3 no-shows consecutivos |
| `PAUSED → ACCEPTED` | Pasajero | Reactivación manual |

**Efectos de cada transición:**
- `PENDING → ACCEPTED`: genera `Booking`s en cascada para todas las ocurrencias futuras en el período, en los `subscribedDays`, con el pickup de la suscripción.
- `ACCEPTED → PAUSED`: cancela todos los `Booking`s futuros (`PENDING` o `ACCEPTED`) con `subscriptionId` = esta suscripción.
- `ACCEPTED/PAUSED → CANCELLED`: mismo efecto que pausa + estado definitivo.
- `PAUSED → ACCEPTED`: regenera `Booking`s para ocurrencias futuras.
- `ACCEPTED → COMPLETED`: cierra la suscripción; bookings pasados permanecen para historial.

### 6.3 Reglas de validación al crear una suscripción

1. **Unicidad:** el pasajero no puede tener dos suscripciones en estado `PENDING` o `ACCEPTED` para el mismo `routineTripId`.
2. **Días válidos:** `subscribedDays` debe ser subconjunto no vacío de `routineTrip.recurrenceDays`.
3. **Período válido:** `startDate >= routineTrip.validFrom` y, si `validUntil` existe, `endDate <= routineTrip.validUntil`.
4. **Gate estudiantil:** si `routineTrip.studentsOnly = true`, el pasajero debe tener una `StudentVerification` en estado `APPROVED` para el `universityId` de la plantilla. Si no → error `403` con acción requerida: *"Debes verificar tu estado estudiantil para suscribirte a esta ruta"*.
5. **Cupos:** los cupos disponibles se calculan por día. Si en alguno de los `subscribedDays` no hay cupos suficientes → error con detalle de qué días están llenos.
6. **Necesidades especiales:** si `specialRequirements != null`, el conductor recibe la nota junto con la solicitud y debe revisar manualmente antes de aceptar (se ignora `autoApproveBookings`).

---

## 7. Pickup personalizado — validación de punto sugerido

### 7.1 Contexto

Para viajes interurbanos: el conductor define waypoints → el pasajero elige uno. Para viajes rutinarios urbanos: el conductor puede no definir ningún waypoint. En ese caso el pasajero puede sugerir un punto de recogida desde su propia ubicación.

### 7.2 Tipos de pickup

| `pickupType` | Descripción | Flujo |
|---|---|---|
| `ORIGIN` | El pasajero aborda en el punto de origen del viaje | Sin campos adicionales; valor por defecto si no se especifica pickup. El pasajero puede enviarlo explícitamente aunque existan waypoints predefinidos. |
| `WAYPOINT` | El pasajero elige un waypoint predefinido del conductor | `pickupWaypointId` no nulo; no requiere validación geométrica |
| `SUGGESTED` | El pasajero sugiere coordenadas propias; pendiente de aprobación del conductor | `customPickupLat/Lng` no nulo; se calculan `routeDeviationMeters` y `timeOverheadSeconds` |
| `ACCEPTED_CUSTOM` | El conductor aceptó el punto sugerido | Punto aprobado; el conductor puede luego promoverlo a `RoutineTripWaypoint` con `applicableDays` para que futuros pasajeros lo vean. Reservado para la transición en `acceptSubscription()`; el pasajero no puede enviarlo al crear la suscripción. |

### 7.3 Validación automática al crear la suscripción

Cuando el pasajero envía coordenadas de pickup personalizado:

**Paso 1 — Distancia perpendicular a la ruta**
- El sistema calcula la distancia mínima del punto sugerido a la `routeLine` (polilínea PostGIS) mediante `ST_Distance` en metros.
- Si `distancia > routineTrip.maxPickupDeviationMeters` → **rechazo automático** con mensaje:
  *"Tu punto de recogida está a Xm de la ruta (máximo permitido: Ym). Selecciona un punto más cercano a la ruta."*

**Paso 2 — Tiempo overhead estimado**
- Fórmula: `timeOverhead = (desviaciónMetros × 2) / velocidadUrbanaPromedio`
- Velocidad urbana promedio: 30 km/h = 8.33 m/s
- Si `timeOverhead > routineTrip.maxTimeOverheadSeconds` → **rechazo automático** con mensaje:
  *"El desvío agregaría aproximadamente N minutos al viaje, superando el límite de M minutos."*

**Paso 3 — Si pasa ambos filtros**
- Se persiste la suscripción con `pickupType = SUGGESTED`, incluyendo `routeDeviationMeters` y `timeOverheadSeconds`.
- El conductor recibe la solicitud con la información de desviación visible:
  *"Juan Pérez sugiere recogida en Calle 80 × Carrera 30 — desviación: 280m, tiempo extra: ~3 min"*.

### 7.4 Qué ve el conductor al revisar la solicitud

```json
{
  "passenger": { "name": "...", "rating": 4.8, "verified": true },
  "pickup": {
    "type": "SUGGESTED",
    "address": "Calle 80 × Carrera 30",
    "deviationMeters": 280,
    "timeOverheadSeconds": 168,
    "timeOverheadFormatted": "~3 min"
  },
  "subscribedDays": ["MON", "WED", "FRI"],
  "period": { "from": "2026-07-01", "until": "2026-11-30" }
}
```

### 7.5 Promoción a waypoint de plantilla con `applicableDays`

Cuando el conductor acepta un punto personalizado (`ACCEPTED_CUSTOM`) y decide formalizarlo como parada permanente en la plantilla, puede llamar al endpoint `POST /routine-trips/{id}/waypoints` incluyendo `applicableDays` con los días de suscripción del pasajero original.

**Efecto:**
- Se crea un `RoutineTripWaypoint` con `applicableDays` igual a los días especificados.
- Se propaga inmediatamente a todas las ocurrencias futuras publicadas que caigan en esos días.
- La suscripción original del pasajero **no** migra automáticamente a `WAYPOINT`; permanece `ACCEPTED_CUSTOM`.
- Futuros pasajeros que quieran ese punto pueden seleccionarlo como `WAYPOINT` al suscribirse.

**Sugerencia de unificación** *(Backlog):*
Si hay múltiples pickups personalizados a < 200m entre sí, el sistema puede sugerir al conductor unificarlos en un punto intermedio. Al aceptar, todos los bookings afectados son notificados del nuevo punto acordado.

Independientemente de la unificación, al generarse cada `TripOccurrence`, los puntos `ACCEPTED_CUSTOM` de los suscriptores activos se incluyen como `RouteWaypoint`s de esa ocurrencia para que el conductor vea todas las paradas del día en el mapa.

### 7.6 Override de pickup para una ocurrencia puntual

El pasajero puede cambiar su punto de recogida **solo para un día específico** sin afectar su suscripción general:

- El pasajero solicita el override sobre un `Booking` específico en estado `ACCEPTED`.
- El sistema recalcula la desviación del nuevo punto.
- Si pasa la validación → actualiza el `Booking` con el nuevo punto y notifica al conductor.
- El conductor tiene la opción de rechazar el override puntual (sin afectar la suscripción).
- Esta acción no modifica `routeDeviationMeters` de la suscripción base.

**Restricción de tiempo:** el override solo puede solicitarse con más de 2 horas de anticipación a `departureAt` de esa ocurrencia.

---

## 8. Búsqueda y descubrimiento de rutas rutinarias

### 8.1 Parámetros de búsqueda

| Parámetro | Requerido | Descripción |
|---|---|---|
| `universityId` | No* | ID de universidad del catálogo |
| `destinationLat` / `destinationLng` | No* | Coordenadas del destino si no es universidad |
| `destinationRadiusMeters` | No | Radio de búsqueda alrededor del destino (default 1000m) |
| `days` | Sí | Días que el pasajero necesita (ej. `[MON, WED, FRI]`) |
| `requiredArrivalBefore` | Sí | Hora límite de llegada del pasajero (ej. `07:30`) |
| `passengerLat` / `passengerLng` | No | Ubicación actual del pasajero para calcular distancia al waypoint más cercano |
| `maxWalkDistanceMeters` | No | Filtrar solo rutas cuyo waypoint más cercano esté dentro de este radio |

*Al menos uno de `universityId` o `destinationLat/Lng` es requerido.

### 8.2 Lógica de filtrado

1. Solo se muestran `RoutineTrip` en estado `ACTIVE`.
2. `validUntil >= hoy` (o `null`).
3. La intersección de `routineTrip.recurrenceDays` con `days` no puede estar vacía (la ruta debe operar al menos uno de los días solicitados).
4. `routineTrip.requiredArrivalTime <= requiredArrivalBefore`.
5. Si se provee `maxWalkDistanceMeters`: se filtra solo rutas cuyo waypoint o ruta pase a ≤ esa distancia de `passengerLat/Lng`.
6. Si `studentsOnly = true` en la plantilla: el resultado igual aparece, pero con `requiresStudentVerification: true`. El frontend debe mostrar el candado con la acción de verificar.

### 8.3 Estructura del resultado

```json
{
  "routineTripId": "...",
  "driver": { "name": "...", "rating": 4.9, "reliabilityScore": 0.95 },
  "vehicle": { "plate": "...", "model": "...", "color": "..." },
  "origin": { "name": "...", "lat": ..., "lng": ... },
  "destination": { "name": "Universidad Nacional", "lat": ..., "lng": ... },
  "departureTime": "06:30",
  "requiredArrivalTime": "07:30",
  "recurrenceDays": ["MON", "TUE", "WED", "THU", "FRI"],
  "pricePerSeat": 8000,
  "currency": "COP",
  "availableSeatsForDays": { "MON": 3, "WED": 1, "FRI": 3 },
  "studentsOnly": false,
  "requiresStudentVerification": false,
  "allowsCustomPickup": true,
  "maxPickupDeviationMeters": 500,
  "nearestWaypointDistanceMeters": 320,
  "nearestWaypoint": {
    "id": "...",
    "name": "Calle 72 con Av. Caracas",
    "estimatedPickupTime": "06:45"
  },
  "predefinedWaypoints": [...]
}
```

---

## 9. Catálogo de universidades y verificación estudiantil

### 9.1 `University`

| Campo | Descripción |
|---|---|
| `id` | UUID |
| `name` | Nombre completo |
| `shortName` | Nombre corto (ej. "UNAL", "Andes") |
| `city` / `department` | Localización |
| `address` | Dirección textual |
| `latitude` / `longitude` | Coordenadas de la sede principal |
| `domainEmail` | Dominio de email institucional (ej. `unal.edu.co`) |
| `typicalArrivalWindows` | Lista de horarios comunes: `[{"label":"Primera clase","time":"07:00"}]` |
| `logoUrl` | URL del logo |
| `isActive` | Si está disponible para selección |

**Para el frontend:** al crear una `RoutineTrip` con destino a universidad, mostrar las `typicalArrivalWindows` como sugerencias de `requiredArrivalTime`.

### 9.2 Verificación estudiantil (`StudentVerification`)

Cuando `routineTrip.studentsOnly = true`, el pasajero debe verificar su condición de estudiante antes de suscribirse.

**Flujo:**
1. El pasajero envía: `universityId` + `studentEmail` + foto del carnet (`studentCardUrl`).
2. El sistema valida que `studentEmail` tiene el dominio de `university.domainEmail`:
   - **Dominio coincide:** auto-aprobación inmediata, estado `APPROVED`.
   - **Dominio no coincide:** queda en `PENDING` para revisión manual por admin.
3. La verificación tiene una fecha de expiración (`expiresAt`) típicamente al final del semestre.
4. Una verificación `EXPIRED` requiere renovación antes de poder suscribirse nuevamente.

**Estados de `StudentVerification`:** `PENDING → APPROVED / REJECTED`. Si `APPROVED` tiene fecha de expiración → pasa a `EXPIRED` automáticamente.

---

## 10. Flujo completo end-to-end

### Desde el conductor

```
1. Crear RoutineTrip (DRAFT)
   - Define ruta, horario, días, período, precio, cupos
   - Opcionalmente agrega waypoints predefinidos
   - Configura si acepta pickups personalizados y sus límites

2. Publicar (DRAFT → ACTIVE)
   - Sistema valida timing y genera ocurrencias para 14 días

3. Recibir solicitudes de RoutineSubscription
   - Ve la tarjeta con datos del pasajero + desviación de pickup + días
   - Acepta o rechaza cada solicitud

4. Al aceptar: sistema genera automáticamente todos los Bookings futuros

5. Cada día de operación:
   - Conduce la ruta
   - Hace check-in de cada pasajero en su punto de recogida (código de verificación)
   - Marca boarded → completa el viaje
   - Sistema habilita calificación bidireccional

6. Gestión continua:
   - Pausar por vacaciones o eventualidades
   - Revisar nuevas solicitudes de suscripción
   - Cancelar ocurrencias puntuales si es necesario
   - Renovar al inicio del nuevo semestre
```

### Desde el pasajero

```
1. Buscar rutas rutinarias
   - Filtra por destino (universidad o coordenadas)
   - Selecciona días que necesita
   - Indica hora límite de llegada
   - Opcional: su ubicación actual para ver distancia al punto más cercano

2. Seleccionar ruta
   - Ve conductor, vehículo, precio, días disponibles, distancia al waypoint

3. Configurar suscripción
   - Elige días de su interés (subset de los días del conductor)
   - Elige punto de recogida:
     a. El punto de origen del viaje (`ORIGIN` — siempre disponible)
     b. De la lista de waypoints predefinidos del conductor (`WAYPOINT`)
     c. Sugiere su propia ubicación (`SUGGESTED`, si el conductor lo permite)
   - Indica si necesita bajada en punto específico (campus tiene varias entradas)
   - Anota necesidades especiales si aplica
   - Define período (inicio y fin opcional)

4. Enviar solicitud → espera respuesta del conductor

5. Al aceptar:
   - Ve su calendario de bookings generados
   - Recibe notificación diaria con hora de recogida estimada

6. Gestión continua:
   - Pausar suscripción temporalmente
   - Cancelar un día específico (no afecta la suscripción)
   - Cambiar punto de recogida para un día puntual
   - Cancelar suscripción completa
```

---

## 11. Variantes y condiciones especiales

### 11.1 Gestión del calendario

**Vencimiento de semestre**
Cuando `RoutineTrip.validUntil` está próximo (14 días antes), el sistema notifica al conductor con una acción de renovación. Los suscriptores también son notificados 14 días antes para que coordinen la renovación. Si el conductor no renueva, las suscripciones pasan a `COMPLETED` automáticamente al vencer `validUntil`.

**Pausas por rango de fechas**
El conductor puede pausar la plantilla por un rango de fechas específico (ej. semana de receso `2026-06-01` a `2026-06-07`). Las ocurrencias en ese rango que no tengan bookings activos se cancelan. Las que sí los tienen se respetan y el conductor puede cancelarlas manualmente con notificación a los pasajeros.

---

### 11.2 Variantes de la suscripción del pasajero

**Ida y vuelta** *(Backlog)*
El conductor puede vincular dos `RoutineTrip` (ida y regreso) mediante `returnRoutineTripId`. El pasajero puede suscribirse a ambos en una sola operación.

**Override de pickup para una ocurrencia puntual**
El pasajero puede cambiar su punto de recogida solo para un día específico. Ver sección 7.6. El conductor puede aprobar o rechazar el cambio sin afectar la suscripción general.

**Cupo extra temporal**
El pasajero puede crear un booking adicional one-off para una ocurrencia específica (para llevar a un acompañante, por ejemplo), sin convertirlo en suscripción. Sujeto a disponibilidad de cupos. Se gestiona como un booking normal, no como suscripción.

**Pasajero con necesidades especiales**
Si `specialRequirements != null` en la suscripción, el conductor debe revisar y confirmar manualmente antes de aceptar. El flag `autoApproveBookings` se ignora en este caso. El frontend debe presentar un campo de texto libre al crear la suscripción y advertir que la aprobación puede tomar más tiempo.

---

### 11.3 Dinámica de cupos

**Lista de espera** *(Backlog)*
Si todos los cupos de una `RoutineTrip` están ocupados, el pasajero puede unirse a una lista de espera. Si algún suscriptor cancela, el primero en la lista de espera recibe notificación y tiene N horas para confirmar antes de pasar al siguiente.

**Mínimo de pasajeros para operar** *(Backlog)*
El conductor puede definir `minPassengersToOperate`. Si 24 horas antes de una ocurrencia los bookings activos son menores al mínimo, la ocurrencia se cancela automáticamente sin penalización para el conductor y los pasajeros son notificados inmediatamente.

**Cupos variables por día de semana** *(Backlog)*
En lugar de un `availableSeats` único, el conductor podría definir cupos diferentes por día (ej. viernes 2 cupos, resto 4). No implementado en el MVP de Fase 4.

---

### 11.4 Variantes de ruta y tiempo

**Múltiples puntos de bajada**
El destino puede tener varias entradas (portería norte, sur, centro). El pasajero indica su `dropoffWaypointId` preferido al suscribirse. El conductor puede rechazar si ese punto está fuera de su ruta habitual.

**Variación de tiempo por tráfico** *(Backlog)*
El `requiredArrivalTime` sirve como límite estricto. En el MVP, el sistema confía en que el conductor conoce el tráfico habitual de su ruta. En versiones futuras, se puede agregar un buffer automático por día de semana (`trafficBufferSeconds`).

**Ruta alterada por evento externo**
Si el conductor decide tomar una ruta diferente en una ocurrencia puntual (obras, manifestación), debe notificar a los pasajeros desde la app antes de iniciar el viaje. El sistema recalcula qué pickups personalizados quedan fuera del nuevo trazado y alerta al conductor para que notifique a esos pasajeros específicamente.

**Agrupación de pickups cercanos** *(Backlog)*
Si dos suscriptores tienen pickups personalizados a menos de 200m entre sí, el sistema sugiere al conductor unificarlos en un punto intermedio. Ambos pasajeros son notificados del cambio si el conductor acepta.

---

### 11.5 Confianza y relaciones recurrentes

**Reliability score del conductor**
Porcentaje de ocurrencias completadas vs canceladas en los últimos 30 días, visible en la tarjeta del resultado de búsqueda. Un conductor con 95% de confiabilidad es más atractivo que uno con 70%.

**Pasajero de confianza** *(Backlog)*
Después de N viajes sin incidentes entre conductor y pasajero, el conductor puede marcar al pasajero como "confiable". Las futuras suscripciones de ese pasajero se aprueban automáticamente, independientemente del flag `autoApproveBookings`.

**Chat grupal del RoutineTrip** *(Backlog)*
Los pasajeros de un `RoutineTrip` forman implícitamente un grupo. Se puede habilitar un chat grupal (reutilizando el módulo Chat existente) donde el conductor avisa retrasos, cambios de ruta o cancelaciones sin tener que notificar uno por uno.

---

### 11.6 Automatizaciones del sistema

**No-shows consecutivos**
- Al marcar un booking rutinario como `NO_SHOW`: el sistema incrementa `routineSubscription.consecutiveNoShows`.
- Al llegar a 3 no-shows consecutivos: la suscripción pasa automáticamente a `PAUSED`. El conductor es notificado. El pasajero recibe mensaje: *"Tu suscripción fue suspendida por 3 inasistencias consecutivas. Contacta al conductor para reactivarla."*
- Al completar un booking rutinario exitosamente: `consecutiveNoShows` se resetea a 0.

**SOAT vencido**
- Cuando el admin rechaza o el sistema detecta que el vehículo de un conductor tiene SOAT vencido: todos los `RoutineTrip` en estado `ACTIVE` con ese `vehicleId` pasan a `PAUSED` automáticamente.
- Los suscriptores son notificados.
- Cuando el conductor sube el SOAT renovado y pasa la revisión admin, puede reactivar manualmente sus `RoutineTrip`s pausados.

**Conductor suspendido por admin**
- Si el admin suspende la cuenta del conductor: todos sus `RoutineTrip` pasan a `CANCELLED`.
- Todos los bookings futuros de esos viajes son cancelados con notificación a los pasajeros.

**Expiración de suscripciones**
- El sistema verifica diariamente si `routineSubscription.endDate < hoy` y transiciona automáticamente a `COMPLETED`.
- 14 días antes de `endDate`, el pasajero recibe notificación: *"Tu suscripción vence el DD/MM. ¿Deseas renovarla?"*

---

## 12. Políticas de cancelación

### Para el pasajero que cancela un booking rutinario individual

| Anticipación | Penalización |
|---|---|
| > 12 horas antes | Sin penalización |
| Entre 2 y 12 horas | 50% del precio de esa ocurrencia |
| < 2 horas | Sin reembolso |

### Para el pasajero que cancela su suscripción completa

| Anticipación del primer día afectado | Penalización |
|---|---|
| > 24 horas | Sin penalización; cupos liberados inmediatamente |
| < 24 horas | El primer día se considera como cancelación tardía según tabla anterior |

### Para el conductor que cancela una ocurrencia puntual

- Conductor cancela con > 12 horas: sin penalización, pasajeros notificados.
- Conductor cancela con < 12 horas: penalización reflejada en su `reliabilityScore`.
- Conductor que cancela 3 o más ocurrencias en un mes: alerta en panel admin.

### Para el conductor que cancela la plantilla completa

- Pasajeros con suscripciones activas reciben crédito en plataforma equivalente a los días restantes de su período suscrito (cuando Payments esté implementado).
- Todas las suscripciones pasan a `CANCELLED` con motivo.

---

## 13. Reglas de negocio — resumen consolidado

1. Un pasajero no puede tener dos suscripciones activas (`PENDING` o `ACCEPTED`) para el mismo `RoutineTrip`.
2. Un conductor no puede tener dos `RoutineTrip` activos con el mismo destino y horario solapado (±30 min).
3. `subscribedDays` siempre es un subconjunto no vacío de `routineTrip.recurrenceDays`.
4. La generación de ocurrencias es idempotente: fecha + `routineTripId` es clave única.
5. Los bookings generados en cascada heredan el `pickupType` de la suscripción.
6. Los bookings históricos (completados, cancelados) nunca se modifican retroactivamente.
7. `autoApproveBookings` se ignora si la suscripción tiene `specialRequirements`.
8. La validación de pickup ocurre en el momento de crear la suscripción, no al aceptarla.
9. El tiempo overhead se calcula con velocidad urbana de 30 km/h (ida y vuelta al desvío).
10. Al cancelar una suscripción solo se cancelan bookings futuros; los pasados son de solo lectura.
11. La transición `ACTIVE → PAUSED` en `RoutineTrip` respeta los bookings con estado activo.
12. Tres no-shows consecutivos suspenden la suscripción, no la cancelan; el pasajero puede reactivar.
13. El SOAT vencido pausa la plantilla; su renovación no la reactiva automáticamente (requiere acción del conductor).
14. `studentsOnly = true` requiere `StudentVerification` en estado `APPROVED` y no expirada.
15. Un override de pickup puntual debe solicitarse con > 2 horas de anticipación.
16. `applicableDays` en un waypoint debe ser subconjunto no vacío de `routineTrip.recurrenceDays`; se valida al crear el waypoint con plantilla en `ACTIVE`.
17. Al agregar un waypoint a plantilla `ACTIVE`, la propagación solo afecta ocurrencias con `departure_at > NOW() AND status = 'PUBLISHED'`; las ocurrencias pasadas o en curso no se modifican.
18. Al reordenar waypoints en plantilla `ACTIVE`, el nuevo orden se propaga a ocurrencias futuras publicadas actualizando `order_index` en `route_waypoints` vía `routine_trip_waypoint_id`. Los waypoints custom de pasajeros (`routine_trip_waypoint_id IS NULL`) no son afectados.
19. El reordenamiento de waypoints no invalida suscripciones con `pickupType = WAYPOINT`; el `pickupWaypointId` sigue referenciando el mismo waypoint; solo cambia cuándo el conductor pasa por él.
20. `pickupType = ORIGIN` es válido aunque existan waypoints predefinidos en la plantilla. El pasajero puede seleccionarlo explícitamente o llegar por defecto si no especifica ningún campo de pickup.
21. La `routeLine` de la plantilla no se actualiza automáticamente al agregar o reordenar waypoints; el conductor debe actualizarla manualmente si cambia el trazado de la ruta.

---

## 14. Endpoints del API (referencia para el frontend)

> Los cuerpos de request y response están detallados en la documentación OpenAPI. Esta sección es una guía de navegación.

### `RoutineTrip`

| Método | Endpoint | Actor | Descripción |
|---|---|---|---|
| `POST` | `/routine-trips` | Conductor | Crear plantilla en `DRAFT` |
| `GET` | `/routine-trips/{id}` | Ambos | Detalle de plantilla |
| `GET` | `/routine-trips/my` | Conductor | Mis plantillas (paginado) |
| `PUT` | `/routine-trips/{id}` | Conductor | Editar (solo en `DRAFT` o campos permitidos en `ACTIVE`) |
| `POST` | `/routine-trips/{id}/publish` | Conductor | `DRAFT → ACTIVE` |
| `POST` | `/routine-trips/{id}/pause` | Conductor | `ACTIVE → PAUSED` |
| `DELETE` | `/routine-trips/{id}` | Conductor | `→ CANCELLED` |
| `POST` | `/routine-trips/{id}/waypoints` | Conductor | Agregar waypoint (con `applicableDays` opcional en `ACTIVE`) |
| `DELETE` | `/routine-trips/{id}/waypoints/{wId}` | Conductor | Eliminar waypoint (solo en `DRAFT`) |
| `PUT` | `/routine-trips/{id}/waypoints/reorder` | Conductor | Reordenar waypoints (propaga a ocurrencias si `ACTIVE`) |
| `GET` | `/routine-trips/search` | Pasajero | Búsqueda con filtros |

### `RoutineSubscription`

| Método | Endpoint | Actor | Descripción |
|---|---|---|---|
| `POST` | `/routine-subscriptions` | Pasajero | Crear suscripción (`PENDING`) |
| `GET` | `/routine-subscriptions/my` | Pasajero | Mis suscripciones activas e historial |
| `GET` | `/routine-trips/{id}/subscriptions` | Conductor | Suscripciones de una plantilla |
| `POST` | `/routine-subscriptions/{id}/accept` | Conductor | `PENDING → ACCEPTED` |
| `POST` | `/routine-subscriptions/{id}/reject` | Conductor | `PENDING → CANCELLED` |
| `POST` | `/routine-subscriptions/{id}/pause` | Pasajero | `ACCEPTED → PAUSED` |
| `POST` | `/routine-subscriptions/{id}/resume` | Pasajero | `PAUSED → ACCEPTED` |
| `DELETE` | `/routine-subscriptions/{id}` | Pasajero | `→ CANCELLED` |
| `PUT` | `/bookings/{id}/pickup-override` | Pasajero | Override de pickup para una ocurrencia |

### `University`

| Método | Endpoint | Actor | Descripción |
|---|---|---|---|
| `GET` | `/universities` | Ambos | Listado paginado (filtro por ciudad) |
| `GET` | `/universities/{id}` | Ambos | Detalle + `typicalArrivalWindows` |
| `GET` | `/universities/search` | Ambos | Búsqueda por nombre/shortName |

### `StudentVerification`

| Método | Endpoint | Actor | Descripción |
|---|---|---|---|
| `POST` | `/student-verifications` | Pasajero | Enviar verificación estudiantil |
| `GET` | `/student-verifications/my` | Pasajero | Estado de mis verificaciones |

---

## 15. Consideraciones para el frontend

### Flujo de creación de `RoutineTrip` (conductor)

1. **Paso 1 — Ruta base:** origen, destino (con selector de universidad del catálogo), trazado del `routeLine` en mapa.
2. **Paso 2 — Horario:** `departureTime`, `requiredArrivalTime` (con sugerencias de `typicalArrivalWindows` si el destino es universidad), `recurrenceDays`, período (`validFrom` / `validUntil`).
3. **Paso 3 — Cupos y precio:** `availableSeats`, `pricePerSeat`, `allowsLuggage`.
4. **Paso 4 — Configuración de pickup:** toggle `allowsCustomPickup`, sliders de `maxPickupDeviationMeters` y `maxTimeOverheadSeconds` con descripción en lenguaje natural (*"Acepto que los pasajeros se desvíen hasta 500m de la ruta"*).
5. **Paso 5 — Waypoints opcionales:** mapa interactivo para agregar paradas intermedias.
6. **Revisión y publicar:** resumen, acción de publicar que dispara la generación de ocurrencias.

### Flujo de búsqueda y suscripción (pasajero)

1. **Búsqueda:** selector de destino (universidad o punto en mapa), selector de días, selector de hora límite, opcional: "buscar cerca de mi ubicación" para mostrar `nearestWaypointDistanceMeters`.
2. **Tarjeta de resultado:** mostrar `reliabilityScore` del conductor, precio, días disponibles, cupos, distancia al punto más cercano. Badge de candado si requiere verificación estudiantil.
3. **Configuración de suscripción:**
   - Siempre mostrar "Punto de origen del viaje" como primera opción (`pickupType = ORIGIN`).
   - Si hay waypoints predefinidos: lista adicional con hora estimada de paso. Los waypoints con `applicableDays` se muestran solo si aplican en alguno de los `subscribedDays` seleccionados.
   - Si `allowsCustomPickup = true`: opción de "usar mi ubicación actual" (`SUGGESTED`) con mensaje de validación en tiempo real antes de enviar.
   - Selector de días de interés (subconjunto de los días del conductor).
   - Selector de período.
   - Campo opcional de necesidades especiales con advertencia de que puede requerir revisión manual.
4. **Estado de la suscripción:** timeline visual con los próximos bookings generados una vez aceptada. Debe permitir ver y cancelar ocurrencias individuales sin afectar la suscripción.

### Manejo de errores clave

| Código | Escenario | Acción recomendada en UI |
|---|---|---|
| `403 STUDENT_VERIFICATION_REQUIRED` | `studentsOnly = true` y no verificado | Mostrar banner con CTA a flujo de verificación estudiantil |
| `409 DUPLICATE_ACTIVE_SUBSCRIPTION` | Ya tiene suscripción activa para esa ruta | Redirigir a la suscripción existente |
| `422 PICKUP_TOO_FAR` | Punto sugerido supera desviación máxima | Mostrar en el mapa el radio permitido; sugerir el waypoint más cercano |
| `422 PICKUP_TIME_OVERHEAD_EXCEEDED` | Desvío agrega demasiado tiempo | Mostrar tiempo calculado vs límite; sugerir punto más cercano a la ruta |
| `409 NO_SEATS_AVAILABLE` | Sin cupos en los días solicitados | Mostrar qué días tienen cupos; ofrecer días alternativos |
| `422 ARRIVAL_TIME_NOT_FEASIBLE` | Ruta no llega a tiempo según `requiredArrivalTime` | Mostrar tiempo estimado calculado; sugerir ajustar `requiredArrivalTime` |

---

## 16. Backlog — features fuera del MVP de Fase 4

| Feature | Descripción breve |
|---|---|
| Viaje de ida y vuelta vinculado | `returnRoutineTripId` en `RoutineTrip`; suscripción a ambos en una operación |
| Lista de espera | Si ruta llena, pasajero entra en cola; auto-promovido al liberarse cupo |
| Cupos variables por día | `seatsPerDay: {MON: 4, FRI: 2}` en lugar de un único `availableSeats` |
| Mínimo de pasajeros para operar | Auto-cancelar ocurrencia si no alcanza el mínimo 24h antes |
| Skip de festivos colombianos | `skipHolidays = true` en plantilla; catálogo de festivos nacionales |
| Buffer de tráfico por día | `trafficBufferSeconds` por día de semana para ajustar `estimatedArrival` |
| Agrupación de pickups cercanos | Sugerir unificación de puntos a < 200m entre sí |
| Pasajero de confianza | Auto-accept para pasajeros con historial positivo con ese conductor |
| Chat grupal del RoutineTrip | Canal de chat compartido entre todos los suscriptores y el conductor |
| Reliability score | Porcentaje de ocurrencias completadas en los últimos 30 días |
| Descuento por suscripción mensual | Precio reducido para períodos completos vs pago por ocurrencia |
| Créditos por cancelación del conductor | Crédito en plataforma si conductor cancela con < 12h de anticipación |
