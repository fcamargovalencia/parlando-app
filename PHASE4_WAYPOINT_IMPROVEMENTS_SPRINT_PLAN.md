# Fase 4 — Mejoras de Waypoints: Plan de Implementación por Sprints

> Referencia: `PHASE4_BUSINESS_LOGIC.md` §4, §7.2, §7.5, §13 (reglas 16–21)  
> Rama sugerida: `feature/phase4-waypoint-improvements`

---

## Resumen de cambios

| MOD | Descripción | Estado actual | Acción |
|-----|-------------|--------------|--------|
| MOD-1 | Waypoints en `ACTIVE` se propagan a ocurrencias existentes | ✅ Ya implementado | Solo verificar |
| MOD-2 | Reordenar waypoints en `ACTIVE` propaga el orden a ocurrencias futuras | ⚠️ Código existe, sin propagación | Agregar FK + propagación |
| MOD-3 | Pasajero puede seleccionar `ORIGIN` explícitamente como pickup | ✅ Ya implementado en código | Solo documentación |
| MOD-4 | Waypoints con `applicableDays` — solo afectan ocurrencias en esos días | ❌ No implementado | Implementación completa |

---

## Dependencias entre MODs

```
MOD-2 (FK en route_waypoints)
  └─► MOD-4 usa mismo toRouteWaypoint() que MOD-2 actualiza
         └─► ambos modifican OccurrenceGeneratorService
```

MOD-3 es independiente (solo docs, ya hecho en PHASE4_BUSINESS_LOGIC.md).

---

## Sprint 1 — Fundación: FK `route_waypoints → routine_trip_waypoints`

**Objetivo:** Establecer el vínculo entre `RouteWaypoint` y su `RoutineTripWaypoint` de origen, base para la propagación de reordenamiento.

**Duración estimada:** 1–2 días

### 1.1 DB Migration V46

**Archivo:** `src/main/resources/db/migration/V46__alter_route_waypoints_add_routine_waypoint_ref.sql`

```sql
ALTER TABLE route_waypoints
  ADD COLUMN routine_trip_waypoint_id UUID NULL
  REFERENCES routine_trip_waypoints(id) ON DELETE SET NULL;

CREATE INDEX idx_route_waypoints_routine_waypoint_id
  ON route_waypoints(routine_trip_waypoint_id);
```

> **Nullable** porque los waypoints custom de pasajeros (`ACCEPTED_CUSTOM`) no tienen origen en la plantilla.

### 1.2 Domain — `RouteWaypoint`

**Archivo:** `src/main/java/com/parlando/api/domain/model/RouteWaypoint.java`

Agregar campo:
```java
String routineTripWaypointId;  // null para waypoints custom de pasajeros
```

### 1.3 Entity — `RouteWaypointEntity`

**Archivo:** `src/main/java/com/parlando/api/infrastructure/out/persistence/entity/RouteWaypointEntity.java`

Agregar:
```java
@Column("routine_trip_waypoint_id")
String routineTripWaypointId;
```

### 1.4 Mapper — `RouteWaypointEntityMapper`

**Archivo:** `src/main/java/com/parlando/api/infrastructure/out/persistence/mapper/RouteWaypointEntityMapper.java`

Mapear el nuevo campo en ambas direcciones (entity ↔ domain).

### 1.5 `OccurrenceGeneratorService.toRouteWaypoint()`

**Archivo:** `src/main/java/com/parlando/api/application/service/OccurrenceGeneratorService.java` — línea ~188

```java
return RouteWaypoint.builder()
    .tripId(trip.getId())
    .orderIndex(w.getOrderIndex())
    .latitude(w.getLatitude())
    .longitude(w.getLongitude())
    .name(w.getName())
    .subtitle(w.getSubtitle())
    .isPickupPoint(w.getIsPickupPoint())
    .estimatedArrival(estimatedArrival)
    .routineTripWaypointId(w.getId())   // ← nuevo
    .build();
```

### Criterios de aceptación Sprint 1

- [ ] Migración aplica sin errores en local y CI
- [ ] Al generar una ocurrencia nueva, todos sus `route_waypoints` de plantilla tienen `routine_trip_waypoint_id` poblado
- [ ] Los `route_waypoints` custom de pasajeros siguen con `routine_trip_waypoint_id = NULL`
- [ ] Tests unitarios de `OccurrenceGeneratorService` actualizados para verificar el campo

---

## Sprint 2 — Propagación de reordenamiento en `ACTIVE`

**Objetivo:** Cuando el conductor reordena waypoints en una plantilla `ACTIVE`, las ocurrencias futuras publicadas reflejan el nuevo orden.

**Duración estimada:** 2–3 días  
**Dependencia:** Sprint 1 completado (FK disponible)

### 2.1 Repository — nuevo método de actualización

**Puerto:** `src/main/java/com/parlando/api/domain/port/out/RouteWaypointRepositoryPort.java`

```java
Mono<Void> updateOrderIndex(String tripId, String routineTripWaypointId, int newOrderIndex);
```

**Adapter:** `src/main/java/com/parlando/api/infrastructure/out/persistence/adapter/RouteWaypointRepositoryAdapter.java`

```java
@Override
public Mono<Void> updateOrderIndex(String tripId, String routineTripWaypointId, int newOrderIndex) {
    return databaseClient
        .sql("UPDATE route_waypoints SET order_index = $3 " +
             "WHERE trip_id = $1 AND routine_trip_waypoint_id = $2")
        .bind(0, UUID.fromString(tripId))
        .bind(1, UUID.fromString(routineTripWaypointId))
        .bind(2, newOrderIndex)
        .fetch().rowsUpdated().then();
}
```

### 2.2 `OccurrenceGeneratorService` — nuevo método de propagación de reorden

**Archivo:** `src/main/java/com/parlando/api/application/service/OccurrenceGeneratorService.java`

```java
/**
 * Propaga el nuevo order_index de cada waypoint a todas las ocurrencias futuras publicadas.
 * Solo actualiza route_waypoints con routine_trip_waypoint_id coincidente (no afecta custom).
 */
public Mono<Void> propagateReorderToFutureOccurrences(
        String routineTripId, List<RoutineTripWaypoint> reorderedWaypoints) {
    return tripRepository
        .findFuturePublishedByRoutineTripId(routineTripId)
        .flatMap(trip ->
            Flux.fromIterable(reorderedWaypoints)
                .flatMap(w -> waypointRepository
                    .updateOrderIndex(trip.getId(), w.getId(), w.getOrderIndex()))
                .then())
        .then()
        .doOnError(e -> log.error(
            "Error propagating reorder to future occurrences of routine trip {}", routineTripId, e));
}
```

### 2.3 `RoutineTripService.reorderWaypoints()` — agregar propagación

**Archivo:** `src/main/java/com/parlando/api/application/service/RoutineTripService.java` — línea ~285

```java
return waypointRepository
    .reorder(routineTripId, cmd.orderedIds())
    .then(waypointRepository.findByRoutineTripId(routineTripId).collectList())
    .flatMap(updatedWaypoints -> {
        Mono<Void> propagation = rt.getStatus() == RoutineTripStatus.ACTIVE
            ? occurrenceGenerator.propagateReorderToFutureOccurrences(routineTripId, updatedWaypoints)
            : Mono.empty();
        return propagation.thenReturn(Result.success(updatedWaypoints));
    });
```

### Criterios de aceptación Sprint 2

- [ ] Reordenar waypoints en `DRAFT`: sin propagación, funciona igual que antes
- [ ] Reordenar waypoints en `ACTIVE`: `order_index` actualizado en todas las ocurrencias futuras publicadas
- [ ] Waypoints custom (`routine_trip_waypoint_id IS NULL`) no son afectados por el reorden
- [ ] Test de integración: crear plantilla, publicar, generar ocurrencias, reordenar, verificar `order_index` en BD

---

## Sprint 3 — `applicableDays` en `RoutineTripWaypoint`

**Objetivo:** Los waypoints pueden tener días específicos de aplicación. Solo las ocurrencias en esos días reciben el waypoint.

**Duración estimada:** 3–4 días  
**Dependencia:** Sprint 1 completado

### 3.1 DB Migration V47

**Archivo:** `src/main/resources/db/migration/V47__alter_routine_trip_waypoints_add_applicable_days.sql`

```sql
ALTER TABLE routine_trip_waypoints
  ADD COLUMN applicable_days TEXT[] NULL;

COMMENT ON COLUMN routine_trip_waypoints.applicable_days IS
  'NULL = aplica en todos los días de recurrencia de la plantilla. '
  'No-null = solo propagarse/copiarse a ocurrencias cuyo día de semana esté en este arreglo.';
```

### 3.2 Domain — `RoutineTripWaypoint`

**Archivo:** `src/main/java/com/parlando/api/domain/model/RoutineTripWaypoint.java`

```java
List<RecurrenceDay> applicableDays;  // null = todos los días
```

### 3.3 Entity — `RoutineTripWaypointEntity`

**Archivo:** `src/main/java/com/parlando/api/infrastructure/out/persistence/entity/RoutineTripWaypointEntity.java`

```java
@Column("applicable_days")
List<String> applicableDays;  // almacenado como TEXT[]
```

### 3.4 Mapper — `RoutineTripWaypointEntityMapper`

**Archivo:** `src/main/java/com/parlando/api/infrastructure/out/persistence/mapper/RoutineTripWaypointEntityMapper.java`

Mapear `List<String>` ↔ `List<RecurrenceDay>` usando `RecurrenceDay.valueOf()` / `.name()`.

### 3.5 Command y DTO

**`AddRoutineTripWaypointCommand`:**
```java
List<RecurrenceDay> applicableDays;  // nullable
```

**`AddRoutineTripWaypointRequest`** (HTTP DTO):
```java
List<String> applicableDays;  // nullable; validado como subset de recurrenceDays en servicio
```

**Mapper** de request → command: pasar `applicableDays`.

### 3.6 Validación en `RoutineTripService.addWaypoint()`

Agregar validación cuando el trip está `ACTIVE` y `cmd.applicableDays() != null`:

```java
if (cmd.applicableDays() != null && !cmd.applicableDays().isEmpty()) {
    List<RecurrenceDay> routineDays = rt.getRecurrenceDays();
    if (!routineDays.containsAll(cmd.applicableDays())) {
        return Mono.just(Result.badRequest(
            "applicableDays debe ser subconjunto de los días de recurrencia de la ruta: "
            + routineDays));
    }
}
```

### 3.7 Filtro de propagación — `OccurrenceGeneratorService.propagateWaypointToFutureOccurrences()`

**Archivo:** `src/main/java/com/parlando/api/application/service/OccurrenceGeneratorService.java` — línea ~58

```java
public Mono<Void> propagateWaypointToFutureOccurrences(RoutineTripWaypoint templateWaypoint) {
    return tripRepository
        .findFuturePublishedByRoutineTripId(templateWaypoint.getRoutineTripId())
        .filter(trip -> {
            List<RecurrenceDay> applicable = templateWaypoint.getApplicableDays();
            if (applicable == null || applicable.isEmpty()) return true;
            RecurrenceDay tripDay = RecurrenceDay.from(
                trip.getDepartureAt().toLocalDate().getDayOfWeek());
            return applicable.contains(tripDay);
        })
        .flatMap(trip -> waypointRepository.save(toRouteWaypoint(templateWaypoint, trip)))
        .then()
        .doOnError(e -> log.error(
            "Error propagating waypoint to future occurrences of routine trip {}",
            templateWaypoint.getRoutineTripId(), e));
}
```

### 3.8 Filtro en generación de ocurrencias — `copyWaypointsAndPolyline()`

**Archivo:** `src/main/java/com/parlando/api/application/service/OccurrenceGeneratorService.java` — línea ~161

Refactorizar para recibir la fecha de la ocurrencia:

```java
// Cambiar firma:
private Mono<Void> copyWaypointsAndPolyline(RoutineTrip rt, Trip savedTrip, LocalDate occurrenceDate)

// Filtrar waypoints por applicable_days:
List<RouteWaypoint> occurrenceWaypoints = waypoints.stream()
    .filter(w -> {
        List<RecurrenceDay> applicable = w.getApplicableDays();
        if (applicable == null || applicable.isEmpty()) return true;
        return applicable.contains(RecurrenceDay.from(occurrenceDate.getDayOfWeek()));
    })
    .map(w -> toRouteWaypoint(w, savedTrip))
    .toList();
```

Actualizar la llamada desde `createOccurrenceTrip()` para pasar `date`:
```java
// Línea ~151:
return copyWaypointsAndPolyline(rt, saved, date)
```

### Criterios de aceptación Sprint 3

- [ ] Agregar waypoint sin `applicableDays` → comportamiento idéntico al actual (propaga a todos)
- [ ] Agregar waypoint con `applicableDays = [MON]` en plantilla MON–FRI → solo ocurrencias de lunes reciben el waypoint
- [ ] `applicableDays` con días fuera de `recurrenceDays` → error `400`
- [ ] Nueva ocurrencia generada por scheduler → respeta `applicableDays` al copiar waypoints
- [ ] Test: plantilla MON/WED/FRI, waypoint con `applicableDays = [WED]`, generar ocurrencias para semana completa, verificar que solo la de miércoles tiene el waypoint

---

## Sprint 4 — Verificación, Tests y Cierre

**Objetivo:** Tests de integración end-to-end, limpieza y verificación de todos los MODs.

**Duración estimada:** 2 días

### 4.1 Verificar MOD-1 (ya implementado)

- [ ] Test: plantilla en `DRAFT` → publicar → agregar waypoint en `ACTIVE` → verificar que todas las ocurrencias futuras tienen el `RouteWaypoint`
- [ ] Test: agregar waypoint a trip `DRAFT` → sin propagación (no hay ocurrencias)
- [ ] Revisar que `OccurrenceGeneratorServiceTest` cubre `propagateWaypointToFutureOccurrences`

### 4.2 Tests de integración MOD-2

- [ ] Reordenar en `DRAFT`: sin cambio en ocurrencias
- [ ] Reordenar en `ACTIVE`: `route_waypoints.order_index` actualizados en ocurrencias futuras
- [ ] Waypoints custom de pasajeros no afectados

### 4.3 Tests de integración MOD-4

- [ ] Propagación filtrada por `applicableDays`
- [ ] Generación de nueva ocurrencia respeta `applicableDays`
- [ ] Validación de días inválidos

### 4.4 Tests de MOD-3 (ORIGIN)

- [ ] Crear suscripción con `pickupType = ORIGIN` explícito → guardado correctamente
- [ ] Crear suscripción sin campos de pickup → `pickupType = ORIGIN` por defecto
- [ ] Crear suscripción con `pickupType = ORIGIN` aunque existan waypoints en la plantilla → válido

### 4.5 Actualización del plan de arquitectura

- [ ] Actualizar `PHASE4_ROUTINE_TRIPS_PLAN.md` con referencia a las migraciones V46 y V47
- [ ] Documentar `applicable_days` en `ROUTINE_TRIPS_FRONTEND_SPEC.md` si existe spec de frontend

---

## Resumen de archivos por sprint

### Sprint 1 — FK Foundation
```
src/main/resources/db/migration/V46__alter_route_waypoints_add_routine_waypoint_ref.sql  [NUEVO]
src/.../domain/model/RouteWaypoint.java                                                    [EDIT]
src/.../persistence/entity/RouteWaypointEntity.java                                        [EDIT]
src/.../persistence/mapper/RouteWaypointEntityMapper.java                                  [EDIT]
src/.../application/service/OccurrenceGeneratorService.java                                [EDIT: toRouteWaypoint()]
```

### Sprint 2 — Reorder Propagation
```
src/.../domain/port/out/RouteWaypointRepositoryPort.java                                   [EDIT]
src/.../persistence/adapter/RouteWaypointRepositoryAdapter.java                            [EDIT]
src/.../application/service/OccurrenceGeneratorService.java                                [EDIT: propagateReorderToFutureOccurrences()]
src/.../application/service/RoutineTripService.java                                        [EDIT: reorderWaypoints()]
```

### Sprint 3 — applicableDays
```
src/main/resources/db/migration/V47__alter_routine_trip_waypoints_add_applicable_days.sql [NUEVO]
src/.../domain/model/RoutineTripWaypoint.java                                              [EDIT]
src/.../persistence/entity/RoutineTripWaypointEntity.java                                  [EDIT]
src/.../persistence/mapper/RoutineTripWaypointEntityMapper.java                            [EDIT]
src/.../application/commands/routine/AddRoutineTripWaypointCommand.java                    [EDIT]
src/.../web/dto/request/AddRoutineTripWaypointRequest.java                                 [EDIT]
src/.../application/service/OccurrenceGeneratorService.java                                [EDIT: propagate filter + copyWaypointsAndPolyline()]
src/.../application/service/RoutineTripService.java                                        [EDIT: validación applicableDays]
```

### Sprint 4 — Tests
```
src/test/.../service/OccurrenceGeneratorServiceTest.java                                   [EDIT]
src/test/.../service/RoutineTripServiceTest.java                                            [EDIT]
src/test/.../service/RoutineSubscriptionServiceTest.java                                    [EDIT]
docs/PHASE4_BUSINESS_LOGIC.md                                                              [EDIT — ya hecho]
```

---

## Notas de implementación

### Sobre `RecurrenceDay.from(DayOfWeek)`
Este método ya existe en el enum. Úsarlo en los filtros de `applicableDays` para convertir la fecha de la ocurrencia a `RecurrenceDay`.

### Orden de migraciones
`V46` debe aplicar antes que `V47` porque son tablas distintas y no tienen dependencia entre sí. Sin embargo, `V46` debe existir en BD antes de que `toRouteWaypoint()` empiece a popular el campo.

### Backwards compatibility
- `routine_trip_waypoint_id` es nullable → ocurrencias existentes quedan con `NULL` sin problemas
- `applicable_days` es nullable → waypoints existentes aplican a todos los días (comportamiento actual preservado)
- No hay cambios breaking en el API de suscripciones ni bookings
