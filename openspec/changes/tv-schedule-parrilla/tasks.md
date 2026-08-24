## 1. Agente — Schema y datos

- [x] 1.1 Agregar `CREATE TABLE IF NOT EXISTS video_playlist_schedules` en `streaming/agent/server.js` (id, clientId, videoStreamId, playlistId, dayOfWeek, startTime, endTime, isActive, createdAt, updatedAt, índices).
- [x] 1.2 Agregar columna `isActive` a `video_playlists`: incluirla en el `CREATE TABLE IF NOT EXISTS` y agregar una migración idempotente en el arranque del agente que haga `ALTER TABLE` si la columna no existe (patrón de la migración de filenames existente).
- [x] 1.3 Sincronizar Prisma: agregar `isActive Boolean @default(false)` al modelo `VideoPlaylist` en `prisma/schema.prisma` y verificar que la relación `schedules VideoPlaylistSchedule[]` exista.

## 2. Agente — CRUD de schedule de video

- [x] 2.1 Crear las rutas `GET/POST /api/video/:clientId/schedule` (listar y crear franja), validando playlist propia, día 0-6 y horas `HH:mm` (clon de `routes/schedule.js` adaptado a `video_playlists`/`video_streams`).
- [x] 2.2 Crear `PATCH/DELETE /api/video/:clientId/schedule/:id` (edición parcial y eliminación, con `not_found` si no existe o no pertenece).
- [x] 2.3 Crear `GET /api/video/:clientId/schedule/current` reutilizando `isTimeInSlot` (incluye franjas que cruzan la medianoche) y devolviendo `{ current: {...} | null }` con nombre de playlist.
- [x] 2.4 Registrar las nuevas rutas en el servidor del agente (`server.js`).

## 3. Agente — Playlist activa y cron

- [x] 3.1 Modificar `start` (`routes/video.js`) y `autoStartVideoStreams` (`lib/video-encoder.js`) para usar las entries de la playlist activa si existe; si no, fallback a todas las entries del cliente; si la activa no tiene entries y no hay fallback, devolver error de playlist vacía.
- [x] 3.2 Implementar `startVideoScheduleCron()` (cron 30s) que por cliente en estado `autodj` resuelva la franja vigente, y si difiere de la playlist activa: desactivar la anterior, activar la nueva, regenerar `playlist.txt` y reiniciar el encoder manteniendo `autodj`.
- [x] 3.3 Registrar `startVideoScheduleCron()` en `server.js` junto al cron de Radio.

## 4. Panel — Frontend

- [x] 4.1 Portar el UI de `streaming/schedule/page.tsx` a `app/dashboard/television/schedule/page.tsx`: tabla por día con `rowSpan`, modal de crear/editar franja, botones eliminar, badge "Ahora" con la franja vigente.
- [x] 4.2 Cambiar los fetches de la página a `/api/dashboard/television/schedule*` y `/api/dashboard/television/playlists` (el proxy catch-all reenvía al agente).
- [x] 4.3 Agregar métodos `listSchedule/createSchedule/updateSchedule/deleteSchedule/getCurrentSchedule` a `videoClient` en `lib/streaming-client.ts` (clon de Radio con ruta `/api/video/:clientId/schedule`).

## 5. Verificación

- [x] 5.1 Verificar `npx tsc --noEmit` sin errores nuevos.
- [ ] 5.2 Verificar que el agente arranca sin errores de schema (tabla creada, migración de `isActive` aplicada).
- [ ] 5.3 Probar manualmente: crear/editar/eliminar franja, badge "Ahora", arranque del AutoDJ con playlist activa, y cambio de playlist al cruzar una franja.
