## 1. Infra y deploy

- [x] 1.1 Renombrar `streaming/srs/conf/docker.conf` → `streaming/srs/conf/srs.conf` (git mv) y buscar referencias a `docker.conf` para actualizarlas
- [x] 1.2 Agregar `handle /dj/* { reverse_proxy srs:8080 }` en `deploy/Caddyfile` (manteniendo `/live/*`)
- [x] 1.3 Exponer el rango relay `${RTMP_RELAY_PORT_RANGE_START:-1936}-${RTMP_RELAY_PORT_RANGE_END:-2235}` en el servicio `video-encoder` de `deploy/docker-compose.prod.yml` (igual que dev)
- [x] 1.4 Documentar en `DEPLOY.md` (o deploy/README) que el firewall debe abrir el puerto 1935 (RTMP SRS) y el rango relay, y que Caddy no proxya RTMP

## 2. Agent — hooks de SRS (routes/video.js)

- [x] 2.1 Reescribir `on-publish`: leer `app` y `stream` del body; si `app === 'live'` responder `{code:0}` sin registrar DJ; si `app === 'dj'` resolver `clientId` por stream key y denegar keys desconocidos respondiendo `reply.send(-1)` (entero plano, no JSON)
- [x] 2.2 En `on-publish` (app `dj`) con key válido: registrar en `_djActive`, detener encoder, `status='live'`, detener tracking y loguear
- [x] 2.3 Reescribir `on-unpublish`: leer `app` y `stream`; resolver `clientId` por `_djActive` o match directo; si `app === 'dj'` quitar DJ, `status='autodj'`, reanudar encoder + tracking; ignorar `app === 'live'`

## 3. Agent — encoder y relay (lib/video-encoder.js + routes/video.js)

- [x] 3.1 Cambiar el target del relay en `startRelay` a `rtmp://srs:1935/dj/${streamKey}` (D2)
- [x] 3.2 Iniciar el relay también desde `POST /api/video/:clientId/start` (además de `autoStartVideoStreams`)
- [x] 3.3 Verificar que `autoStartVideoStreams` sigue iniciando relay y encoder correctamente con el nuevo app `dj`
- [x] 3.4 Confirmar que `stopEncoder` no mata el proceso relay (patrones de `pkill` por clientId vs relay)

## 4. Panel — URL HLS según estado

- [x] 4.1 En `app/dashboard/television/page.tsx` seleccionar el app de la URL HLS según `status`: `/dj/<streamKey>.m3u8` cuando `live`, `/live/<streamKey>.m3u8` cuando `autodj`/`off`
- [x] 4.2 Verificar que el estado recibido del status endpoint permite distinguir `live` vs `autodj` de forma consistente

## 5. Panel — página de conexión OBS

- [x] 5.1 En `app/dashboard/television/connection/page.tsx` mostrar `info.relayUrl` (puerto real por cliente) en vez del puerto 1936 hardcodeado, y el estado activo/inactivo del relay
- [x] 5.2 Actualizar la URL del servidor de "Conexión Directa" al app `dj` (`rtmp://<host>:1935/dj`)
- [x] 5.3 Mostrar en la página el estado del AutoDJ/relay y una nota de que con el DJ en vivo el AutoDJ se detiene automáticamente

## 6. Verificación end-to-end

- [x] 6.1 Tras el deploy, `docker ps`/health: SRS healthy y `nc -zv <host> 1935` responde
- [x] 6.2 Test directo: `ffmpeg -f lavfi -i testsrc ... -f flv rtmp://<host>:1935/dj/<streamKey>` → status `live`, AutoDJ detenido; al cortar, status `autodj` y AutoDJ reanuda (verificado con OBS: apagado→`autodj`, encendido→`live`)
- [x] 6.3 Test relay: publicar al puerto relay del cliente → status `live` y HLS `/dj/<key>.m3u8` sirve la señal (m3u8 con segmentos y video reproducido en el dashboard)
- [x] 6.4 Test de seguridad: publicar con un stream key desconocido → publish rechazado (SRS loguea `response=-1` del hook y ffmpeg termina con I/O error)
- [x] 6.5 Test HLS: con AutoDJ activo `/live/<key>.m3u8` reproduce; con DJ en vivo `/dj/<key>.m3u8` reproduce (verificado en el dashboard tras el rewrite `/dj/*` en next.config.js)