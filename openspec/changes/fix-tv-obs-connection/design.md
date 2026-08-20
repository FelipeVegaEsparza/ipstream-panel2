## Context

Ver proposal.md (Why/What) para la motivación. Estado actual relevante:

- La imagen `ossrs/srs:5` arranca **por defecto** con `./objs/srs -c conf/docker.conf`. El compose monta el dir `./streaming/srs/conf` sobre `/usr/local/srs/conf` (ro), ocultando el config de la imagen. Si el archivo que la imagen espera no existe en el mount, SRS entra en crash loop (exit 255) y el puerto 1935 no escucha.
- SRS impone **un publisher por stream**: un segundo publisher del mismo `app/stream` es rechazado (no "patea" al primero). El diseño actual (DJ publica el mismo `live/<key>` que el AutoDJ y el hook detiene al encoder) no puede funcionar: el hook `on-publish` solo se dispara si SRS acepta el publish.
- Los hooks actuales leen `stream_key`/`client_id` del body de SRS, pero SRS envía `app` y `stream` (y `client_id` es el id interno de SRS, no el del panel).
- SRS parsea la respuesta del hook con `atol(body)`: un objeto JSON `{"code":0,...}` se lee como 0 (permite); para **denegar** hay que responder un entero plano (p.ej. `-1`).
- El relay asigna un puerto por cliente (hash en 1936–2235) pero la UI hardcodea 1936 y prod solo expone `1936:1936`.

## Goals / Non-Goals

**Goals:**
- Que SRS arranque de forma reproducible y el puerto 1935 escuche.
- Que un DJ (OBS) pueda publicar su señal sin conflicto con el AutoDJ, con takeover automático.
- Que los hooks identifiquen correctamente al cliente y distingan DJ vs encoder.
- Que los espectadores reciban la URL HLS correcta según el estado (`live` vs `autodj`).
- Que la "Conexión Universal" (relay) muestre y use el puerto real por cliente.

**Non-Goals:**
- No tocar el modelo de datos (`video_streams`, tracks, playlists).
- No migrar a otro servidor RTMP ni agregar transcodificación multi-bitrate.
- No rehacer el AutoDJ de audio ni la sección de radio.

## Decisions

### D1. Config de SRS montada como `srs.conf` con command fijo
Renombrar `streaming/srs/conf/docker.conf` → `streaming/srs/conf/srs.conf` y fijar en ambos composes el `command` del service `srs` a `./objs/srs -c conf/srs.conf`. La imagen por defecto arranca con `-c conf/docker.conf`; al pinar el command, la config deja de depender del default de la imagen y el mount encuentra `srs.conf`.
- Alternativa considerada: dejar el archivo como `docker.conf` (el default de la imagen lo encuentra sin tocar composes). Descartada: deja implícita la dependencia del default de la imagen y el nombre `srs.conf` no se usa.
- Descubrimiento en validación: `docker compose up -d` no recrea SRS si el compose no cambia (la imagen con su default `conf/docker.conf`). Por eso el `command` explícito en el compose es necesario para que el deploy aplique el cambio de forma reproducible.

### D2. Takeover DJ/AutoDJ con apps separados (`dj` vs `live`)
- El encoder de AutoDJ (ffmpeg) publica en `live/<streamKey>` (sin cambios).
- El DJ publica en `dj/<streamKey>`: OBS directo usa `rtmp://<host>:1935/dj/<streamKey>` y el relay re-publica a `rtmp://srs:1935/dj/<streamKey>`.
- Apps distintos ⇒ nunca compiten por el mismo stream ⇒ el takeover es automático: cuando el DJ publica, `on-publish` (app `dj`) detiene el encoder; cuando se desconecta, `on-unpublish` (app `dj`) lo reanuda.
- Alternativas descartadas:
  - Mismo app/stream y "que el segundo publisher patee al primero": SRS v5 rechaza al segundo publisher → no aplica.
  - Mismo app/stream con handoff explícito (detener AutoDJ antes): rompe la UX y exige coordinar con el DJ → descartada como primaria (queda como fallback documentado).
  - Mismo app con stream distinto (`live/dj_<key>`): no aporta ventaja sobre apps separados y sigue requiriendo switch de HLS → descartada.

### D3. Hooks: leer `app` y `stream`, resolver clientId, denegar keys desconocidos
- Desestructurar `{ app, stream }` del body (no `stream_key`/`client_id`).
- `on-publish`:
  - `app === 'live'` → publish del encoder → responder `{code:0}` y **no** registrar DJ.
  - `app === 'dj'` → resolver `clientId` comparando `stream` contra `getStreamKey(clientId)`; si no hay match → **denegar** respondiendo `reply.send(-1)` (entero plano; un JSON `{"code":...}` se parsea siempre como 0). Si hay match → registrar en `_djActive`, detener encoder, `status='live'`, detener tracking.
- `on-unpublish`:
  - `app === 'dj'` → resolver clientId (por `_djActive[stream]` o match directo) → quitar DJ, `status='autodj'`, reanudar encoder + tracking.
  - `app === 'live'` → solo `{code:0}`.

### D4. URL HLS según estado
- SRS genera HLS para ambos apps bajo `hls_path` → `/live/<key>.m3u8` (autodj) y `/dj/<key>.m3u8` (live).
- `app/dashboard/television/page.tsx` y el player público eligen el app según `status === 'live'`.
- `deploy/Caddyfile`: agregar `handle /dj/* { reverse_proxy srs:8080 }` (mantener `/live/*`).

### D5. Relay por cliente corregido
- La UI (`connection/page.tsx`) muestra `info.relayUrl` (puerto real por cliente) en vez del puerto 1936 hardcodeado, y el estado activo/inactivo del relay.
- El relay re-publica a `dj/<streamKey>` (D2).
- El relay se inicia también desde `POST /api/video/:clientId/start` (además de `autoStartVideoStreams`), para que esté escuchando cuando el cliente arranca su AutoDJ.
- `docker-compose.prod.yml`: exponer el rango `${RTMP_RELAY_PORT_RANGE_START:-1936}-${RTMP_RELAY_PORT_RANGE_END:-2235}` (igual que dev) en `video-encoder`, o un rango reducido documentado.
- Documentar en deploy que el firewall debe abrir 1935 (RTMP SRS) y el rango relay.

## Risks / Trade-offs

- [La URL HLS cambia entre `live/` y `dj/`] → el panel y el player la conmutan según el estado (polling de status). Riesgo de un breve corte al conmutar → mitigación: seleccionar el app en el mismo ciclo de status; el player ya maneja errores de red y reintenta.
- [OBS directo y relay activos a la vez sobre `dj/<key>`] → SRS rechaza al segundo publisher → mitigación: la UI orienta a usar una sola ruta; es un caso de uso edge.
- [Denegar keys con JSON (`{"code":1}`) no funciona por `atol`] → regla explícita en el hook: denegar con `reply.send(-1)` (entero plano), nunca JSON. Cubierto en D3 y en tasks.
- [Reanudación del AutoDJ tras `on-unpublish`] → el encoder vuelve a `live/` (app distinto), sin conflicto con `dj/` → no hay race de streams.
- [Puertos relay expuestos: abrir 300 puertos] → superficie de ataque mayor → mitigación: rango configurable; documentar acotarlo en prod (p.ej. 1936–2046) según cantidad de clientes.
- [Firewall VPS cerrado para 1935/rango relay] → OBS igualmente no conecta → mitigación: checklist de deploy y health-check de SRS en el deploy.sh.

## Migration Plan

1. **Infra**: renombrar `streaming/srs/conf/docker.conf` → `srs.conf`; fijar `command` del service `srs` en `docker-compose.yml` y `deploy/docker-compose.prod.yml`; ajustar `deploy/Caddyfile` (`/dj/*`); exponer rango relay en `deploy/docker-compose.prod.yml`; abrir puertos en firewall.
2. **Agent**: actualizar hooks (`stream`/`app`, resolución, deny con `-1`), encoder y relay a `dj/`, relay en `/start`.
3. **Panel**: URL HLS según estado; página de conexión con puerto relay real.
4. **Deploy**: `docker compose up -d --build srs agent video-encoder app` y validar SRS healthy (`curl :8080/api/v1/versions`).

**Rollback**: revertir el rename de config (SRS queda como estaba), re-deployar agent y panel. La señal directa del DJ vuelve a `live/` si se revierte el panel; los clientes con la URL vieja (`/live/...m3u8`) siguen funcionando para AutoDJ.

## Open Questions

- Rango de puertos relay definitivo en producción (1936–2235 completo vs un rango menor): configurable por env; no bloquea las specs. Decidir al desplegar.