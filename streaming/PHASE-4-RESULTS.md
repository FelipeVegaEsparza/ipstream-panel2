# Streaming — Resultados de Fase 4

**Fecha:** 2026-07-16
**Estado:** ✅ Validado
**Tiempo de ejecución:** ~1h

## Objetivo

Conectar el **IPStream Panel** con el **streaming-agent**:
cliente HTTP typed, route handlers con auth, validación Zod,
endpoint público para sitios de clientes.

## Lo que se construyó

### Lib nuevas (panel)

| Archivo | Función |
|---|---|
| `lib/streaming-client.ts` | Cliente HTTP del agent (fetch + AbortController + manejo de errores) |
| `lib/streaming-auth.ts` | `requireStreamingClient()` — resuelve el RadioStream del cliente autenticado |

### Validations (panel)

Agregados a `lib/validations.ts`:
- `streamingPlaylistCreateSchema`
- `streamingPlaylistUpdateSchema`
- `streamingTrackAddSchema`
- `streamingReorderSchema`
- `streamingTrackUpdateSchema`

### API dashboard (`/api/dashboard/streaming/*`)

| Método | Path | Acción |
|---|---|---|
| `GET` | `/status` | Status combinado (DB + Icecast + proceso) |
| `POST` | `/control` | start / stop / restart (body: `{action}`) |
| `GET` | `/library` | Listar tracks |
| `POST` | `/library` | Upload MP3 (multipart) |
| `PATCH` | `/library/:trackId` | Editar metadata |
| `DELETE` | `/library/:trackId` | Eliminar track |
| `GET` | `/playlists` | Listar playlists |
| `POST` | `/playlists` | Crear playlist |
| `GET` | `/playlists/:id` | Detalle con entries |
| `PATCH` | `/playlists/:id` | Editar nombre/desc/shuffle/repeat |
| `DELETE` | `/playlists/:id` | Eliminar playlist |
| `POST` | `/playlists/:id/activate` | Marcar como activa |
| `POST` | `/playlists/:id/tracks` | Agregar track |
| `DELETE` | `/playlists/:id/tracks/:trackId` | Quitar track |
| `POST` | `/playlists/:id/reorder` | Reordenar (drag&drop) |

**Total: 15 endpoints nuevos**

### API pública (`/api/public/:clientId/streaming/*`)

| Método | Path | Acción |
|---|---|---|
| `GET` | `/status` | Status público (sin auth) — usado por el sitio del cliente |

Devuelve:
```json
{
  "clientId": "test_4fe56d37",
  "clientName": "Test Radio 1",
  "mount": "test_b31024e8",
  "bitrate": 128,
  "status": "autodj",
  "isLive": true,
  "listeners": 0,
  "listenerPeak": 0,
  "currentTitle": "Unknown",
  "streamUrls": {
    "http": "http://localhost:8000/test_b31024e8"
  },
  "lastUpdate": "2026-07-17T01:27:15.935Z"
}
```

## Decisiones técnicas

1. **Cliente HTTP con `fetch` nativo** de Node 20 (no usamos `node-fetch` ni `axios`).
2. **Timeout diferenciado**: 30s para GET, 120s para uploads de MP3.
3. **AbortController** para cancelación limpia.
4. **`StreamingAgentError` class** para tipar errores y preservar status code.
5. **`StreamingAuthError` class** para errores de auth en el panel.
6. **Validación Zod** en TODOS los endpoints que reciben body.
7. **Auth check** centralizado en `requireStreamingClient()` que valida:
   - Sesión activa
   - ClientId solicitado coincide con el del session (o es ADMIN impersonando)
   - El cliente tiene RadioStream
8. **`force-dynamic`** en endpoint público para que Next.js no lo cachee.

## Pruebas realizadas

### ✅ Login como CLIENT y acceso a endpoints

```bash
# Login (con test user)
$ curl -c /tmp/cookies.txt -X POST \
  -d "email=test_4fe56d37@test.ipstream&password=test123456" \
  http://localhost:3000/api/auth/callback/credentials
302

# Status
$ curl -b /tmp/cookies.txt http://localhost:3000/api/dashboard/streaming/status
{
  "hasRadioStream": true,
  "clientId": "test_4fe56d37",
  "process": { "running": true, "pid": 2551 },
  "icecast": { "listeners": 0, "listenurl": "http://localhost:8000/test_b31024e8", ... }
  "db": { "status": "autodj" }
}
```

### ✅ Control: start/stop/restart

```bash
$ curl -X POST -b /tmp/cookies.txt -d '{"action":"stop"}' .../control
{ "ok": true, "action": "stop", "wasRunning": true, "killedPid": 2551 }

$ curl -X POST -b /tmp/cookies.txt -d '{"action":"start"}' .../control
{ "ok": true, "action": "start", "pid": 2831, "hasPlaylist": true }
```

### ✅ CRUD playlists

```bash
$ curl -X POST -b /tmp/cookies.txt -H "Content-Type: application/json" \
  -d '{"name":"Playlist desde Panel","shuffle":false,"repeat":true}' .../playlists
{ "ok": true, "playlistId": "pl_e3a09102", "name": "Playlist desde Panel" }
```

### ✅ Validación Zod rechaza payload inválido

```bash
$ curl -X POST -b /tmp/cookies.txt -d '{"name":""}' .../playlists
{
  "error": "validation_error",
  "details": { "fieldErrors": { "name": ["El nombre es requerido"] } }
}
HTTP 400
```

### ✅ Endpoint público

```bash
$ curl http://localhost:3000/api/public/test_4fe56d37/streaming/status
{
  "clientId": "test_4fe56d37",
  "clientName": "Test Radio 1",
  "mount": "test_b31024e8",
  "bitrate": 128,
  "isLive": true,
  "listeners": 0,
  "streamUrls": { "http": "http://localhost:8000/test_b31024e8" }
}

$ curl http://localhost:3000/api/public/no_existe/streaming/status
{ "error": "not_found" }
HTTP 404
```

## Archivos creados

### Lib
- `lib/streaming-client.ts`
- `lib/streaming-auth.ts`

### API dashboard (15 archivos)
- `app/api/dashboard/streaming/status/route.ts`
- `app/api/dashboard/streaming/control/route.ts`
- `app/api/dashboard/streaming/library/route.ts`
- `app/api/dashboard/streaming/library/[trackId]/route.ts`
- `app/api/dashboard/streaming/playlists/route.ts`
- `app/api/dashboard/streaming/playlists/[id]/route.ts`
- `app/api/dashboard/streaming/playlists/[id]/activate/route.ts`
- `app/api/dashboard/streaming/playlists/[id]/tracks/route.ts`
- `app/api/dashboard/streaming/playlists/[id]/tracks/[trackId]/route.ts`
- `app/api/dashboard/streaming/playlists/[id]/reorder/route.ts`

### API pública
- `app/api/public/[clientId]/streaming/status/route.ts`

## Archivos modificados

- `lib/validations.ts` — agregados 5 schemas Zod
- `.env.docker` y `.env.example` — agregadas vars `STREAMING_AGENT_URL`, `STREAMING_AGENT_TOKEN`, `ICE_PUBLIC_URL`
- `docker-compose.yml` — agregadas vars al servicio `app`

## Estado del sistema

```
5 contenedores healthy
15 endpoints nuevos en el panel
1 endpoint público
Validación Zod funcionando
Auth check funcionando
Stream de prueba transmitiendo
```

## Próximos pasos (Fase 5)

- [ ] UI dashboard: `app/dashboard/streaming/page.tsx` (Status + source switch)
- [ ] UI playlists: `app/dashboard/streaming/playlists/page.tsx` + `[id]`
- [ ] UI library: `app/dashboard/streaming/library/page.tsx` (upload + lista)
- [ ] UI connection: `app/dashboard/streaming/connection/page.tsx` (datos para DJ)
- [ ] Player público embebible: `components/public/StreamingPlayer.tsx`
- [ ] Integrar todo en `lib/menu-items.ts`
