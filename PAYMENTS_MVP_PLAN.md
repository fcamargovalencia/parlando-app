# Módulo de Pagos MVP — Plan de Implementación

> Fecha: 2026-05-11 · Fase 3 del roadmap · Modalidad: pagos externos (offline)

---

## Contexto y alcance

El módulo de pagos MVP opera sobre un esquema **offline**: el pasajero paga al conductor directamente (efectivo o transferencia electrónica — Nequi, Bancolombia, Bre-B, Daviplata, etc.) y el conductor confirma la recepción del pago al registrar el abordaje. No se integra ninguna pasarela de pagos en esta fase.

### Flujo definido

```
[Booking PENDING]
      │
      ▼  conductor acepta → verificationCode generado internamente
[Booking ACCEPTED] ──── push al pasajero: "Reserva aceptada, tu código: XXXX"
      │
      ▼  conductor inicia viaje
[Trip IN_PROGRESS] ──── push individual por pasajero:
                        "El viaje inició · Código: XXXX · Paga $Y"
      │
      ├──▶ pasajero paga externamente + muestra el código al conductor
      │
      ▼  conductor ingresa código + paymentMethod → backend valida código
[Booking BOARDED]  ──── Payment record creado (status: COMPLETED)
      │
      │   ─ ó ─
      │
      ▼  pasajero no se presenta
[Booking NO_SHOW]
      │
      ▼  conductor finaliza el viaje
[Trip COMPLETED]   ──── BOARDED → COMPLETED (batch por tripId, ya implementado)
```

---

## Archivos a crear / modificar

### Dominio
| Archivo | Acción |
|---|---|
| `domain/enums/PaymentMethod.java` | Agregar `BANCOLOMBIA`, `BRE_B` |
| `domain/model/Booking.java` | `accept()` genera el `verificationCode` internamente |
| `domain/model/Payment.java` | **Nuevo** — entidad de pago |
| `domain/port/out/PaymentRepositoryPort.java` | **Nuevo** — `save`, `findByBookingId` |
| `domain/port/out/BookingRepositoryPort.java` | Agregar `findAcceptedBookingsByTripId` |

### Aplicación
| Archivo | Acción |
|---|---|
| `application/mappers/BookingMapper.java` | Eliminar generación de `verificationCode` al crear |
| `application/commands/booking/BoardBookingCommand.java` | **Nuevo** — `verificationCode`, `paymentMethod` |
| `application/port/in/BookingUseCase.java` | Actualizar firma de `board()` |
| `application/port/in/PaymentUseCase.java` | **Nuevo** — `getByBookingId` |
| `application/service/BookingService.java` | Validar código + persistir `Payment` en `board()` |
| `application/service/PaymentService.java` | **Nuevo** — implementa `PaymentUseCase` |
| `application/service/PushNotificationMessages.java` | Agregar `tripStartedWithCode()` |
| `application/service/TripService.java` | Refactorizar `notifyTripStartedPush()` → push individual con código |

### Infraestructura
| Archivo | Acción |
|---|---|
| `infrastructure/out/persistence/entity/PaymentEntity.java` | **Nuevo** |
| `infrastructure/out/persistence/repository/PaymentR2dbcRepository.java` | **Nuevo** |
| `infrastructure/out/persistence/adapter/PaymentRepositoryAdapter.java` | **Nuevo** |
| `infrastructure/out/persistence/repository/BookingR2dbcRepository.java` | Agregar query `findAcceptedByTripId` |
| `infrastructure/out/persistence/adapter/BookingRepositoryAdapter.java` | Exponer `findAcceptedBookingsByTripId` |
| `infrastructure/in/web/dto/request/BoardBookingRequest.java` | **Nuevo** — `verificationCode`, `paymentMethod` |
| `infrastructure/in/web/dto/response/PaymentResponse.java` | **Nuevo** |
| `infrastructure/in/web/controller/BookingController.java` | Actualizar `board()` + agregar `GET /{id}/payment` |
| `infrastructure/in/web/mapper/BookingRequestMapper.java` | Mapear `BoardBookingRequest → BoardBookingCommand` |
| `db/migration/V54__create_payments_table.sql` | **Nuevo** — tabla + índices |

---

## Sprint 1 — Dominio y cimientos

**Objetivo:** Tener el dominio limpio y la base de datos lista antes de tocar servicios.  
**Duración estimada:** 2–3 días

### Tareas

- [ ] **S1-1** Agregar `BANCOLOMBIA` y `BRE_B` a `PaymentMethod.java`
- [ ] **S1-2** Mover generación de `verificationCode` de `BookingMapper` al método `Booking.accept()` (encapsulado en el dominio, UUID 6 chars mayúsculas)
- [ ] **S1-3** Crear `Payment.java` con campos:
  ```
  id, bookingId, tripId, passengerId, driverId,
  amount (Double), currency (String), paymentMethod,
  status (PaymentStatus), confirmedAt (OffsetDateTime)
  ```
- [ ] **S1-4** Crear `PaymentRepositoryPort` con `save(Payment)` y `findByBookingId(String)`
- [ ] **S1-5** Crear migración `V54__create_payments_table.sql`:
  - Tabla `payments` con todas las columnas
  - `INDEX idx_payments_booking_id ON payments(booking_id)`
  - `INDEX idx_payments_trip_id ON payments(trip_id)`

### Criterio de aceptación
- `Booking.accept()` retorna el booking con `verificationCode` poblado y `status = ACCEPTED`
- La migración ejecuta sin errores en entorno local
- Los tests de `BookingMapper` pasan sin código generado en PENDING

---

## Sprint 2 — Lógica de abordaje con validación de pago

**Objetivo:** El conductor puede confirmar el abordaje ingresando el código del pasajero y el método de pago.  
**Duración estimada:** 3–4 días

### Tareas

- [x] **S2-1** Crear `BoardBookingCommand(verificationCode: String, paymentMethod: PaymentMethod)` con validaciones `@NotBlank` / `@NotNull`
- [x] **S2-2** Crear `BoardBookingRequest` (DTO HTTP) con las mismas restricciones de validación
- [x] **S2-3** Actualizar `BookingUseCase.board()` a `board(String bookingId, String driverId, BoardBookingCommand cmd)`
- [x] **S2-4** Actualizar `BookingService.board()`:
  1. Validar `cmd.verificationCode().equals(booking.getVerificationCode())` → 400 `"Código de verificación incorrecto"`
  2. Calcular `amount = trip.getPricePerSeat() × booking.getSeatsBooked()`
  3. Construir y persistir `Payment` con `status = COMPLETED`, `confirmedAt = now()`
  4. Persistir `booking.board()` como hoy
- [x] **S2-5** Crear infraestructura de `Payment`: `PaymentEntity`, `PaymentEntityMapper`, `PaymentR2dbcRepository`, `PaymentRepositoryAdapter`
- [x] **S2-6** Actualizar `BookingController.board()` para recibir `@RequestBody @Valid BoardBookingRequest`
- [x] **S2-7** Actualizar `BookingRequestMapper` para generar `BoardBookingCommand` desde `BoardBookingRequest`

### Criterio de aceptación
- `PATCH /v1/bookings/{id}/board` con código correcto registra el abordaje y crea el payment
- `PATCH /v1/bookings/{id}/board` con código incorrecto retorna `400 Bad Request`
- La tabla `payments` recibe el registro al abordar
- Tests unitarios de `BookingService.board()` cubren: código válido, código inválido, método de pago nulo

---

## Sprint 3 — Notificación individual al iniciar viaje

**Objetivo:** Cada pasajero recibe en su push notification su código de abordaje y el precio al pagar.  
**Duración estimada:** 2–3 días

### Tareas

- [ ] **S3-1** Agregar `findAcceptedBookingsByTripId(String tripId)` a `BookingRepositoryPort`
- [ ] **S3-2** Implementar la query en `BookingR2dbcRepository`:
  ```sql
  SELECT * FROM bookings WHERE trip_id = :tripId AND status = 'ACCEPTED'
  ```
- [ ] **S3-3** Exponer el método en `BookingRepositoryAdapter`
- [ ] **S3-4** Agregar `PushNotificationMessages.tripStartedWithCode(driverName, trip, verificationCode)`:
  - **Title:** `"¡Tu viaje ha iniciado!"`
  - **Body:** `"Tu conductor {driverName} está en camino. Muestra este código al abordar: {CODE} · Monto a pagar: ${price} {currency}"`
  - **Data:** `{ type: "trip.started", tripId, verificationCode }` *(el frontend usa el `data` para mostrarlo in-app)*
- [ ] **S3-5** Refactorizar `TripService.notifyTripStartedPush()` para:
  1. Llamar `findAcceptedBookingsByTripId` en lugar de `findActivePassengerIdsByTripId`
  2. Obtener `driver name` del conductor una sola vez
  3. Iterar los bookings y emitir push **individual** a cada pasajero con su `verificationCode` y el `pricePerSeat` del trip

### Criterio de aceptación
- Al iniciar el viaje cada pasajero recibe una push con su código único
- Dos pasajeros del mismo viaje reciben códigos distintos
- Un pasajero en estado `PENDING` (no aceptado) no recibe notificación de inicio
- El campo `verificationCode` llega en el `data` payload para uso in-app del frontend

---

## Sprint 4 — Consulta de pagos

**Objetivo:** Pasajero y conductor pueden consultar el pago registrado de una reserva.  
**Duración estimada:** 1–2 días

### Tareas

- [ ] **S4-1** Crear `PaymentUseCase` port-in con `getByBookingId(String bookingId, String requesterId)`
- [ ] **S4-2** Crear `PaymentService` implementando `PaymentUseCase`:
  1. Buscar el booking por `bookingId`
  2. Buscar el trip para obtener `driverId`
  3. Validar que `requesterId` sea el `passengerId` o el `driverId` → 403 si no
  4. Retornar el `Payment` o 404 si no existe
- [ ] **S4-3** Crear `PaymentResponse`:
  ```
  bookingId, tripId, amount, currency,
  paymentMethod, status, confirmedAt
  ```
- [ ] **S4-4** Agregar `GET /v1/bookings/{id}/payment` en `BookingController` delegando a `PaymentUseCase`

### Criterio de aceptación
- El pasajero puede consultar el pago de su reserva
- El conductor puede consultar el pago de cualquier reserva de su viaje
- Un tercero recibe `403 Forbidden`
- Una reserva sin pago (PENDING/ACCEPTED/NO_SHOW) retorna `404 Not Found`

---

## Resumen de sprints

| Sprint | Foco | Días est. | Dependencias |
|---|---|---|---|
| S1 | Dominio + migración DB | 2–3 | Ninguna |
| S2 | Abordaje con código + pago | 3–4 | S1 |
| S3 | Push individual con código | 2–3 | S1 |
| S4 | Endpoint consulta de pago | 1–2 | S2 |

**Total estimado: 8–12 días de desarrollo**

> S2 y S3 son independientes entre sí una vez completado S1 y pueden desarrollarse en paralelo.

---

## Reglas de negocio clave

| Regla | Descripción |
|---|---|
| RN-01 | El `verificationCode` se genera al aceptar la reserva, nunca al crearla |
| RN-02 | El código solo cambia si la reserva vuelve a aceptarse (flujo de re-aceptación no previsto en MVP) |
| RN-03 | El conductor **debe** ingresar el código del pasajero para confirmar el abordaje |
| RN-04 | El pago se registra siempre en estado `COMPLETED` (confirmación física por el conductor) |
| RN-05 | Un abordaje sin pago previo no es posible — `Payment` se persiste en la misma operación |
| RN-06 | `NO_SHOW` no genera `Payment` |
| RN-07 | Al completar el viaje, todos los `BOARDED` pasan a `COMPLETED` en batch (flujo ya implementado) |
| RN-08 | Solo el pasajero o el conductor del viaje pueden consultar un pago |

---

## Endpoints resultantes

| Método | Ruta | Actor | Descripción |
|---|---|---|---|
| `PATCH` | `/v1/bookings/{id}/board` | Conductor | Confirmar abordaje con código + método de pago |
| `GET` | `/v1/bookings/{id}/payment` | Pasajero / Conductor | Consultar el pago de una reserva |

> Los demás endpoints del módulo de bookings (`accept`, `reject`, `cancel`, `no-show`) no se modifican.

---

## Deuda técnica y próximos pasos (post-MVP)

| Item | Descripción |
|---|---|
| Integración pasarela | Wompi / ePayco para pago en línea (PSE, tarjeta) — requiere `Payment` con estados `PENDING → PROCESSING → COMPLETED / FAILED` |
| Reembolsos | Lógica de `REFUNDED` en `PaymentStatus`, actualmente sin soporte |
| Historial de pagos | Endpoint `GET /v1/payments?tripId=` para reportes del conductor |
| Recibos | Generación de comprobante en PDF o notificación post-pago |
| Conciliación | Panel admin para revisar discrepancias entre bookings BOARDED y payments |

