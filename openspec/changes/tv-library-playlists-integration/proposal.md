## Why

Las secciones `/dashboard/television/library` ("Videoteca") y `/dashboard/television/playlists` ("Programación") son redundantes: ambas listan los mismos videos. Para subir un video y agregarlo a una playlist, el operador debe ir a la Videoteca a subirlo y luego a Programación a buscarlo (solo 30 resultados, sin búsqueda ni filtro por carpeta). El editor de playlists de TV es una versión reducida del de Radio, que ya tiene búsqueda, filtro por carpeta, selección múltiple y drag&drop.

## What Changes

- **Videoteca** pasa a ser la fuente de verdad de archivos: subir, carpetas, mover entre carpetas, eliminar, buscar.
- En la Videoteca, la barra de acciones batch (actualmente solo "Mover a...") agrega **"Agregar a playlist..."**: permite seleccionar videos y añadirlos a una playlist existente en una sola acción.
- **Programación** pasa a ser un editor de playlists completo: portar el patrón de `streaming/playlists/[id]` (búsqueda, filtro por carpeta, selección múltiple, drag&drop para reordenar, guardar orden).
- Se elimina la lista "Videos disponibles" duplicada de la página de playlists; los videos se agregan desde la Videoteca o desde el editor con búsqueda.
- **BREAKING**: la página de playlists de TV cambia de comportamiento (deja de listar videos disponibles como fuente principal de agregado).

## Capabilities

### New Capabilities
- `television/library-playlists`: Gestión unificada de la videoteca y las playlists de video — la videoteca como fuente de archivos y agregado de videos a playlists desde ella, más el editor completo de playlists (búsqueda, carpetas, selección múltiple, reordenamiento).

### Modified Capabilities
<!-- Ninguna: no cambia el comportamiento de rtmp-ingest ni de schedule. -->

## Impact

- **Panel TV — Videoteca** (`app/dashboard/television/library/page.tsx`): agregar acción batch "Agregar a playlist" en la barra de selección.
- **Panel TV — Playlists** (`app/dashboard/television/playlists/page.tsx`): rehacer como editor estilo Radio con búsqueda, filtro por carpeta, selección múltiple y drag&drop.
- **API TV**: reutilizar endpoints existentes (`/television/playlists/:id/entries` POST para agregar, DELETE para quitar, `/reorder` para ordenar) — no requiere cambios de backend salvo verificar que el reorder de TV soporte el orden.
- **Menú** (`lib/menu-items.ts`): sin cambios de URLs (se mantienen `television-library` y `television-playlists`).
