## Context

Radio ya implementa la parrilla completa: tabla `playlist_schedules` + `playlists.isActive`, CRUD en `routes/schedule.js`, cron cada 30s que voltea `isActive` y regenera el m3u (liquidsoap recarga solo). El panel consume vía `lib/streaming-client.ts` y el proxy catch-all de TV (`app/api/dashboard/television/[...params]/route.ts`) reenvía cualquier path `/api/dashboard/television/*` a `/api/video/:clientId/*` sin tocar el panel.

Diferencias clave con video:
- No existe columna `isActive` en `video_playlists`; `start()` (video.js:236) y `autoStartVideoStreams()` (video-encoder.js:346) reproducen TODAS las entries del `clientId`.
- ffmpeg concat lee `playlist.txt` una vez al arrancar → aplicar un cambio de playlist requiere reiniciar el encoder.
- El Prisma schema ya define `VideoPlaylistSchedule` pero el agente (MySQL crudo) no crea esa tabla.

## Goals / Non-Goals

**Goals:**
- Parrilla horaria de playlists de video funcional con la misma UX que `streaming/schedule`.
- CRUD completo en el agente (`/api/video/:clientId/schedule`, `/:id`, `/current`).
- Aplicación automática de la parrilla vía cron (30s) con reinicio del encoder.
- Concepto de playlist activa que respete el arranque manual y automático.

**Non-Goals:**
- Transición sin corte (handover suave) entre playlists al cambiar de franja.
- Programación recurrente avanzada (excepciones, bloques, prioridad de franjas).
- Programación para el caso DJ en vivo (la parrilla solo gobierna el AutoDJ).
- Migración de la tabla desde Prisma (el agente gestiona su propio schema).

## Decisions

### 1. Tabla `video_playlist_schedules` en el agente
Se crea la tabla en `server.js` (MySQL crudo) con la misma forma que `playlist_schedules`: `id, clientId, videoStreamId, playlistId, dayOfWeek, startTime, endTime, isActive, createdAt, updatedAt`. El Prisma schema ya la tiene; se sincroniza agregando `isActive` a `VideoPlaylist` para reflejar la columna nueva.
- **Alternativa**: usar Prisma como fuente de verdad del schema → descartada, el agente no usa Prisma y las tablas de video se crean ahí.

### 2. Columna `isActive` en `video_playlists`
Se agrega `isActive BOOLEAN DEFAULT false` en el `CREATE TABLE IF NOT EXISTS` (el `IF NOT EXISTS` no altera tablas existentes, así que se requiere un `ALTER TABLE` idempotente o una sentencia de migración en el arranque del agente, similar a la migración de filenames existente). Solo una playlist puede estar activa por cliente.
- **Alternativa**: columna `currentPlaylistId` en `video_streams` → descartada por consistencia con el patrón de Radio (`isActive` en playlists) y porque permite fallback "ninguna activa → todas las entries".

### 3. `start` y `autoStartVideoStreams` usan la playlist activa
Ambos endpoints pasan a resolver: si existe `isActive=1` → entries de esa playlist; si no → todas las entries del cliente (comportamiento actual como fallback). Si la playlist activa no tiene entries y no hay fallback, se rechaza con error de playlist vacía.
- **Alternativa**: siempre exigir playlist activa → descartada, rompe clientes existentes sin playlist activa.

### 4. Cron de parrilla de video
Nuevo `startVideoScheduleCron()` (en `routes/schedule.js` o archivo `video-schedule.js`) que cada 30s:
1. Consulta `video_streams` con estado `autodj` (o `autoStart=1` y corriendo).
2. Por cliente, resuelve la franja vigente con `isTimeInSlot` (compartida con Radio).
3. Si difiere de la playlist activa: `UPDATE video_playlists SET isActive=0 WHERE clientId=? AND isActive=1`, activa la nueva, regenera `playlist.txt` y reinicia el encoder (`stopEncoder` + `startEncoder`), manteniendo el estado `autodj`.

Se registra en `server.js` junto al cron de Radio.
- **Alternativa**: aplicar el cambio solo al reiniciar manualmente → descartada, la parrilla debe ser automática.

### 5. Endpoint `/current`
`GET /api/video/:clientId/schedule/current` reutiliza `isTimeInSlot` para devolver la franja vigente (o `null`), con nombre de playlist. Es lo que alimenta el badge "Ahora" de la UI.

### 6. Frontend
Port del componente `streaming/schedule/page.tsx` a `television/schedule` cambiando los fetches a `/api/dashboard/television/schedule*` (el proxy catch-all hace el resto). Reutiliza `DAYS`, `fmtTime`, tabla por día con `rowSpan`, modal de crear/editar, y badge "Ahora".

### 7. `videoClient` en lib
Se agregan `listSchedule/createSchedule/updateSchedule/deleteSchedule/getCurrentSchedule` a `lib/streaming-client.ts` (clon de los métodos de Radio pero con `/api/video/:clientId/schedule`). Opcional: el frontend puede hacer fetch directo al proxy; los métodos se agregan por consistencia.

## Risks / Trade-offs

- **Corte de señal al cambiar de franja** → [Riesgo] Mitigación: los cortes de franja son poco frecuentes (cambios de hora, no de track) y el cron lo aplica en el momento exacto. Aceptado en esta iteración; un handover suave requeriría un reproductor distinto (fuera de alcance).
- **`ALTER TABLE` en tablas existentes** → [Riesgo] Mitigación: migración idempotente en el arranque del agente (detectar columna faltante y agregarla), igual que la migración de filenames existente.
- **Cron sobre clientes con encoder caído** → [Riesgo] Mitigación: el cron solo actúa sobre `video_streams` con estado `autodj`; si el encoder falla al reiniciar, se registra error y se continúa con el resto de clientes (patrón del cron de Radio).
- **Doble definición de la franja (UI y cron)** → [Riesgo] Mitigación: `isTimeInSlot` es la única fuente de verdad horaria y se comparte; la UI solo muestra lo que el endpoint `/current` resuelve.
- **`isActive` sin FK a `video_playlists` en el schema Prisma ya existente** → [Riesgo] Mitigación: se actualiza el modelo `VideoPlaylist` para incluir `isActive` y la relación `schedules`, manteniendo consistencia entre Prisma y la tabla real del agente.

## Migration Plan

1. Deploy del agente con el `CREATE TABLE IF NOT EXISTS video_playlist_schedules` y la migración de `isActive` en `video_playlists` (idempotente, sin cortar servicio).
2. Rollback: eliminar el cron de video y revertir el cambio en `start`/`autoStartVideoStreams` al comportamiento "todas las entries" (la tabla y la columna pueden permanecer sin uso).
3. El panel no requiere cambios de deploy (proxy catch-all existente).

## Open Questions

- Ninguna: la decisión de aceptar el corte breve al cambiar de franja se resolvió en exploración y quedó documentada en proposal.md.
