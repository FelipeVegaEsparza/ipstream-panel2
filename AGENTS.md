# Project Instructions

## Infrastructure / Deploy

- Producción se despliega vía GitHub Actions en un VPS propio del usuario.
- El usuario tiene acceso SSH al VPS de producción; se puede usar para tareas de deploy, pruebas y diagnóstico.
- Flujo habitual: commit + push a `main` → GitHub Actions despliega automáticamente en el VPS.
- **Gate de CI**: `deploy.yml` corre un job `verify` (`npm ci`, `tsc --noEmit` con `strict: true`, tests del panel y del agente) antes de construir la imagen. Si falla, **no se deploya**: producción sigue con la imagen anterior. No pushear a `main` sin que ese job pase.
- **Drift panel ↔ nodos**: la imagen del panel lleva `APP_GIT_SHA` (build-arg `GIT_SHA` en `deploy.yml`) y cada agente reporta `build` (`AGENT_BUILD`) en `/health`. `/admin/servers` marca "Nodo desactualizado" cuando no coinciden. El agente local lo recibe de `deploy/scripts/deploy.sh`; los remotos, del `.env` que escribe `lib/node-provisioner.ts` (SHA de `commits/main` vía API de GitHub).
- **Staging efímero**: `docker-compose.staging.yml` + workflow manual `staging.yml` levantan la MISMA imagen de GHCR en un proyecto aislado (`ipstream-staging`, puertos loopback 3001/3308, DB y uploads propios, sin Caddy y sin tocar `*.casterfly.com`). Setup en el VPS: `bash deploy/scripts/setup-staging.sh`; luego `workflow_dispatch` "Staging (manual)". Acceso por túnel SSH. No reemplaza a producción.
- **TypeScript**: `strict: true` en `tsconfig.json`. El CI falla con cualquier error de tipos; no usar `any`/`@ts-ignore` para esquivarlo.

## Diseño / UI (sistema de marca)

- **Tokens centrales** en `app/globals.css` + `tailwind.config.js`. El look se cambia ahí, no por componente.
  - Marca: paleta `brand` en Tailwind (`bg-brand`, `text-brand`, `border-brand`, con opacidad) y variables `--brand-500` (#28B4F0), `--brand-700` (#0050B4), `--brand-300` (#64F0F0), `--brand-grad`.
  - Superficies: `bg-background` / `bg-card` / `bg-secondary`; bordes `border-border`; texto `text-foreground` / `text-muted-foreground`. Cambian según el tema (`data-theme`).
  - Radios `rounded-xl/2xl`; profundidad con bordes finos + `shadow-soft` (plana); verde `--success-500` solo para estado "en vivo".
- **Reglas al tocar UI**:
  1. Usar tokens (`bg-card`, `border-border`, `text-muted-foreground`, `brand`) en vez de colores crudos (`bg-gray-*`, `text-cyan-*`, `blue-*`).
  2. Evitar gradientes ruidosos, glassmorphism, `hover:scale` y sombras grandes (se quitaron a propósito).
  3. `text-white` solo sobre fondos de color (marca/estado); sobre superficies usar `text-foreground`.
  4. Reestilizar es **solo** `className`/CSS: no tocar props, handlers, rutas ni lógica.
- **Tema claro**: los tokens tienen variante `[data-theme="light"]`; mantener ambos temas.
- **Sitio público** (`registro`, `planes`, `auth`) es un diseño claro aparte: usa los acentos de marca pero conserva sus neutros claros.
- Referencia visual del refresh: maquetas en `/tmp/opencode/mockups`.

## App PWA hermana (`pwa/`)

- La app PWA de clientes (React 19 + Vite 8 + vite-plugin-pwa, react-router-dom, react-query, hls.js, Vitest, oxlint) vive en `pwa/`, copiada desde su repo original.
- **Dependencias aisladas: NO se usa npm workspaces.** `pwa/` tiene su propio `package.json` y su `node_modules` (gitignored). No agregar `"workspaces"` al `package.json` raíz: el panel usa React 18 y la PWA React 19, y el hoisting rompería el panel y el `npm ci` del Dockerfile.
- **4 reglas de aislamiento** (el panel debe seguir compilando/deployando igual):
  1. `tsconfig.json` raíz: `pwa` en `exclude`.
  2. `.dockerignore`: `pwa/` excluido del contexto de build.
  3. `.gitignore`: `pwa/node_modules/`, `pwa/dist/`, `pwa/.vite/`.
  4. `.github/workflows/deploy.yml`: `pwa/**` en `paths-ignore` (un cambio solo de PWA no deploya el panel).
- Build/dev de la PWA: `cd pwa && npm install && npm run build` (o `npm run dev`). Tests: `npm run test`.
- El servido del bundle, la resolución de tenant por dominio y el aprovisionamiento de dominios están implementados (cambio `tenant-runtime-pwa`); ver abajo.

## Sitios de clientes (bundle único de la PWA)

- La PWA se construye **una sola vez** y la sirve el panel para todos los clientes: `npm run build:client-site` (construye `pwa/` y publica en `CLIENT_SITE_DIR`, default `public/client-site`; en prod se monta `./data/client-site`).
- **Tenant por dominio**: tabla `client_domains` (se gestiona en `/admin/users/[id]/edit` → "Dominios del sitio"). `GET /api/public/resolve-domain?host=` mapea host → cliente (caché 60s). El shell dinámico (`index.html` con OG, `manifest.webmanifest`, iconos) lo sirve `/api/tenant/*`.
- **Routing**: Caddy manda los hosts de clientes a un bloque catch-all `:443` con header `X-Tenant-Site: 1`; el middleware de Next reescribe a `/api/tenant/*`. TLS on-demand acotado por `GET /api/domains/ask` (autoriza solo dominios `active`).
- **PWA**: resuelve el tenant en runtime por host (el `clientId` horneado queda como fallback de dev); templates lazy con fallback al default.
- **Configuración de plataforma desde el dashboard**: `/admin/settings` → pestaña **Sitios** (dominio base, target CNAME, IP, token de Cloudflare) con botón **"Asegurar DNS base"** (crea el wildcard `*.dominio`). Se guarda en `app_config`; si un campo está vacío, se usa la env como fallback. En CasterFly: `CLIENT_SITES_DOMAIN=casterfly.com`, `CLIENT_SITES_TARGET=clientes.casterfly.com`. Envs: `CLIENT_SITES_DOMAIN`, `CLIENT_SITES_TARGET`, `CLIENT_SITES_IP`, `CLOUDFLARE_API_TOKEN`, `CLIENT_SITE_DIR`.
- **Deploy**: el panel se deploya con GitHub Actions (push a `main`). El bundle de la PWA se publica con el workflow `deploy-site-bundle.yml` (se dispara con cambios en `pwa/**`) hacia `./data/client-site` del VPS. El bundle de producción usa la API same-origin (`VITE_API_BASE=''`).
- Un cambio que toca solo `pwa/**` **no** deploya el panel, pero **sí** republica el bundle (workflow aparte). Un cambio en el shell (`lib/client-site.ts`, `lib/client-icons.ts`, `app/api/tenant/*`, `middleware.ts`, `deploy/Caddyfile`) sí deploya el panel.

## Dominios CasterFly (mapa vigente)

- **Hosts**: `casterfly.com` → sitio público (contenedor `site`); `panel.casterfly.com` → panel Next.js/APIs; `stream.casterfly.com` → Icecast; `*.casterfly.com` → sitios de clientes; `www.casterfly.com` → 301 al root.
- **Caddy**: tres variables independientes en `deploy/Caddyfile`: `PUBLIC_DOMAIN`, `PANEL_DOMAIN`, `STREAM_DOMAIN`. No volver a usar `STREAM_DOMAIN` como dominio del panel.
- **Legacy**: `panelipstream.cl` redirige páginas con `308` pero mantiene `/api/*` proxeado para PWA instaladas; `stream.panelipstream.cl` sigue proxeando a Icecast; `*.ipstream.cl` sigue sirviendo como alias. No retirar estos hosts hasta actualizar nodos y PWA.
- **Datos**: `scripts/migrate-casterfly-domains.js` (dry-run por defecto; `--apply` escribe) actualiza `app_config`, `client_domains` (nuevo primario + alias viejo), `BasicData.websiteUrl` y el servidor principal de streaming. Es idempotente.
- **PWA**: el origen por defecto de desarrollo es `https://panel.casterfly.com`; el bundle de producción resuelve la API same-origin. El service worker solo cachea el origen configurado (nunca `panelipstream.cl`).
- **Marca**: el logo por defecto es `public/logo-casterfly.png` (tema claro) y `public/logo-casterfly-dark.png` (tema oscuro). La paleta `--brand-*` no cambia.

## Facturación / Pagos (multi-moneda + PayPal)

- **Precios por moneda**: `PlanPrice { planId, currency, amount }` (una fila por moneda) además del precio base `Plan.price/currency`. La web pública (`/planes`, `/registro`) y `PlanForm` muestran/editan esas monedas; el registro propaga la moneda elegida a `Subscription.billingCurrency` y al `Payment` (`amount`/`currency`).
- **Pago online con PayPal (USD)**: botón "Pagar con PayPal" en `/dashboard/payments` para pagos `pending`/`failed` en moneda soportada. Rutas: `POST /api/checkout/paypal` (crea orden) → retorno a `/dashboard/payments?paypal=return` → `POST /api/checkout/paypal/capture`; webhook público en `POST /api/webhooks/paypal` (verifica firma e idempotente vía `lib/billing-payments.ts` → `markPaymentPaid`, que activa la suscripción).
- **CLP se mantiene manual**: PayPal no soporta CLP; esos pagos siguen por transferencia + registro manual del admin.
- **Envs**: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` (`sandbox`|`live`), `PAYPAL_WEBHOOK_ID`. Sin credenciales, el botón no se muestra (el resto de la facturación sigue igual). `live` autentica en `api-m.paypal.com`; `sandbox` en `api-m.sandbox.paypal.com`.
- **Webhook**: crear el webhook en la app de PayPal → `https://<panel>/api/webhooks/paypal` con eventos `CHECKOUT.ORDER.APPROVED` y `PAYMENT.CAPTURE.COMPLETED`, y setear `PAYPAL_WEBHOOK_ID` (sin él, la firma no se puede verificar y el webhook responde 400).
- Solo toca el panel: un cambio aquí **no** requiere "Actualizar nodo".

## Streaming / Nodos remotos

- El deploy de GitHub Actions solo actualiza el panel y el agente del VPS principal.
- Los **nodos de streaming remotos** (registrados en `/admin/servers`) NO se actualizan solos: requieren pulsar el botón **"Actualizar nodo"** en `/admin/servers` (re-descarga el repo, copia el código, levanta el stack con `--build --force-recreate` y reinicia los streams activos).
- **Siempre que se haga un cambio que toque el streaming-agent o sus scripts** (lib/streaming-client.ts, streaming/agent/*, streaming/liquidsoap/*, docker-compose.streaming.yml, node-provisioner.ts), indicar al usuario que debe pulsar "Actualizar nodo" en cada nodo remoto después del deploy.
- Un cambio de dominio/CORS/DB host **no toca código del agente**, pero sí su entorno: después de deployar el panel hay que pulsar **"Actualizar nodo"** en cada nodo remoto (o editar su `.env` y reiniciar) para que reciba `CORS_ALLOWED_ORIGINS=https://panel.casterfly.com,https://panelipstream.cl` y `DB_HOST=panel.casterfly.com`.
- Si el cambio toca SOLO el panel (app/*, lib/* que no use el agente), no hace falta el botón.

## Consola web de radio ("Transmitir en vivo")

- Sección `/dashboard/streaming/live`: vista principal tipo RadioBOSS/ZaraRadio (navegador de archivos a la izquierda, lista a la derecha, transporte anterior/play-pausa/siguiente, seek, actual/próximo) + **botonera de efectos**. El mezclador de 2 decks/EQ/loops/mic/talkover/cue **no se muestra** por ahora; los componentes quedan para retomarlo. Biblioteca local (File System Access + IndexedDB; Chromium recuerda carpeta, el resto por sesión); los audios **no se suben** al servidor.
- **Efectos de sonido**: `lib/live-console/effects.ts` (Blobs en IndexedDB, tamaño en localStorage) y `SoundEffectsPad`; el motor los conecta a `masterGain` para que salgan al stream y al monitor. Persisten al cerrar el navegador; no se suben al servidor.
- **Fish Audio / voces**: proveedor alternativo configurable en `/admin/settings` → **Locución** → pestaña **Fish Audio**. El admin carga hasta **6 voces Fish: 3 masculinas y 3 femeninas** (`fishAudioVoices` en `app_config`); cada cliente elige una (`RadioStream.fishVoiceId`) y puede escuchar una muestra por voz antes de elegir (audio cacheado en `tts-cache`). El modelo, la API key, la voz predeterminada y la dirección (`FISH_AUDIO_DIRECTION`) son globales. Para expresividad se usa `s2.1-pro` (soporta `[emphasis]`, `[pausa breve]`, etc.); Drama 3 sigue disponible. La dirección se antepone, se agrega pausa después de la primera frase y las direcciones por contexto viven en `lib/fish-audio-directions.ts`. Fish pasa por el mismo post-proceso que ElevenLabs y cachea en `fish/v2`. ElevenLabs queda en otra pestaña y solo se activa desde ahí. Es solo panel: no requiere **"Actualizar nodo"**. Drama 3 cuesta USD 10/M UTF-8 en promo hasta el 12/11/2026 17:00 UTC; después USD 50/M.
- **Locuciones de clima/hora**: botones en `AnnouncementsBar`; el panel arma el texto (clima desde `BasicData` + Open-Meteo; hora desde `Client.timezone`). La voz principal es **ElevenLabs** (`/admin/settings` → **Locución**): API key encriptada en `app_config`, Voice ID y modelo (`eleven_v4_turbo`). Los audios se cachean en `app_uploads/tts-cache` (toggle en la misma sección); una frase repetida no se paga de nuevo. Si falla o no está configurado, cae a **Piper** (`streaming/piper`, voces `es_MX-ald-medium` y `es_MX-claude-high`) y el audio se reproduce con ducking de la música. Tocar `streaming/piper/*`, `streaming/agent/*` o `docker-compose.streaming.yml` obliga a **"Actualizar nodo"**; ElevenLabs es solo panel y no requiere ese paso. Envs: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL`, `TTS_CACHE_ENABLED`.
- **Plan IA en vivo** (`Plan.aiLiveEnabled` + `Plan.aiMonthlyCharacters`): presentador automático cada N temas (default 3, intro máx. 15 s con nombre de la estación y próximo tema), locuciones libres y voz premium. La cuota se descuenta solo en cache miss (`AiTtsUsage` / `lib/ai-live.ts`); los cache hits no consumen. Al agotarse, clima/hora y locuciones libres caen a Piper; el presentador se omite. Los spots generados se agregan a la cola como `LocalTrack.kind = 'spot'` y no cuentan para el presentador. Rutas: `/api/dashboard/streaming/live/tts` (texto libre) y `/api/dashboard/streaming/live/announce` (clima/hora, también con cuota).
- **Música de jingles y cápsulas**: la biblioteca global vive en `/admin/music` (`MusicTrack` + `public/uploads/music`). Cada cliente elige una pista activa desde `/dashboard/streaming/jingles` (`RadioStream.jingleMusicTrackId`); se usa para jingles y como cortina de cápsulas. La IA ya **no genera música**: solo locución. Los jingles ya no usan Eleven Music y `Plan.aiMusicMinutes` queda deprecado. No requiere **"Actualizar nodo"**.
- **AutoDJ IA**: fuente Liquidsoap **separada de los jingles** (`ai-intros.m3u` + `rotate` sobre la música; los jingles quedan en una capa exterior). `RadioStream.aiPresenterEnabled/aiPresenterEvery` define la frecuencia. El panel genera las intros con ElevenLabs y las sube al agente vía `/api/streams/:clientId/ai-intros/upload`; el agente no toca `jingles.m3u` ni `jinglePlayEvery`. Requiere playlist sin shuffle. Tocar `streaming/agent/*` o `streaming/liquidsoap/*` obliga a **"Actualizar nodo"** en los nodos remotos. La ruta del panel es `/api/dashboard/streaming/ai/autodj`; la configuración (activo, frecuencia, frases y botón **Aplicar al AutoDJ**) vive en **`/dashboard/streaming/locutor-ia`**. Las frases admiten `{{radio}}`, `{{titulo}}` y `{{artista}}`, se eligen al azar y se guardan en `RadioStream.aiIntroPhrases`. En la consola en vivo solo queda el botón **Libre** para locuciones libres.
- Motor en `lib/live-console/*` (Web Audio, sin React) y UI en `components/dashboard/streaming/live/*`.
- Transporte pluggable: `WHIP/WebRTC` contra SRS (primario) y `WebSocket + FFmpeg` (fallback). El puente corre en el contenedor `audio-bridge` y publica al harbor de Liquidsoap del slot.
- Envs: `LIVE_SESSION_SECRET`, `LIVE_AUDIO_BITRATE` (192), `LIVE_BRIDGE_CODEC` (`mp3`), `AUDIO_BRIDGE_CONTAINER`, `SRS_RTC_UDP_PORT` (8010), `RTC_CANDIDATE`, `LIVE_ICE_SERVERS`, `LIVE_TRANSPORT_DEFAULT`.
- Nodos: abrir **UDP 8010**, setear `RTC_CANDIDATE` con IP pública, y enrutar `/rtc/*` + `/ws/live` al agente. Tocar cualquiera de esos archivos (`streaming/agent/*`, `streaming/srs/*`, `streaming/audio-bridge/*`, `docker-compose.streaming.yml`, `deploy/Caddyfile*`, `lib/node-provisioner.ts`) obliga a **"Actualizar nodo"** tras el deploy.
- Antes de fijar WHIP como transporte definitivo, correr el gate A/B de calidad a 192k del change `radio-live-console`.
- **Watchdog de Icecast**: el `stream-supervisor` del agente revisa Icecast cada 60 s; si no responde, reinicia `ipstream-icecast` y recupera los streams sin mount (salvo que haya un DJ conectado). Cooldown 60 s. Tocar `stream-supervisor.js` obliga a **"Actualizar nodo"**.
- **Fallback por silencio**: cada `input.harbor` se envuelve con `blank.detect`; si la fuente en vivo queda en silencio, el agente termina la consola o hace kick del DJ externo y vuelve el AutoDJ. Envs: `RADIO_SILENCE_FALLBACK_SECONDS` (10), `RADIO_SILENCE_THRESHOLD_DB` (-50), `RADIO_SILENCE_COOLDOWN_SECONDS` (30). Tocar el script generator/agente obliga a **"Actualizar nodo"** y reiniciar los streams para regenerar los `.liq`.

## Subida de video de TV (archivos grandes)

- La videoteca de TV sube videos por streaming (sin buffer en memoria) hasta el máximo configurable `MAX_VIDEO_UPLOAD_MB` (default `2048` MB) y muestra una cola con progreso.
- La normalización al formato canónico corre en background: el track pasa por `pending` → `processing` → `ready`/`error`. Solo los tracks `ready` se reproducen en el AutoDJ.
- Envs nuevas, aplican al panel y al agente: `MAX_VIDEO_UPLOAD_MB` (MB, default 2048) y `FFMPEG_TIMEOUT_MS` (ms, `0` = sin límite).
- El agente ahora comparte el volumen `./data/video` con `video-encoder` (escribe las subidas directo a disco).
- Tocar `streaming/agent/*` y `docker-compose.streaming.yml`: **recordar pulsar "Actualizar nodo"** en los nodos remotos tras el deploy.

## Playout de TV: VOD2Live (stitching) — modo por defecto

- `TV_PLAYOUT=stitch` (default): el AutoDJ se sirve como un **manifiesto HLS vivo** (`/api/video/playout/<key>/live.m3u8` en el agente, expuesto público por el panel en `/vod/<key>/live.m3u8`). No hay proceso ffmpeg de AutoDJ.
- **ABR (ladder)**: cada video se empaqueta a HLS en varias rendiciones (`TV_VIDEO_LADDER`, default `1080p:2000,720p:1000`), en `hls/<clientId>/<trackId>/<rendition>/`. `video_tracks.renditions` (JSON) lista las variantes; `hlsPath` es el directorio del track.
  - El canal expone un **master** en `/vod/<key>/live.m3u8` (y `/api/video/playout/<key>/live.m3u8`), con manifiestos vivos por rendición en `live/<rendition>.m3u8`. Los segmentos usan `/seg/<rendition>/<trackId>/<file>`.
  - El player (hls.js) hace **ABR automático**; no hay selector manual.
  - **Intersección:** el master solo lista rendiciones presentes en TODOS los tracks del ciclo. Si hay tracks legados (single-rendition), el canal colapsa a una sola rendición (sin ABR) hasta re-empaquetar todo el ciclo.
- El **stitcher** (`lib/channel-stitcher.js`) arma la ventana viva encadenando assets con `EXT-X-DISCONTINUITY`. Los segmentos se mapean **por índice** entre rendiciones (alineados por GOP), para que el cambio de calidad no salte de posición.
- El **DJ en vivo** sigue por SRS (`/dj/<key>.m3u8`); el player cambia según el estado.
- Reempaquetar catálogo: `docker exec ipstream-streaming-agent node scripts/package-videos.js [clientId] [--force]`.
- Al re-encodear/reemplazar un track, los segmentos mantienen su nombre → **purgar caché de Cloudflare** de esas URLs.
- `TV_PLAYOUT=concat` restaura el modo legacy (concat `-c copy` a RTMP, requiere formato uniforme).
- Tocar `streaming/agent/*`: **"Actualizar nodo"** en los remotos.
- Tests del stitcher/ABR: `cd streaming/agent && npm test` (node --test).

## Estabilidad del AutoDJ de TV (HLS)

- Los videos se llevan a un canónico estricto y uniforme: 1920×1080 con padding, H.264 main@4.0 yuv420p, 30 fps CFR, keyframe cada 2 s, AAC 128k 44.1k estéreo (se agrega silencio si el origen no tiene audio).
- **Fast-path**: si el archivo ya cumple el canónico (resolución/fps/SAR/audio/keyframes), NO se re-encodea (queda `ready` al instante). Solo se re-encodea lo que no cumple.
- El re-encode usa `FFMPEG_PRESET` (default `ultrafast`) y `FFMPEG_THREADS` (default `0` = auto) para bajar la CPU. En servidores con más margen se puede subir a `veryfast`/`fast` para mejor calidad.
- El AutoDJ emite por `-c:v copy` con la playlist en formato `ffconcat` con `duration` por archivo y timestamps estabilizados (`+genpts+discardcorrupt`, `avoid_negative_ts`, `flvflags no_duration_filesize`). SRS segmenta a 2 s (`hls_fragment 2`, `hls_window 12`).
- El catálogo legado se sanea: al iniciar el AutoDJ los tracks no conformes se excluyen y se re-encolan. Para re-normalizar todo el catálogo de una vez:
  `docker exec ipstream-streaming-agent node scripts/renormalize-videos.js [clientId] [--all]`
- Para verificar conformidad (resolución/fps/SAR/códec/audio/keyframes):
  `docker exec ipstream-streaming-agent node scripts/check-conformity.js [clientId]`
- Tocar `streaming/agent/*` o `streaming/srs/*`: **recordar pulsar "Actualizar nodo"** en los nodos remotos tras el deploy.

## Analítica / Estadísticas (analytics-redesign)

- Sección del cliente en `/dashboard/estadisticas` (tabs **Radio | TV**). La antigua `/dashboard/streaming/stats` **redirige** ahí.
- **Recolección (agente, cada 1 min)**: concurrencia de radio desde Icecast (`status-json.xsl`) y espectadores de TV desde el log de Caddy → `listener_samples` / `viewer_samples` (incluye `online` para promediar y medir uptime).
- **Sesiones** (IP real, duración, dispositivo, geolocalización): se derivan del access log de **Caddy** (no de Icecast, que está detrás del proxy y solo ve la IP del proxy) → `listener_sessions` / `viewer_sessions`. Idempotente por `signature` única.
- **Rollups**: `metrics_hourly` (UTC) y `metrics_daily` (día local del cliente, alineado con `client.timezone`). Retención por capas en `streaming/agent/lib/retention-plan.js`: crudo 30 días, rollups 24 meses.
- **Zona horaria**: se configura en **Datos Básicos** (ya no en la parrilla). Al cambiarla, el panel recalcula los `metrics_daily` del cliente vía `POST /api/analytics/recompute-daily` del agente.
- **GeoIP** local con `geoip-lite` (sin license key) y dispositivo con `ua-parser-js`. La IP solo se guarda en la sesión cruda y no se expone en la UI.
- **Dependencias nuevas del agente**: `geoip-lite`, `ua-parser-js`.
- **Nodos**: `Caddyfile.node` (y el `CADDYFILE` de `lib/node-provisioner.ts`) ahora escribe `log` a `/data/access.log` (radio + TV); sin eso, los nodos remotos no alimentan sesiones.
- Tests del agente (incluye analytics): `cd streaming/agent && npm test`.
- Tocar `streaming/agent/*`: **pulsar "Actualizar nodo"** en cada nodo remoto tras el deploy.
