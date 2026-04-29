# Plan: Gestión Unificada + Day-Aware para Viajes Rutinarios

## Problema

No existe una capa intermedia entre "gestión unificada de suscripciones" y "detalle de ocurrencia individual". El conductor no puede responder "¿cómo se ve mi ruta los lunes vs. los miércoles?" sin abrir ocurrencias individuales. Al intentar gestionar todo unificado se pierde la variación por día; al gestionar por ocurrencia se repiten validaciones que corresponden al contrato de suscripción.

---

## Modelo de Tres Capas

```
Layer A: Subscription Management (Unificado, Day-Tagged)
  └─ Acepta/rechaza/pausa una suscripción → aplica a TODOS sus subscribedDays

Layer B: Day Variant Preview (Template-Level, Por Día)  ← FALTA
  └─ "¿Cómo se ve la ruta los lunes?" → derivado 100% frontend desde stores

Layer C: Occurrence Detail (Por Fecha, Estado Real)    ← Planificado en plan_routine_trip.md
  └─ RoutineBooking[] reales del backend para una fecha concreta
```

---

## Layer A — Subscription Management (ya existe parcialmente)

Una suscripción = "Pasajero X, días `[MON, WED]`, pickup en coordenada Y".

**Principio clave:** el pickup es el mismo para todos los días de esa suscripción.
La validación de desviación ocurre **una sola vez** en el backend al crear/aceptar la suscripción.
No hay nada que validar por ocurrencia — solo filtrar.

Accept/reject/pause/cancel aplica al contrato completo (`subscribedDays` completos).
El frontend ya muestra day-badges por suscripción en `SubscriptionRequestCard`.

**Sin cambios de arquitectura requeridos.** Solo agregar `applicableDays` en gestión de waypoints (ver Layer B §4).

---

## Layer B — Day Variant Preview (nuevo)

Vista derivada que responde "¿cómo se ve la ruta los lunes?".
Computada **100% en el frontend** desde datos ya en el store. Sin APIs nuevas.

### Tipo `DayStop`

Análogo a `OrderedStop` de `plan_routine_trip.md` pero usa `RoutineSubscriptionResponse` en lugar de `RoutineBookingResponse`:

```typescript
type DayStop =
  | { kind: 'origin';      lat: number; lng: number; name: string }
  | { kind: 'waypoint';    data: RoutineWaypointResponse; routeIdx: number }
  | { kind: 'subscriber';  sub: RoutineSubscriptionResponse; routeIdx: number }
  | { kind: 'destination'; lat: number; lng: number; name: string };
```

### Hook `useDayVariant(routineTripId, day)`

Lee de stores existentes — no hace fetch propio.

```typescript
function useDayVariant(routineTripId: string, day: RecurrenceDay) {
  const routineTrip = routineTripsStore.getById(routineTripId);
  const waypoints = routineTripsStore.getWaypoints(routineTripId);
  const subscriptions = subscriptionsStore.subscriptionsByTrip[routineTripId] ?? [];

  const activeSubscriptions = subscriptions.filter(
    s => s.subscribedDays.includes(day) && s.status === 'ACCEPTED'
  );

  const activeWaypoints = waypoints.filter(
    wp => !wp.applicableDays?.length || wp.applicableDays.includes(day)
  );

  const dayStops = buildDayOrderedStops(routineTrip, activeSubscriptions, activeWaypoints);

  return { routineTrip, activeSubscriptions, activeWaypoints, dayStops };
}
```

### `buildDayOrderedStops()`

Mismo mecanismo `closestRouteIdx` de `RoutineRouteMapModal.tsx`:

1. Convertir `routeLine: [number, number][]` → `{ latitude, longitude }[]`
2. Para cada suscriptor: `closestRouteIdx(pickup, routePoints)` usando `customPickupLat/Lng` o coordenadas del waypoint elegido
3. Para cada waypoint activo: `orderIndex` como routeIdx base
4. Sort ascendente por routeIdx
5. Prepend origin, append destination

### Función de filtro de waypoints (degradación graceful)

```typescript
function waypointAppliesToDay(wp: RoutineWaypointResponse, day: RecurrenceDay): boolean {
  if (!wp.applicableDays?.length) return true; // sin campo → aplica todos los días
  return wp.applicableDays.includes(day);
}
```

### Integración: Tab "Días" en `app/routine/[id].tsx`

- `DaySelector` (componente existente, filtrado a `routineTrip.recurrenceDays`)
- Mapa reutilizando `OccurrenceMapView` pasando `DayStop[]` como `orderedStops`
- Lista de suscriptores activos ese día (read-only, sin acciones de booking)

---

## Layer C — Occurrence Detail (sin cambios al plan)

`plan_routine_trip.md` permanece exactamente igual.
`buildOrderedStops` ya filtra waypoints por `applicableDays` para la fecha de la ocurrencia.
Usa `RoutineBookingResponse[]` reales (estado real por fecha).

---

## Archivos

| Acción | Archivo |
|--------|---------|
| **Nuevo** | `src/hooks/useDayVariant.ts` |
| **Nuevo** | `src/components/routine/DayVariantView.tsx` |
| **Modificar** | `src/types/api.ts` — agregar `DayStop`, `applicableDays?: RecurrenceDay[]` en `RoutineWaypointResponse` |
| **Modificar** | `app/routine/[id].tsx` — agregar tab "Días" que monta `DayVariantView` |
| **Modificar** | `src/components/routine/RoutineEditRouteModal.tsx` — selector `applicableDays` por waypoint |
| **Sin cambios** | `plan_routine_trip.md` (Layer C) |

---

## Dependencias de Backend

### Layer B — sin bloqueo
Solo requiere campo opt-in `applicableDays?: RecurrenceDay[]` en `RoutineTripWaypoint` (MOD-4).
Sin él, funciona en degradación graceful (todos los waypoints aplican todos los días).

### Layer C — bloqueos reales

| Endpoint / Campo | Estado |
|---|---|
| `GET /v1/trips/{tripId}/routine-bookings` → `RoutineBookingResponse[]` | ❌ Falta |
| `PATCH /v1/bookings/{bookingId}/no-show` | ❌ Falta |
| Campo `applicableDays` en `RoutineTripWaypoint` (lectura + escritura) | ❌ MOD-4 pendiente |

---

## Ejemplo Visual

```
Suscripción A: subscribedDays=[MON,WED], pickup=@Calle80
Suscripción B: subscribedDays=[MON],     pickup=@Av72
Suscripción C: subscribedDays=[WED],     pickup=@Calle60

Layer B — Day Preview (template):
  Lunes     → [origin → wp1 → SubA@Calle80 → SubB@Av72 → dest]
  Martes    → [origin → wp1 → dest]  ← nadie suscrito
  Miércoles → [origin → wp1 → SubA@Calle80 → SubC@Calle60 → dest]

Layer C — Occurrencia 2026-05-04 (Lunes):
  [origin → wp1 → Booking:SubA(ACCEPTED)@Calle80 → Booking:SubB(NO_SHOW)@Av72 → dest]
  SubB marcado no-show SOLO ese día — suscripción sigue activa para próximos lunes
```

---

## Decisiones

- El pickup de una suscripción **no cambia por día** — el conductor lo aprueba una vez en Layer A
- `useDayVariant` **no tiene fetches propios** — usa el store ya poblado de `app/routine/[id].tsx`
- `applicableDays` en waypoints es **opt-in**: sin él todos aplican todos los días (backward compatible)
- Crear un waypoint con `applicableDays` **no migra** suscripciones existentes (per `PHASE4_BUSINESS_LOGIC.md §7.5`)

---

## Consideraciones Abiertas

1. **¿Tab vs. pantalla separada?**
   - Opción A (recomendada): tab "Días" dentro de `app/routine/[id].tsx` junto a Suscripciones y Ocurrencias — mantiene contexto del template sin fragmentar navegación
   - Opción B: pantalla separada `app/routine/[id]/day-preview.tsx`

2. **¿Reutilizar `OccurrenceMapView` para Layer B?**
   - Si `DayStop[]` expone la misma interfaz de coordenadas que `OrderedStop[]` (compatible con un adaptador o tipo union), sí
   - Alternativa: `DayVariantMapView` separado (más código, diferencia mínima)

3. **Prioridad de MOD-4 (`applicableDays`)**:
   Layer B funciona sin él pero muestra todos los waypoints en todos los días.
   Si la variación de waypoints entre días no es crítica en el MVP, se puede lanzar Layer B con degradación graceful y agregar `applicableDays` después.
