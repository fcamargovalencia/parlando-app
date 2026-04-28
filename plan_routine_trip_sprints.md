# Plan: Occurrence Detail + Driver Day-Of Variant Management

## Contexto

**Problema:** La pantalla de ocurrencias solo lista fechas/estados. No hay vista de mapa por día ni gestión de variantes puntuales. El conductor no puede ver quién sube hoy, el orden de recogida, ni administrar cambios (no-show, override pickup, cancelar día).

**Jerarquía de datos:**
```
RoutineTrip (template con routeLine + waypoints fijos)
  └── TripOccurrence (instancia por fecha)
        └── RoutineBooking[] (una por pasajero suscritor ese día)
              └── RoutineSubscription (contrato del pasajero)
```

---

## Gaps del Estado Actual

| # | Gap | Bloquea |
|---|-----|---------|
| G1 | No endpoint `GET /v1/trips/{tripId}/routine-bookings` | Ver pasajeros por ocurrencia |
| G2 | No `markNoShow` para `RoutineBookingResponse` | Marcar inasistencia |
| G3 | `applicableDays` en waypoints no implementado (MOD-4 backend pendiente) | Filtro de paradas por día |
| G4 | No screen de detalle de ocurrencia | Todo lo demás |

---

## Archivos Críticos de Referencia

| Archivo | Por qué es relevante |
|---------|---------------------|
| `app/routine/[id]/occurrences.tsx` | `handleView` a modificar para nueva navegación |
| `app/routine/_layout.tsx` | Registrar nueva screen |
| `src/reducers/subscription-detail.reducer.ts` | Patrón exacto a replicar |
| `src/components/routine/RoutineRouteMapModal.tsx` | Patrón `closestRouteIdx` + polyline doble capa |
| `src/components/routine/RouteLineMapModal.tsx` | Patrón polyline doble capa (más simple) |
| `src/components/LocationPickerModal.tsx` | Acepta `routeLine` prop — reusar para override pickup |
| `src/components/routine/WaypointListItem.tsx` | Reusar en sección paradas (read-only) |
| `src/stores/routine-subscriptions-store.ts` | `subscriptionsByTrip[routineTripId]` disponible para correlación |
| `src/types/api.ts` | Tipos `RoutineWaypointResponse`, `RoutineBookingResponse` |
| `src/api/routine-subscriptions.ts` | Agregar `markNoShow` |
| `src/api/trips.ts` | Agregar `getOccurrenceBookings` |

---

## Tipo Central: `OrderedStop`

```typescript
type OrderedStop =
  | { kind: 'origin';      lat: number; lng: number; name: string }
  | { kind: 'waypoint';    data: RoutineWaypointResponse; routeIdx: number }
  | { kind: 'passenger';   booking: RoutineBookingResponse; sub: RoutineSubscriptionResponse; routeIdx: number }
  | { kind: 'destination'; lat: number; lng: number; name: string };
```

---

## Sprint 1 — Foundation: Tipos, API, Reducer
**Estimado: ~2h**

### Tareas

**S1-T1: Tipos** (`src/types/api.ts`)
- Agregar `applicableDays?: RecurrenceDay[]` a `RoutineWaypointResponse`

**S1-T2: API — subscriptions** (`src/api/routine-subscriptions.ts`)
```typescript
markNoShow: (bookingId: string) =>
  api.patch(`/v1/bookings/${bookingId}/no-show`)
```

**S1-T3: API — trips** (`src/api/trips.ts`)
```typescript
getOccurrenceBookings: (tripId: string): Promise<RoutineBookingResponse[]> =>
  api.get(`/v1/trips/${tripId}/routine-bookings`).then(r => r.data)
```
> Si el endpoint backend no existe aún → workaround: usar `subscriptionsByTrip` + filtrar por `occurrenceDate`

**S1-T4: Reducer** (`src/reducers/occurrence-detail.reducer.ts`)

Replicar patrón de `subscription-detail.reducer.ts`:
```typescript
type OccurrenceModal = 'map' | 'noShowConfirm' | 'overridePickup' | 'cancelConfirm';

interface OccurrenceDetailState {
  activeModal: OccurrenceModal | null;
  selectedBookingId: string | null;
  isSubmitting: boolean;
  pendingOverrideLat: number | null;
  pendingOverrideLng: number | null;
  pendingOverrideName: string | null;
}
```

Actions: `OPEN_MAP | OPEN_NO_SHOW | OPEN_OVERRIDE_PICKUP | SET_OVERRIDE_LOCATION | OPEN_CANCEL_CONFIRM | CLOSE_MODAL | SET_SUBMITTING`

### Criterios de Aceptación S1
- [ ] TypeScript compila sin errores
- [ ] `markNoShow` y `getOccurrenceBookings` exportados desde sus módulos
- [ ] Reducer maneja todas las transiciones de modal

---

## Sprint 2 — Data Layer: Hook `useOccurrenceDetail`
**Estimado: ~3h**

**Archivo:** `src/hooks/useOccurrenceDetail.ts`

### Fetch paralelo al montar
```typescript
const [occurrence, bookings] = await Promise.all([
  tripsApi.getById(tripId),
  tripsApi.getOccurrenceBookings(tripId),
]);
// Template y waypoints desde store (ya cacheado o fetch on-demand)
if (!routineTripsStore.getById(routineTripId)) {
  await routineTripsStore.fetchById(routineTripId);
}
if (waypoints.length === 0) {
  await routineTripsStore.fetchWaypoints(routineTripId);
}
if (!subscriptionsByTrip[routineTripId]) {
  await subscriptionsStore.fetchForTrip(routineTripId);
}
```

### `buildOrderedStops()`
1. Convertir `routeLine: [number, number][]` → `{latitude, longitude}[]` (índice 0 = lat, índice 1 = lng, igual que en `RoutineRouteMapModal`)
2. Filtrar waypoints por `applicableDays` (si existe) según día de la ocurrencia
3. Para cada booking con `status === 'ACCEPTED'`: `closestRouteIdx(pickup, routePoints)` (patrón de `RoutineRouteMapModal`)
4. Para cada waypoint: usar `orderIndex` como posición base
5. Sort ascendente por `routeIdx`
6. Prepend origin, append destination

```typescript
function waypointAppliesToDate(wp: RoutineWaypointResponse, date: Date): boolean {
  if (!wp.applicableDays?.length) return true;
  const map: Record<number, RecurrenceDay> = {
    0:'SUN',1:'MON',2:'TUE',3:'WED',4:'THU',5:'FRI',6:'SAT'
  };
  return wp.applicableDays.includes(map[date.getDay()]);
}
```

### Acciones expuestas
```typescript
markNoShow(bookingId: string): Promise<void>
overridePickup(bookingId: string, lat: number, lng: number, name: string): Promise<void>
cancelOccurrence(): Promise<void>  // → navigate back on success
refetch(): void
```

### Retorno del hook
```typescript
{
  occurrence: TripResponse | null,
  routineTrip: RoutineTripResponse | null,
  waypoints: RoutineWaypointResponse[],
  bookings: RoutineBookingResponse[],
  orderedStops: OrderedStop[],
  isLoading: boolean,
  error: string | null,
  actions: { markNoShow, overridePickup, cancelOccurrence, refetch }
}
```

### Criterios de Aceptación S2
- [ ] `orderedStops` correctamente ordenados según posición en polyline
- [ ] Sin llamadas duplicadas al store si datos ya cacheados
- [ ] `markNoShow` actualiza estado local sin refetch completo
- [ ] `cancelOccurrence` navega back al completar

---

## Sprint 3 — Componente: `OccurrenceMapView`
**Estimado: ~2h**

**Archivo:** `src/components/routine/OccurrenceMapView.tsx`

```typescript
interface OccurrenceMapViewProps {
  routeLine: [number, number][];
  origin: { latitude: number; longitude: number; name: string };
  destination: { latitude: number; longitude: number; name: string };
  orderedStops: OrderedStop[];
  style?: ViewStyle;
  fitOnMount?: boolean;
}
```

### Implementación
- Polyline doble capa: shadow gris + main `Colors.primary[500]` (técnica de `RouteLineMapModal`)
- Markers diferenciados:
  - Origin: `Colors.primary[600]` verde
  - Waypoints template: `Colors.primary[400]` azul
  - Pickups pasajeros: `Colors.accent[500]` naranja
  - Destination: `Colors.accent[600]` rojo
- `fitToCoordinates` tras 400ms si `fitOnMount=true` (patrón existente)
- **No es Modal** — pantalla controla si va inline (split 40/60) o fullscreen en Modal

### Criterios de Aceptación S3
- [ ] Polyline visible con todos los stops renderizados
- [ ] Colores distintos por tipo de stop
- [ ] `fitOnMount` encuadra todos los markers
- [ ] Funciona como component inline Y dentro de Modal

---

## Sprint 4 — Componente: `OccurrencePassengerCard`
**Estimado: ~1.5h**

**Archivo:** `src/components/routine/OccurrencePassengerCard.tsx`

```typescript
interface OccurrencePassengerCardProps {
  booking: RoutineBookingResponse;
  subscription: RoutineSubscriptionResponse;
  stopIndex: number;           // 1-based, label de orden en ruta
  onMarkNoShow: (bookingId: string) => void;
  onOverridePickup: (bookingId: string) => void;
  occurrenceIsFuture: boolean; // controla visibilidad de acciones
}
```

### UI
- Reusar `Avatar` con `verified={subscription.passenger?.verified}` (mismo patrón que `SubscriptionRequestCard`)
- Mostrar: nombre, `pickupName` o dirección, `estimatedPickupTime`, status badge
- `[Marcar no presentado]` → solo si `booking.status === 'ACCEPTED'` && `occurrenceIsFuture`
- `[Cambiar punto]` → solo si `booking.status === 'ACCEPTED'` && `occurrenceIsFuture`
- Status NO_SHOW: badge rojo, acciones ocultas

### Criterios de Aceptación S4
- [ ] Acciones ocultas para ocurrencias pasadas
- [ ] Badge correcto para cada status
- [ ] Stop index visible como indicador de orden

---

## Sprint 5 — Pantalla + Navegación
**Estimado: ~4h**

### Archivos nuevos

**`app/routine/[id]/occurrence/_layout.tsx`**
```typescript
export default function OccurrenceLayout() {
  return <Stack />;
}
```

**`app/routine/[id]/occurrence/[tripId].tsx`** — pantalla principal

Layout:
```
SafeAreaView
├── Header: fecha + status pill + hora + "Cancelar día" (si cancellable)
├── OccurrenceMapView  (flex 0.4)
└── ScrollView (flex 0.6)
    ├── Sección "Paradas de la ruta"
    │   └── WaypointListItem[] (read-only, existente)
    ├── Sección "Pasajeros hoy"
    │   └── OccurrencePassengerCard[] ordenados por routeIdx
    └── Botón "Ver mapa completo" → Modal fullscreen con OccurrenceMapView
```

Modales (controlados por reducer):
- **`map`**: OccurrenceMapView fullscreen
- **`noShowConfirm`**: ConfirmModal → `actions.markNoShow(selectedBookingId)`
- **`overridePickup`**: LocationPickerModal con `routeLine={routineTrip.routeLine}` → `SET_OVERRIDE_LOCATION` → `actions.overridePickup(...)`
- **`cancelConfirm`**: ConfirmModal → `actions.cancelOccurrence()`

### Archivos modificados

**`app/routine/_layout.tsx`**
```typescript
<Stack.Screen name="[id]/occurrence/[tripId]" options={{ title: 'Detalle del día' }} />
```

**`app/routine/[id]/occurrences.tsx`**
```typescript
// Antes:
router.push({ pathname: '/trip/[id]', params: { id: tripId } });

// Después:
router.push({
  pathname: '/routine/[id]/occurrence/[tripId]',
  params: { id: routineTripId, tripId: occurrence.id }
} as any);
```
> `routineTripId` ya disponible via `useLocalSearchParams()` en esa pantalla

### Criterios de Aceptación S5
- [ ] Tap en ocurrencia navega a detalle correcto
- [ ] Mapa carga con polyline y markers
- [ ] Pasajeros listados en orden de recogida
- [ ] No-show: confirmación → badge cambia → botones desaparecen
- [ ] Override pickup: LocationPickerModal con ruta visible → actualiza marker en mapa
- [ ] Cancelar día: confirmación → navega back → ocurrencia aparece CANCELLED

---

## Sprint 6 — Polish: Estados de Carga, Vacío y Error
**Estimado: ~1h**

- Skeleton o `<ActivityIndicator>` mientras carga
- Empty state: "Sin pasajeros para este día" (válido para ocurrencias sin bookings)
- Error state: mensaje + botón Reintentar
- Disable acciones durante `isSubmitting`

### Criterios de Aceptación S6
- [ ] No pantalla en blanco durante carga
- [ ] Empty state visible y no confuso
- [ ] Botones deshabilitados (con spinner) durante submit
- [ ] Error recuperable sin navegar

---

## Resumen de Archivos

| Acción | Archivo |
|--------|---------|
| Nuevo | `app/routine/[id]/occurrence/_layout.tsx` |
| Nuevo | `app/routine/[id]/occurrence/[tripId].tsx` |
| Nuevo | `src/hooks/useOccurrenceDetail.ts` |
| Nuevo | `src/reducers/occurrence-detail.reducer.ts` |
| Nuevo | `src/components/routine/OccurrenceMapView.tsx` |
| Nuevo | `src/components/routine/OccurrencePassengerCard.tsx` |
| Modificar | `app/routine/_layout.tsx` |
| Modificar | `app/routine/[id]/occurrences.tsx` |
| Modificar | `src/api/routine-subscriptions.ts` |
| Modificar | `src/api/trips.ts` |
| Modificar | `src/types/api.ts` |

**Total estimado: ~13.5h**
