## Context

La Videoteca de TV (`app/dashboard/television/library/page.tsx`) ya tiene selección múltiple y una barra de acciones batch ("Mover a..." carpetas). La página de playlists de TV (`app/dashboard/television/playlists/page.tsx`) lista una "Videos disponibles" duplicada (slice 30, sin búsqueda) y no permite reordenar. El backend de video ya expone todo lo necesario: `POST /api/video/:clientId/playlists/:playlistId/entries` (agregar), `DELETE .../entries/:entryId` (quitar), y `PUT .../entries/reorder` con `entryIds` (video.js:546), todos alcanzables vía el proxy catch-all del panel.

El editor de playlists de Radio (`streaming/playlists/[id]/page.tsx`) ya implementa búsqueda, filtro por carpeta, selección múltiple y drag&drop; es el modelo a portar.

## Goals / Non-Goals

**Goals:**
- Agregar videos a playlists desde la Videoteca (selección batch).
- Convertir la página de playlists de TV en un editor con búsqueda, filtro por carpeta, selección múltiple y drag&drop + guardar orden.
- Eliminar la lista "Videos disponibles" duplicada como fuente principal.

**Non-Goals:**
- Fusionar ambas secciones en una sola URL/pestaña (descartado en exploración).
- Backend nuevo: se reutilizan los endpoints existentes del agente.
- Playlist activa por parrilla (gestionado por `tv-schedule-parrilla`).

## Decisions

### 1. Agregar a playlist desde la Videoteca
En la barra de acciones batch de la Videoteca (junto a "Mover a..."), se agrega un selector "Agregar a playlist...". Al elegir una playlist, se hace un `POST` por cada track seleccionado a `/api/dashboard/television/playlists/:playlistId/entries` (el proxy reenvía al agente). Se reporta el total agregado con el toast existente.
- **Alternativa**: endpoint batch nuevo en el agente → descartada por simpleza: el volumen por operación es bajo y el endpoint individual ya existe.

### 2. Portar el editor de Radio a playlists de TV
Se rehace `app/dashboard/television/playlists/page.tsx` siguiendo la estructura de `streaming/playlists/[id]/page.tsx`: listado de playlists (izquierda) + editor de la seleccionada (derecha), con:
- Buscador de videos disponibles y filtro por carpeta (usa `/api/dashboard/television/tracks?limit=500&search=&folderId=`).
- Selección múltiple + agregar en lote.
- Lista de entries con drag&drop y botón "Guardar orden" que llama a `PUT .../entries/reorder` con `entryIds` (el endpoint del agente ordena por posición).
- Quitar entry con `DELETE .../entries/:entryId`.

Se mantiene la URL `/dashboard/television/playlists` (una sola página editor, a diferencia de Radio que usa `[id]`), para no cambiar menú/URLs.

### 3. Fuente de datos del editor
El editor consulta `tracks?limit=500` (ya filtrable por search/folderId en el agente) y los entries de la playlist. Para el drag&drop, el orden se mantiene en estado local y se persiste con reorder al guardar, igual que Radio.
- **Nota**: el endpoint de tracks de TV ya soporta `search` y `folderId` (video.js:287), así que el filtrado puede ser server-side sin tocar el agente.

### 4. Sin cambios de menú ni rutas
Se mantienen las URLs y el menú (`television-library`, `television-playlists`). Solo cambia el contenido/comportamiento de la página de playlists y se añade la acción batch en la Videoteca.

## Risks / Trade-offs

- **Eliminar la lista "Videos disponibles"** → [Riesgo] Mitigación: el editor nuevo tiene buscador y filtro por carpeta, más capacidad que la lista de 30 items; si un operador no entiende dónde buscar, el botón "Agregar tracks" del editor es el punto de entrada claro.
- **Drag&drop en dispositivo táctil** → [Riesgo] Mitigación: igual que Radio, el drag&drop es nativo HTML5 (funciona en escritorio); en táctil se puede usar el botón de quitar/agregar. Fuera de alcance un soporte táctil completo.
- **Agregado 1 a 1 desde la Videoteca** → [Riesgo] Mitigación: para volúmenes grandes de selección se podría agregar un endpoint batch futuro; por ahora el bucle de POST individual es suficiente y reporta el total.

## Migration Plan

1. Desplegar panel (sin cambios de backend/agente).
2. Rollback: restaurar el contenido previo de `playlists/page.tsx` y quitar la acción batch de la Videoteca (solo cambios de frontend).

## Open Questions

- Ninguna: la ubicación (editor en una sola página, sin `[id]`) se decidió para no cambiar URLs; la selección de playlist en la Videoteca usa las playlists existentes.
