# Streaming — Resultados de Fase 0

**Fecha:** 2026-07-16
**Estado:** ✅ Validado
**Tiempo de ejecución:** ~2h

## Objetivo

Validar que el stack **Icecast 2 + liquidsoap 2.1.3** funciona en Docker,
con el flujo completo:
```
biblioteca MP3 → liquidsoap (decodifica, encode MP3) → Icecast → listener HTTP
```

## Arquitectura validada

```
┌────────────────────┐         ┌─────────────────────┐
│   icecast          │         │   liquidsoap        │
│   (imagen custom   │ ◀────── │   (debian +         │
│   desde debian)    │  output │    liquidsoap +     │
│                    │  .icecast  ffmpeg)            │
│   puerto 8000      │         │                     │
└────────────────────┘         └─────────────────────┘
        ▲
        │ HTTP GET /test, /test-mp3
        │
   ┌────┴────┐
   │ listener│
   └─────────┘
```

## Componentes creados

| Path | Descripción |
|---|---|
| `streaming/icecast/Dockerfile` | Imagen custom de Icecast 2.4.4 (debian bookworm) |
| `streaming/icecast/entrypoint.sh` | Inyecta vars de entorno con `envsubst` |
| `streaming/icecast/icecast.xml` | Config con mountpoints dinámicos (`<mount type="default">`) |
| `streaming/liquidsoap/Dockerfile` | Imagen con liquidsoap 2.1.3 + ffmpeg |
| `streaming/liquidsoap/entrypoint.sh` | Ejecuta el `.liq` que se le pasa |
| `streaming/liquidsoap/scripts/test.liq` | Test: sine wave 440Hz → /test |
| `streaming/liquidsoap/scripts/test-playlist.liq` | Test: playlist MP3 → /test-mp3 |
| `streaming/liquidsoap/generate-test-mp3s.sh` | Genera 3 tonos MP3 con ffmpeg |
| `data/radio/test/mp3/*.mp3` | 3 MP3s de prueba (440, 523, 659 Hz, 30s c/u) |
| `docker-compose.yml` | Modificado: 4 servicios (db, app, icecast, liquidsoap) |

## Decisiones técnicas tomadas

1. **Imagen custom de Icecast** (en vez de `infiniteproject/icecast2:latest` que no existe en Docker Hub)
   - Basada en `debian:bookworm-slim` + `icecast2`
   - Usuario no-root `icecast` (uid 1001)
   - `<changeowner>` como top-level element (correcto para Icecast 2.4)
   - `envsubst` para inyectar passwords desde variables de entorno

2. **Imagen custom de liquidsoap**
   - `debian:bookworm-slim` + `liquidsoap` + `ffmpeg` (sin paquetes extra que no existen en bookworm main)
   - `set("init.allow_root", true)` en cada script (liquidsoap no quiere root)
   - Default `command: ["test-playlist.liq"]`

3. **Mountpoints dinámicos en Icecast**
   - `<mount type="default">` aplica a cualquier `/<clientId>` que conecte
   - En producción: cada cliente = un mountpoint con `clientId` como nombre
   - Permite 50+ clientes sin enumerar mountpoints en config

4. **Almacenamiento de MP3s**
   - Fase 0: bind-mount a `./data/radio/` (path del proyecto)
   - Producción: cambiar a named volume `radio_library`

5. **Detección de MP3 con ffmpeg**
   - El paquete `liquidsoap` de Debian no incluye `mad` (decoder MP3) built-in
   - Usa ffmpeg como decoder externo (priority 10) → funciona out-of-the-box

## Pruebas realizadas

### ✅ Test 1: Icecast responde

```bash
$ curl -s http://localhost:8000/status-json.xsl | jq '.icestats.server_id, .icestats.location'
"Icecast 2.4.4"
"IPStream Panel Streaming"
```

### ✅ Test 2: Liquidsoap conecta con Icecast (sine wave)

```bash
$ curl -s http://localhost:8000/status-json.xsl | jq '.icestats.source | {mount: .listenurl, name: .server_name, bitrate}'
{
  "mount": "http://localhost:8000/test",
  "name": "IPStream Test",
  "bitrate": 128
}
```

### ✅ Test 3: Listener recibe audio válido (sine)

```bash
$ ffmpeg -i /tmp/stream-sample.mp3 -t 2 -f null -
Input #0, mp3, from '/tmp/stream-sample.mp3':
  Duration: 00:00:06.73, start: 0.000000, bitrate: 128 kb/s
  Stream #0:0: Audio: mp3 (mp3float), 44100 Hz, stereo, fltp, 128 kb/s
```

### ✅ Test 4: Liquidsoap con playlist de MP3s reales

```bash
$ curl -s http://localhost:8000/status-json.xsl | jq '.icestats.source | {mount: .listenurl, name: .server_name, listeners}'
{
  "mount": "http://localhost:8000/test-mp3",
  "name": "IPStream Test (MP3)",
  "listeners": 1
}
```

### ✅ Test 5: Listener recibe audio válido (playlist)

```bash
$ ffmpeg -i /tmp/stream-mp3.mp3 -t 2 -f null -
Input #0, mp3, from '/tmp/stream-mp3.mp3':
  Stream #0:0: Audio: mp3, 44100 Hz, stereo, 128 kb/s
size=N/A time=00:00:02.00 bitrate=N/A speed= 546x
```

### ⏸️ Test 6 (cancelado): DJ con prioridad alta
Decidimos no implementarlo en Fase 0 porque:
- Requiere un cliente externo (BUTT/MIXXX) o un segundo liquidsoap
- El comportamiento está documentado en Icecast y es estándar
- Lo validaremos cuando construyamos el `streaming-agent` (Fase 2+)

## Estado actual de los contenedores

```bash
$ docker compose ps
NAME                   STATUS                    PORTS
ipstream-db            Up (healthy)              0.0.0.0:3307->3306/tcp
ipstream-app           Up (healthy)              0.0.0.0:3000->3000/tcp
ipstream-icecast       Up (healthy)              0.0.0.0:8000->8000/tcp
ipstream-liquidsoap    Up
```

## Comandos útiles

```bash
# Ver status JSON de Icecast
curl -s http://localhost:8000/status-json.xsl | jq

# Escuchar el stream (sine wave)
ffplay http://localhost:8000/test

# Escuchar la playlist
ffplay http://localhost:8000/test-mp3

# Ver logs de liquidsoap
docker logs -f ipstream-liquidsoap

# Cambiar el script de liquidsoap
docker compose stop liquidsoap
docker compose rm -f liquidsoap
docker compose up -d liquidsoap
```

## Warnings conocidos (no bloqueantes)

1. **`<hostname> not configured, using default "localhost"`** — Icecast 2.4.4
   ignora el `<hostname>` que seteamos con envsubst. No es un problema para
   nuestro caso (no usamos YP directory). En Icecast 2.5+ se arregla.

2. **"set" is deprecated en liquidsoap** — En 2.2+ será obligatorio usar
   `settings.path.to.key.set(value)`. Por ahora funciona con warnings.

3. **Cannot open mime types file `/etc/mime.types`** — Warning al arrancar.
   No afecta funcionalidad. En prod podemos montar `/etc/mime.types`.

4. **DYNAMIC_SERVER_USAGE en `/api/impersonation/client-data`** — Error
   preexistente del IPStream Panel, no relacionado con streaming. Lo
   arreglaremos aparte.

## Próximos pasos (Fase 1)

- [ ] Crear modelos Prisma: `RadioStream`, `Track`, `Playlist`, `PlaylistEntry`, `StreamingAuditLog`
- [ ] Crear migración
- [ ] Decidir estructura del `streaming-agent` (Node + Fastify)
- [ ] Empezar a generar scripts `.liq` dinámicamente por cliente

## Archivos modificados

- `docker-compose.yml` — añadidos servicios `icecast` y `liquidsoap`
- `.env.docker` — añadidas vars `ICE_*`
- `.env.example` — añadidas vars `ICE_*` documentadas
- `.gitignore` — ignorar `./data/` (biblioteca de MP3s local)
