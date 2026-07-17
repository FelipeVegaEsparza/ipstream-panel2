# Streaming — Resultados de Fase 1

**Fecha:** 2026-07-16
**Estado:** ✅ Validado
**Tiempo de ejecución:** ~1.5h

## Objetivo

Crear los modelos de datos para streaming en Prisma, hacer la primera
migración y tener un **streaming-agent** corriendo como sidecar
que pueda ser consumido por el IPStream Panel.

## Lo que se construyó

### 1. Schema Prisma — 5 modelos nuevos

| Modelo | Propósito | Relaciones |
|---|---|---|
| `RadioStream` | Config + estado de la radio de un cliente (1:1 con Client) | Client, Track[], Playlist[] |
| `Track` | Un MP3 de la biblioteca de un cliente | Client, RadioStream, PlaylistEntry[] |
| `Playlist` | Lista ordenada de tracks para AutoDJ (solo 1 activa por radio) | Client, RadioStream, PlaylistEntry[] |
| `PlaylistEntry` | M:N entre Playlist y Track con `order` | Playlist, Track |
| `StreamingAuditLog` | Log de todas las acciones de streaming | Client |

**Campos clave:**
- `RadioStream.icecastMount` (único) — el path en Icecast (ej: `test_b31024e8`)
- `RadioStream.liquidsoapTelnetPort` (único) — puerto telnet 1 por cliente
- `RadioStream.sourcePasswordEnc` y `livePasswordEnc` — encriptados con AES-256-GCM (formato `iv:tag:enc` en hex, compatible con `lib/encryption.ts`)
- `RadioStream.status` — `off | autodj | live`
- `RadioStream.liquidsoapRunning` / `liquidsoapPid` / `liquidsoapStartedAt` — para tracking del proceso

### 2. Bug encontrado y arreglado

**Bug pre-existente**: `lib/encryption.ts` parseaba `ENCRYPTION_KEY` como **hex** (32 bytes = 64 chars), pero `.env.example`/`.env.docker` la tenía como **base64**. Cualquier uso de `encrypt()` o `decrypt()` fallaba en silencio o rompía.

**Fix**: Generada nueva key hex (`326fd50fc31e23b8f2b76a4ceedd16182aa3e7eb4dbdae61ad5c9da0d592851e`), actualizada en `.env.docker` y `.env.example`. Validado encrypt + decrypt end-to-end con un test client.

### 3. Streaming Agent — servicio nuevo

**Stack:** Node 20 + Fastify 4 + mysql2 + pino + dotenv

**Estructura:**
```
streaming/agent/
├── package.json
├── Dockerfile
├── .env.example
├── server.js                # bootstrap Fastify
└── lib/
    ├── config.js            # carga y valida env vars
    ├── db.js                # pool mysql2/promise
    ├── auth.js              # Bearer token middleware
    └── logger.js            # pino logger
```

**Endpoints actuales (Phase 1):**
- `GET /health` — health check, ping DB
- `GET /` — info del servicio

**Auth:** middleware verifica `Authorization: Bearer ${STREAMING_AGENT_TOKEN}` en TODOS los endpoints excepto `/health`. Validado: 401 sin token, 200 con token válido.

### 4. Docker Compose — 5to servicio

Agregado `agent` al `docker-compose.yml`:
- Build desde `./streaming/agent`
- Mismo `network` que el resto
- Volumen `./data/radio` compartido con `liquidsoap`
- Volumen de scripts de liquidsoap (donde el agent va a escribir los `.liq` por cliente)
- Health check: `curl /health`
- Puerto 4000 expuesto a `127.0.0.1` (para debug desde el host)

## Pruebas realizadas

### ✅ Migración Prisma aplicada

```sql
SHOW TABLES;
-- 5 tablas nuevas:
-- playlist_entries, playlists, radio_streams, streaming_audit_logs, tracks
```

### ✅ Streaming agent arranca

```
[22:42:13] Streaming agent escuchando en http://0.0.0.0:4000
```

### ✅ Health check (sin auth)

```bash
$ curl http://localhost:4000/health
{
  "status": "ok",
  "service": "ipstream-streaming-agent",
  "version": "0.1.0",
  "checks": { "agent": "ok", "db": "ok" },
  "timestamp": "2026-07-16T22:42:22.285Z"
}
```

### ✅ Agent accesible desde el panel

```bash
$ docker exec ipstream-app curl http://agent:4000/health
{"status":"ok",...}
```

### ✅ Auth funciona

```bash
$ curl http://localhost:4000/                       # 401
$ curl -H "Authorization: Bearer <wrong>" /        # 401
$ curl -H "Authorization: Bearer <correct>" /      # 200
```

### ✅ Test client + RadioStream creado

```bash
$ docker exec ... node seed-test-client.js
{
  "clientId": "test_4fe56d37",
  "rsId": "rs_e832e755fa0a7f66",
  "mount": "test_b31024e8",
  "telnetPort": 29912,
  "srcPwd": "3196624346fb8d64",
  "livePwd": "14810a103e8f8ff7"
}
```

### ✅ Encriptación end-to-end

```bash
$ # Después de guardar y leer de DB:
srcPwd_decrypted: "3196624346fb8d64"   # idéntica a la original
livePwd_decrypted: "14810a103e8f8ff7"
```

## Estado actual de los contenedores

```bash
$ docker compose ps
NAME                       STATUS                    PORTS
ipstream-db                Up (healthy)              0.0.0.0:3307->3306/tcp
ipstream-app               Up (healthy)              0.0.0.0:3000->3000/tcp
ipstream-icecast           Up (healthy)              0.0.0.0:8000->8000/tcp
ipstream-liquidsoap        Up (healthy)
ipstream-streaming-agent   Up                        127.0.0.1:4000->4000/tcp
```

## Archivos creados

- `streaming/agent/package.json`
- `streaming/agent/Dockerfile`
- `streaming/agent/.env.example`
- `streaming/agent/server.js`
- `streaming/agent/lib/config.js`
- `streaming/agent/lib/db.js`
- `streaming/agent/lib/auth.js`
- `streaming/agent/lib/logger.js`
- `streaming/PHASE-1-RESULTS.md`

## Archivos modificados

- `prisma/schema.prisma` — agregados 5 modelos + relación `Client.radioStream`
- `.env` (renombrado de `.env.docker`) — nueva key hex de encriptación
- `.env.example` — nueva key hex
- `docker-compose.yml` — servicio `agent` + bind-mount del schema Prisma
- `.gitignore` — agrega `streaming/agent/node_modules/`

## Próximos pasos (Fase 2)

- [ ] Endpoint `POST /api/streams/:clientId/start` — genera script `.liq`, lo escribe, lo inicia via `docker exec`
- [ ] Endpoint `POST /api/streams/:clientId/stop`
- [ ] Endpoint `GET /api/streams/:clientId/status` — lee de Icecast `/status-json.xsl`
- [ ] WebSocket `ws://agent:4000/ws/streams/:clientId` — push de status en vivo
- [ ] Lib `icecast.js` — cliente HTTP para Icecast
- [ ] Lib `liquidsoap.js` — wrapper para spawn/kill/restart
- [ ] Script generator — genera el `.liq` por cliente basado en playlist activa

## Decisiones pendientes

1. **¿Cómo ejecutar nuevos procesos liquidsoap?** Opciones:
   - **A:** `docker exec` en el container `liquidsoap` (compartir socket docker)
   - **B:** Mismo container, agent con acceso a `liquidsoap` bin
   - **C:** Sidecar `liquidsoap-controller` que recibe comandos del agent via HTTP/WS
   - Recomendación: **A** para v1, **C** cuando tengamos 50+ clientes.

2. **¿Cómo almacenar el `icecastMount`?** Ya decidimos `clientId` o derivado. Para v1: usar `clientId` truncado + hash si es muy largo.

3. **¿Auto-crear RadioStream cuando se crea un Client?** Sí, via un trigger o en el flujo de creación de clientes. Phase 4 del plan.
