## 1. Videoteca — Agregar a playlist

- [x] 1.1 Cargar las playlists del cliente en la Videoteca (`/api/dashboard/television/playlists`).
- [x] 1.2 Agregar selector "Agregar a playlist..." en la barra de acciones batch de la Videoteca (junto a "Mover a...").
- [x] 1.3 Implementar la acción: por cada track seleccionado, `POST /api/dashboard/television/playlists/:playlistId/entries`; reportar el total agregado con toast y limpiar la selección.

## 2. Editor de playlists de TV

- [x] 2.1 Rehacer `app/dashboard/television/playlists/page.tsx` como editor: listado de playlists a la izquierda y editor de la seleccionada a la derecha.
- [x] 2.2 Agregar buscador de videos disponibles (filtro server-side por `search`) y filtro por carpeta (`folderId`) al agregar tracks.
- [x] 2.3 Agregar selección múltiple de tracks disponibles y agregado en lote (POST por track).
- [x] 2.4 Listar los entries de la playlist con drag&drop para reordenar y botón "Guardar orden" que llama a `PUT .../entries/reorder` con `entryIds`.
- [x] 2.5 Mantener quitar entry (`DELETE .../entries/:entryId`) y crear/eliminar playlist existentes.
- [x] 2.6 Eliminar la lista "Videos disponibles" duplicada (slice 30) como fuente principal.

## 3. Verificación

- [x] 3.1 `npx tsc --noEmit` sin errores nuevos.
- [x] 3.2 Probar en producción: subir video en Videoteca, agregarlo a una playlist desde la Videoteca (selección batch), y en el editor agregar varios con búsqueda/carpeta, reordenar y guardar.
