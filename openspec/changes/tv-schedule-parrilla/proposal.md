## Why

La sección `/dashboard/television/schedule` es un placeholder "Próximamente". El sistema de Radio ya tiene una parrilla horaria completa (UI + API + cron en el agente), pero Televisión no: los clientes no pueden programar qué playlist de video se reproduce en cada franja del día, y el AutoDJ de video reproduce todas las entries de todas las playlists mezcladas sin noción de playlist activa.

## What Changes

- Reemplazar el placeholder de `/dashboard/television/schedule` por una parrilla horaria funcional de playlists de video (misma UX que `streaming/schedule`): tabla por día de semana, modal de crear/editar franja, eliminar, e indicador "Ahora".
- Agregar CRUD de franjas horarias para video en el agente: `GET/POST /api/video/:clientId/schedule`, `PATCH/DELETE /api/video/:clientId/schedule/:id`, `GET /api/video/:clientId/schedule/current`.
- Crear la tabla `video_playlist_schedules` en el agente (MySQL crudo) y la columna `isActive` en `video_playlists`.
- Introducir el concepto de **playlist activa** en el AutoDJ de video: `start` y `autoStartVideoStreams` reproducen la playlist activa si existe, con fallback a todas las entries del cliente.
- Agregar un cron en el agente que cada 30s revise la parrilla y, si la franja que toca difiere de la playlist activa, la active y **reinicie el encoder** para aplicar el nuevo playlist (el concat de ffmpeg lee `playlist.txt` al arrancar).
- El proxy catch-all existente de dashboard (`app/api/dashboard/television/[...params]/route.ts`) ya reenvía `/api/dashboard/television/schedule` al agente sin cambios en el panel.

## Capabilities

### New Capabilities
- `television/schedule`: Parrilla horaria de playlists de video — CRUD de franjas, resolución de la playlist que debe estar al aire "ahora", y aplicación automática de la parrilla vía cron con activación de playlist y reinicio del encoder.

### Modified Capabilities
<!-- Ninguna: no cambia comportamiento de rtmp-ingest ni de otra capability existente. -->

## Impact

- **Agente** (`streaming/agent/`): nuevas rutas de schedule para video (en `routes/video.js` o archivo nuevo), columna `isActive` en `video_playlists`, tabla `video_playlist_schedules`, cron de parrilla, y cambio en `start`/`autoStartVideoStreams` para usar la playlist activa.
- **Prisma** (`prisma/schema.prisma`): el modelo `VideoPlaylistSchedule` ya existe; falta agregar `isActive` a `VideoPlaylist` para reflejar la tabla real.
- **Frontend** (`app/dashboard/television/schedule/page.tsx`): reemplazo del placeholder por la grilla completa.
- **Lib** (`lib/streaming-client.ts`): agregar métodos de schedule al `videoClient` (opcional, el fetch directo al proxy también funciona).
- **Comportamiento**: al cambiar de franja el encoder se reinicia (corte breve de señal). Aceptado en esta iteración.
