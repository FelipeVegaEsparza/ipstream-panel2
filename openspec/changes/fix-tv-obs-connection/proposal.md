## Why

OBS no puede conectarse a la transmisión de Televisión al ingresar las credenciales mostradas en `dashboard/television/connection`. El diagnóstico encontró causas encadenadas: SRS probablemente no arranca por un mount de config que oculta `conf/srs.conf`, la semántica de SRS de "un publisher por stream" impide que el DJ reemplace al AutoDJ en el mismo stream key, y los hooks `on-publish`/`on-unpublish` leen un campo que SRS nunca envía (`stream_key` en vez de `stream`). Además, la "Conexión Universal" (relay) muestra un puerto hardcodeado (1936) que no coincide con el puerto real por cliente y no está expuesto en producción.

## What Changes

- **Arreglar el startup de SRS**: montar el config de SRS de forma que exista `conf/srs.conf` (el CMD de la imagen es `./objs/srs -c conf/srs.conf`). Sin esto, SRS sale y el puerto 1935 no escucha.
- **Nuevo modelo de takeover DJ/AutoDJ compatible con SRS** (1 publisher por stream):
  - El encoder de AutoDJ (ffmpeg) sigue publicando en `live/<streamKey>`.
  - El DJ (OBS directo) y el relay publican en un app separado `dj/<streamKey>`, sin conflicto con el AutoDJ.
  - El hook `on-publish` (app `dj`) detiene el encoder y marca el stream como `live`; `on-unpublish` (app `dj`) reanuda el AutoDJ y marca `autodj`.
  - El hook ignora los publishes del encoder (app `live`) para no registrar un falso "DJ conectado".
- **Corregir los hooks de SRS**: leer `stream` y `app` del body de SRS (no `stream_key`/`client_id`), resolver el `clientId` a partir del stream key, y usar el estado en memoria `_djActive` para `on-unpublish`.
- **HLS según estado**: el panel y el player público usan `/dj/<streamKey>.m3u8` cuando el stream está `live`, y `/live/<streamKey>.m3u8` cuando está `autodj`. Caddy debe proxear ambos.
- **Arreglar la "Conexión Universal" (relay)**:
  - La UI debe mostrar el puerto real por cliente (de `getRelayUrl`), no el puerto 1936 hardcodeado.
  - El relay re-publica a `dj/<streamKey>` y se inicia también desde el endpoint `/start`.
  - Exponer el rango de puertos relay en el compose de producción (o un rango documentado).
- **Documentar el firewall**: los puertos RTMP 1935 (SRS) y el rango relay deben abrirse públicamente; Caddy no proxya RTMP.

## Capabilities

### New Capabilities
- `television/rtmp-ingest`: Ingesta RTMP de Televisión — listener SRS, conexión de DJ vía OBS (directa y relay), hooks `on-publish`/`on-unpublish`, detección de DJ, takeover DJ↔AutoDJ y selección de URL HLS según el estado del stream.

### Modified Capabilities
- *(ninguna: la sección de Televisión no tiene specs existentes)*

## Impact

- **Código**:
  - `streaming/agent/routes/video.js` — hooks `on-publish`/`on-unpublish`, resolución de clientId, distinción por app.
  - `streaming/agent/lib/video-encoder.js` — URLs de publish del encoder (`live/`) y del relay (`dj/`), inicio de relay en `/start`.
  - `app/dashboard/television/page.tsx` — selección de URL HLS según estado.
  - `app/dashboard/television/connection/page.tsx` — mostrar puerto relay real y estado del AutoDJ (preparar transmisión).
  - `components/public/StreamingPlayer.tsx` (si aplica a video) — selección de HLS según estado.
- **Deploy / Infra**:
  - `streaming/srs/conf/docker.conf` → rename o mount como `srs.conf`.
  - `docker-compose.yml` y `deploy/docker-compose.prod.yml` — exponer rango de puertos relay.
  - `deploy/Caddyfile` — proxear `/dj/*` además de `/live/*`.
  - Documentación de puertos 1935 y rango relay en el firewall del VPS.
- **No cambia**: el modelo de datos (video_streams), el AutoDJ de audio, ni la sección de radio.