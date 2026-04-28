 Plan: Occurrence Detail + Driver Day-Of Variant Management                                                                                                                                             
                                                                                                                                                                                                        
 Context

 RoutineTrip = driver template con polyline (routeLine) y waypoints fijos.
 TripOccurrence = instancia individual por fecha (generada 14 días adelante).
 RoutineSubscription = contrato del pasajero.
 RoutineBookingResponse = reserva por ocurrencia por pasajero.

 Problema central: La pantalla de ocurrencias (/app/routine/[id]/occurrences.tsx) solo muestra lista de fechas/estados. No hay vista de mapa ni gestión de variantes por día. El conductor no puede ver
  quién sube hoy, en qué orden, ni administrar cambios puntuales.

 ---
 Gaps Confirmados

 ┌─────┬───────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────┐
 │  #  │                                  Gap                                  │                   Impacto                   │
 ├─────┼───────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────┤
 │ 1   │ No hay pantalla de detalle de ocurrencia con mapa                     │ Sin ruta visual por día                     │
 ├─────┼───────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────┤
 │ 2   │ No hay endpoint GET /v1/trips/{tripId}/routine-bookings               │ No se puede listar pasajeros por ocurrencia │
 ├─────┼───────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────┤
 │ 3   │ No hay markNoShow para RoutineBookingResponse                         │ No se puede marcar inasistencia             │
 ├─────┼───────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────┤
 │ 4   │ applicableDays en waypoints no implementado (MOD-4 backend pendiente) │ Waypoints aplican igual todos los días      │
 └─────┴───────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────┘

 ---
 Archivos Críticos (referencia)

 - app/routine/[id]/occurrences.tsx — lista ocurrencias, tiene handleView a modificar
 - app/routine/_layout.tsx — registrar nueva screen
 - src/types/api.ts — tipos RoutineWaypointResponse, RoutineBookingResponse
 - src/api/routine-subscriptions.ts — agregar markNoShow
 - src/api/trips.ts — agregar getOccurrenceBookings
 - src/reducers/subscription-detail.reducer.ts — patrón a replicar
 - src/components/routine/RoutineRouteMapModal.tsx — patrón closestRouteIdx a reusar
 - src/components/routine/RouteLineMapModal.tsx — patrón polyline doble-capa a reusar
 - src/components/LocationPickerModal.tsx — acepta routeLine prop, reusar para override pickup
 - src/components/routine/WaypointListItem.tsx — reusar en sección paradas
 - src/stores/routine-subscriptions-store.ts — subscriptionsByTrip[routineTripId] disponible

 ---
 Nuevos Archivos

 app/routine/[id]/occurrence/_layout.tsx         (nuevo — stack minimal)
 app/routine/[id]/occurrence/[tripId].tsx        (nuevo — pantalla detalle día)
 src/hooks/useOccurrenceDetail.ts                (nuevo — datos + acciones)
 src/reducers/occurrence-detail.reducer.ts       (nuevo — estado UI modales)
 src/components/routine/OccurrenceMapView.tsx    (nuevo — mapa inline)
 src/components/routine/OccurrencePassengerCard.tsx (nuevo — row por pasajero)

 ---
 Archivos a Modificar

 1. app/routine/_layout.tsx — agregar <Stack.Screen name="[id]/occurrence/[tripId]" options={{ title: 'Detalle del día' }} />
 2. app/routine/[id]/occurrences.tsx — cambiar handleView de /trip/[id] a /routine/[id]/occurrence/[tripId] pasando routineTripId
 3. src/api/routine-subscriptions.ts — agregar markNoShow(bookingId: string)
 4. src/api/trips.ts — agregar getOccurrenceBookings(tripId: string): Promise<RoutineBookingResponse[]>
 5. src/types/api.ts — agregar applicableDays?: RecurrenceDay[] a RoutineWaypointResponse

 ---
 Arquitectura del Hook useOccurrenceDetail

 useOccurrenceDetail(routineTripId, tripId)
 │
 ├── Fetch paralelo al montar:
 │   ├── tripsApi.getById(tripId)                    → TripResponse
 │   ├── tripsApi.getOccurrenceBookings(tripId)      → RoutineBookingResponse[]
 │   ├── routineTripsStore.getById(routineTripId)    → RoutineTripResponse (con routeLine)
 │   └── routineTripsStore.fetchWaypoints(routineTripId) → RoutineWaypointResponse[]
 │   └── if subscriptionsByTrip vacío → fetchForTrip(routineTripId)
 │
 ├── Derivado: buildOrderedStops()
 │   1. Convertir routeLine [lat,lng][] a {latitude,longitude}[]
 │   2. Filtrar waypoints por applicableDays si existe (degrade graceful si no)
 │   3. Para cada booking ACCEPTED: calcular closestRouteIdx del pickup
 │   4. Para cada waypoint: usar orderIndex como tiebreaker vs closestRouteIdx
 │   5. Sort ascendente → insertar origin (idx 0) y destination (idx last)
 │
 └── Acciones:
     ├── markNoShow(bookingId) → API + update local state
     ├── overridePickup(bookingId, lat, lng, name) → routineSubscriptionsApi.overridePickup() + update
     └── cancelOccurrence() → tripsApi.cancel(tripId) → navigate back

 Tipo OrderedStop

 type OrderedStop =
   | { kind: 'origin'; lat: number; lng: number; name: string }
   | { kind: 'waypoint'; data: RoutineWaypointResponse; routeIdx: number }
   | { kind: 'passenger'; booking: RoutineBookingResponse; sub: RoutineSubscriptionResponse; routeIdx: number }
   | { kind: 'destination'; lat: number; lng: number; name: string };

 ---
 Reducer occurrence-detail.reducer.ts

 Replicar patrón de subscription-detail.reducer.ts:

 type OccurrenceModal = 'map' | 'noShowConfirm' | 'overridePickup' | 'cancelConfirm';

 interface OccurrenceDetailState {
   activeModal: OccurrenceModal | null;
   selectedBookingId: string | null;
   isSubmitting: boolean;
   pendingOverrideLat: number | null;
   pendingOverrideLng: number | null;
   pendingOverrideName: string | null;
 }

 ---
 Layout de Pantalla occurrence/[tripId].tsx

 SafeAreaView
 ├── Header: fecha badge + status pill + hora salida + botón "Cancelar día" (si aplica)
 │
 ├── OccurrenceMapView  (height: 40% pantalla)
 │   └── polyline doble capa + markers por tipo
 │
 └── ScrollView (60%)
     ├── Sección "Paradas de la ruta"
     │   └── WaypointListItem[] (read-only, reusar existente)
     │
     ├── Sección "Pasajeros hoy"
     │   └── OccurrencePassengerCard[] por cada booking
     │       ├── avatar + nombre + badge verificado
     │       ├── punto de recogida + hora estimada
     │       ├── status badge
     │       └── botones [Marcar no presentado] [Cambiar punto] (solo si ACCEPTED + futuro)
     │
     └── Botón "Ver mapa completo" → fullscreen OccurrenceMapView en Modal

 ---
 Componente OccurrenceMapView

 interface OccurrenceMapViewProps {
   routeLine: [number, number][];
   origin: { latitude: number; longitude: number; name: string };
   destination: { latitude: number; longitude: number; name: string };
   orderedStops: OrderedStop[];
   style?: ViewStyle;
   fitOnMount?: boolean;
 }

 - Polyline shadow + main (misma técnica doble capa de RouteLineMapModal)
 - Origin: Colors.primary[600] verde
 - Waypoints template: Colors.primary[400] azul
 - Pickups pasajeros: Colors.accent[500] naranja
 - Destination: Colors.accent[600]
 - fitToCoordinates tras 400ms si fitOnMount=true
 - No es Modal — la pantalla lo embebe inline o dentro de Modal para fullscreen

 ---
 Flujo Override Pickup (variante del conductor)

 1. Conductor toca "Cambiar punto" en OccurrencePassengerCard
 2. Reducer: OPEN_OVERRIDE_PICKUP con bookingId
 3. Abre LocationPickerModal pasando routeLine={routineTrip.routeLine} → conductor ve la ruta en el mapa
 4. Al confirmar ubicación → SET_OVERRIDE_LOCATION
 5. Llama routineSubscriptionsApi.overridePickup(bookingId, { lat, lng, name })
 6. Update local booking state → CLOSE_MODAL

 ---
 applicableDays (MOD-4, degradación graceful)

 function waypointAppliesToDate(wp: RoutineWaypointResponse, date: Date): boolean {
   const applicable = wp.applicableDays;
   if (!applicable || applicable.length === 0) return true;
   const map: Record<number, RecurrenceDay> = {
     0:'SUN',1:'MON',2:'TUE',3:'WED',4:'THU',5:'FRI',6:'SAT'
   };
   return applicable.includes(map[date.getDay()]);
 }

 Cuando el backend implemente MOD-4 (Sprint 3 del plan de waypoints), solo se agrega el campo en src/types/api.ts y se remueve el cast.

 ---
 Orden de Implementación

 ┌──────┬───────────────────────────────────────────────────────────────┬─────────────┐
 │ Paso │                             Tarea                             │ Tiempo est. │
 ├──────┼───────────────────────────────────────────────────────────────┼─────────────┤
 │ 1    │ API: markNoShow + getOccurrenceBookings + tipo applicableDays │ 30 min      │
 ├──────┼───────────────────────────────────────────────────────────────┼─────────────┤
 │ 2    │ Reducer occurrence-detail.reducer.ts                          │ 1h          │
 ├──────┼───────────────────────────────────────────────────────────────┼─────────────┤
 │ 3    │ Hook useOccurrenceDetail con buildOrderedStops                │ 2-3h        │
 ├──────┼───────────────────────────────────────────────────────────────┼─────────────┤
 │ 4    │ Componente OccurrenceMapView                                  │ 2h          │
 ├──────┼───────────────────────────────────────────────────────────────┼─────────────┤
 │ 5    │ Componente OccurrencePassengerCard                            │ 1.5h        │
 ├──────┼───────────────────────────────────────────────────────────────┼─────────────┤
 │ 6    │ Pantalla occurrence/[tripId].tsx + modales                    │ 3h          │
 ├──────┼───────────────────────────────────────────────────────────────┼─────────────┤
 │ 7    │ Layout + wiring navegación en occurrences.tsx                 │ 30 min      │
 ├──────┼───────────────────────────────────────────────────────────────┼─────────────┤
 │ 8    │ Estados carga/vacío/error                                     │ 30 min      │
 └──────┴───────────────────────────────────────────────────────────────┴─────────────┘

 Total estimado: ~11h