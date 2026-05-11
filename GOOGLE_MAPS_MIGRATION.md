# Migración TomTom → Google Maps API

## Contexto

`react-native-maps` ya usa Google Maps tiles en Android con la key del `app.json`. TomTom se usa únicamente para 3 servicios (search, geocode, routing) que se reemplazarán por sus equivalentes de Google. La API pública de `@/lib/tomtom` se mantiene idéntica — los 10+ archivos consumidores **no se tocan**. El backend Parlando **no se ve afectado**.

---

## Prerequisito: Google Cloud Console

Verificar que la API key `AIzaSyCoH_l5VxTOfr_pJ2yYitH6tUZl2nxinFQ` tenga habilitadas:

- [ ] Maps SDK for Android *(ya activo)*
- [ ] Maps SDK for iOS
- [ ] Places API
- [ ] Geocoding API
- [ ] Directions API

---

## Sprint 1 — Config y Routing

**Objetivo**: reemplazar el cálculo de rutas (el servicio más crítico, usado en publicar viaje y modales de mapa).

### Tareas

- [x] **1.1** — `src/constants/config.ts`: agregar `GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''`
- [ ] **1.2** — `.env`: agregar `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<key>`
- [x] **1.3** — `src/lib/tomtom-routing.ts`: reemplazar TomTom Routing con Google Directions API
  - Endpoint: `https://maps.googleapis.com/maps/api/directions/json`
  - Parámetros: `alternatives=true`, `language=es`, `region=co`
  - Implementar decoder de Google encoded polyline (~25 líneas, sin librería)
  - Mapear: `legs[].duration.value` → `travelTimeInSeconds`, `legs[].distance.value / 1000` → `distanceKm`
  - `hasTolls`: siempre `false`
  - Alternativas: hasta 3 routes del mismo response
- [x] **1.4** — `src/lib/tomtom.ts`: guards de routing y `isConfigured()` actualizados a `GOOGLE_MAPS_API_KEY`

### Verificación

- [ ] Publicar un viaje → polyline se guarda en backend con coordenadas correctas
- [ ] `RoutineRouteMapModal` → ruta se dibuja correctamente
- [ ] `OccurrenceMapView` → ruta pasa por todos los stops
- [ ] `useRouteAlternatives` → muestra alternativas con tiempos y distancias

---

## Sprint 2 — Reverse Geocoding

**Objetivo**: reemplazar el geocodeo inverso (pin en mapa → nombre de dirección).

### Tareas

- [x] **2.1** — `src/lib/tomtom-geocode.ts`: reemplazar TomTom reverse geocode con Google Geocoding API
  - Endpoint: `https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lng}&language=es`
  - Parsear `address_components`: `route` + `street_number` → calle, `sublocality` → barrio, `locality` → ciudad
  - Mantener lógica de fallback de detalle: calle+número > barrio > ciudad
  - Mantener Nominatim como fallback si Google falla
- [x] **2.2** — `src/lib/tomtom.ts`: guard de `reverseGeocode` actualizado a `GOOGLE_MAPS_API_KEY`

### Verificación

- [ ] Mover pin en `LocationPickerModal` → muestra nombre de calle correcto
- [ ] Mover pin en zona sin calle → muestra barrio o ciudad
- [ ] Simular falla de Google (key inválida temporalmente) → cae en Nominatim sin error visible

---

## Sprint 3 — Search / Autocomplete + Session Token

**Objetivo**: reemplazar la búsqueda de lugares y agregar todas las estrategias anti-consumo.

### Tareas

- [x] **3.1** — `src/lib/tomtom-search.ts`: reemplazar TomTom Places con Google Places API
  - Autocomplete: `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=...&components=country:co&language=es&sessiontoken=<uuid>`
  - Al seleccionar: Place Details `https://maps.googleapis.com/maps/api/place/details/json?place_id=...&fields=geometry,address_components&sessiontoken=<uuid>`
  - Mapear `types[]` a `locationType`:
    - `'specific'` → `street_address`, `premise`, `establishment`, `point_of_interest`, `route`
    - `'municipality'` → `locality`, `administrative_area_level_*`, `country`, `postal_code`
  - Mantener Nominatim como fallback si Google falla
- [x] **3.2** — `src/lib/tomtom-types.ts`: agregado `placeId?: string` y `source: 'google'` a `LocationSearchResult`
- [x] **3.3** — `src/lib/tomtom.ts`: `searchLocations` acepta `sessionToken`, guard actualizado a `GOOGLE_MAPS_API_KEY`, agregado `fetchPlaceDetails` method
- [x] **3.4** — `src/hooks/useLocationPicker.ts`: ciclo de vida del session token
  - Genera token con `expo-crypto` al abrir modal
  - Pasa token en cada llamada a `searchLocations`
  - Al seleccionar resultado con `placeId`: fetch Place Details con mismo token → regenera token
  - `handleSelectSuggestion` ahora es async con loading state durante Place Details
  - Mínimo de caracteres: `q.length < 2` → `q.length < 3`
- [x] **3.5** — `src/hooks/useLocationSearch.ts`: default `minChars: 2` → `minChars: 3`

### Verificación

- [ ] Buscar con 1-2 caracteres → no se dispara ningún request
- [ ] Buscar con 3+ caracteres → resultados de Google Places
- [ ] Seleccionar un POI → request Place Details con mismo sessiontoken, luego pin pre-posicionado en mapa
- [ ] Seleccionar municipio → mapa sin pin para refinar ubicación exacta
- [ ] En Google Cloud Console: requests de autocomplete + details agrupados en misma sesión de billing
- [ ] Abrir modal, no seleccionar nada, cerrar y reabrir → nuevo session token generado

---

## Sprint 4 — iOS Google Maps Tiles (Opcional)

**Objetivo**: usar Google Maps tiles también en iOS (actualmente usa Apple Maps).

### Tareas

- [ ] **4.1** — `app.json`: agregar config de Google Maps para iOS
  ```json
  "ios": {
    "config": {
      "googleMapsApiKey": "<same-key>"
    }
  }
  ```
- [ ] **4.2** — `src/components/location-picker/LocationMapView.tsx`: agregar `provider={PROVIDER_GOOGLE}`
- [ ] **4.3** — `src/components/routine/RoutineRouteMapModal.tsx`: agregar `provider={PROVIDER_GOOGLE}`
- [ ] **4.4** — `src/components/trip/RouteMapModal.tsx`: agregar `provider={PROVIDER_GOOGLE}`
- [ ] **4.5** — `src/components/routine/OccurrenceMapView.tsx`: agregar `provider={PROVIDER_GOOGLE}`

### Verificación

- [ ] Build iOS → tiles cargan como Google Maps (no Apple Maps)
- [ ] Markers y Polylines renderizan igual que en Android

---

## Decisiones

| # | Tema | Resolución |
|---|---|---|
| 1 | Fallback Nominatim | ✅ Se mantiene como red de seguridad |
| 2 | API key iOS | ✅ Misma key que Android |
| 3 | `hasTolls` | ✅ Siempre `false` |
| 4 | Archivos consumidores | ✅ No se tocan — API pública de `@/lib/tomtom` sin cambios |
| 5 | Backend Parlando API | ✅ Sin cambios — polyline format es agnóstico del proveedor |

---

## Archivos modificados por sprint

| Sprint | Archivo |
|---|---|
| 1 | `src/constants/config.ts` |
| 1 | `.env` |
| 1 | `src/lib/tomtom-routing.ts` |
| 2 | `src/lib/tomtom-geocode.ts` |
| 3 | `src/lib/tomtom-search.ts` |
| 3 | `src/lib/tomtom.ts` |
| 3 | `src/hooks/useLocationPicker.ts` |
| 3 | `src/hooks/useLocationSearch.ts` |
| 4 | `app.json` |
| 4 | `src/components/location-picker/LocationMapView.tsx` |
| 4 | `src/components/routine/RoutineRouteMapModal.tsx` |
| 4 | `src/components/trip/RouteMapModal.tsx` |
| 4 | `src/components/routine/OccurrenceMapView.tsx` |
