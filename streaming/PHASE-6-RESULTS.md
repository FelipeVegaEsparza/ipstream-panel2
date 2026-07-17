# Streaming — Resultados de Fase 6 (final)

**Fecha:** 2026-07-16
**Estado:** ✅ Validado
**Tiempo de ejecución:** ~1.5h

## Objetivo

Pulir el módulo de streaming, dejarlo production-ready y completar
features que faltaban: auto-crear RadioStream, revelar passwords DJ
de forma segura, mejorar UX con toasts, actualizar documentación.

## Lo que se hizo

### Cambios en el panel

| Archivo | Cambio |
|---|---|
| `lib/streaming-helpers.ts` | **NUEVO**: `createRadioStreamForClient`, `revealLivePassword`, `revealSourcePassword` con audit |
| `app/api/auth/register/route.ts` | Auto-crea `RadioStream` al registrar un nuevo cliente |
| `app/api/dashboard/streaming/connection/route.ts` | **NUEVO**: GET datos de conexión + POST reveal password (auditado) |
| `lib/useStreamingStatus.ts` | Cleanup: solo polling (removida referencia a WS inexistente) |
| `components/dashboard/streaming/StreamControls.tsx` | `alert()` → `toast()` |
| `components/dashboard/streaming/LibraryUploader.tsx` | `alert()` → `toast()` |
| `README.md` | Sección completa de streaming con arquitectura, endpoints, links a PHASE-*.md |

### Cancelado: WebSocket proxy

Next.js 14 no soporta WebSockets nativos en route handlers. La alternativa
sería un servidor custom (Node + ws lib). Decidimos seguir con polling
(5s) que es suficiente para v1.

Si en el futuro queremos WS:
- Exponer el agent vía Nginx con `proxy_pass` para WS
- O migrar a Next.js custom server
- O usar Server-Sent Events (SSE) que SÍ soporta Next.js

## Pruebas realizadas (E2E final)

### ✅ Auto-crear RadioStream al registrarse

```bash
$ curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Test Radio New","email":"newclient...@test.ipstream","password":"test123456"}' \
  http://localhost:3000/api/auth/register

{
  "message": "Usuario creado exitosamente",
  "user": { "role": "CLIENT", ... },
  "stream": {
    "icecastMount": "radio_b2e26df392af",
    "telnetPort": 12340
  }
}

# DB check
$ mysql -e "SELECT rs.id, rs.icecastMount, c.name FROM radio_streams rs JOIN clients c ON c.id=rs.clientId WHERE c.name='Test Radio New';"
cmroaaoo2000312e16e2vtzf3  radio_b2e26df392af  Test Radio New
```

### ✅ Ciclo E2E completo del nuevo cliente

```
1. Register (auto-crea RadioStream)
2. Login
3. Subir MP3
4. Crear playlist
5. Agregar track
6. Activar playlist
7. Iniciar stream
8. Verificar Icecast
9. Endpoint público
```

Resultado final:
```json
{
  "clientId": "cmroaaon1000112e1vmemc09g",
  "clientName": "Test Radio New",
  "mount": "radio_b2e26df392af",
  "bitrate": 128,
  "isLive": true,
  "streamUrls": { "http": "http://localhost:8000/radio_b2e26df392af" }
}
```

### ✅ Multi-tenant: 2 streams simultáneos

```
PID=2831  test_b31024e8.liq          (Test Radio 1)
PID=3234  radio_b2e26df392af.liq    (Test Radio New)
PID=6     test-playlist.liq         (test de Fase 0)
```

### ✅ Reveal DJ password con audit

```bash
$ curl -X POST -b cookies.txt -H "Content-Type: application/json" \
  -d '{"revealPassword":"live"}' \
  http://localhost:3000/api/dashboard/streaming/connection
{ "password": "3f16ec147ac8eb3430bf1854" }

# Audit log
$ mysql -e "SELECT action, JSON_EXTRACT(payload, '$.event') FROM streaming_audit_logs WHERE action='config_update';"
config_update  "live_password_revealed"
```

### ✅ Toasts en lugar de alerts

- `StreamControls`: success/error via `useToast()`
- `LibraryUploader`: success/error/info via `useToast()`

## Estado final del sistema

### Servicios

```
NAME                       STATUS
ipstream-db                Up (healthy)
ipstream-app               Up (healthy)
ipstream-icecast           Up (healthy)
ipstream-liquidsoap        Up
ipstream-streaming-agent   Up (healthy)
```

### Modelos Prisma de streaming

5 modelos: `RadioStream`, `Track`, `Playlist`, `PlaylistEntry`, `StreamingAuditLog`

### Endpoints

**Agent (15):**
- 5 streams (start/stop/restart/status/list)
- 5 library (list/upload/get/update/delete)
- 9 playlists (list/get/create/update/delete/activate/add-track/remove-track/reorder)
- 1 icecast (status)
- 1 WebSocket (live updates)
- 1 health

**Panel dashboard (15):**
- 1 status, 1 control, 1 connection
- 4 library (list, upload, update, delete)
- 6 playlists (list, create, get, update, delete, activate, add-track, remove-track, reorder)
- 1 register (auto-create RadioStream)

**Panel público (1):**
- 1 status (now-playing, listeners, streamUrls)

### Páginas UI (5)

- `/dashboard/streaming` — Vista principal
- `/dashboard/streaming/library` — Drag&drop upload + lista
- `/dashboard/streaming/playlists` — Lista de playlists
- `/dashboard/streaming/playlists/[id]` — Editor con drag&drop
- `/dashboard/streaming/connection` — Datos para DJ

### Componentes (4)

- `StreamingStatusCard` (status en vivo)
- `StreamControls` (start/stop/restart)
- `LibraryUploader` (drag&drop)
- `StreamingPlayer` (público embebible)

## Resumen de las 7 fases

| Fase | Contenido | Tiempo | Estado |
|---|---|---|---|
| **0** | Setup base: Icecast + liquidsoap en Docker, validar flujo de audio | ~2h | ✅ |
| **1** | Schema Prisma (5 modelos) + streaming-agent bootstrap | ~1.5h | ✅ |
| **2** | Gestión de procesos: start/stop/restart + WebSocket + script generation | ~2h | ✅ |
| **3** | Library CRUD (upload, ID3) + Playlists CRUD + entries + reorder | ~1.5h | ✅ |
| **4** | Cliente HTTP + API dashboard (15 endpoints) + API pública | ~1h | ✅ |
| **5** | UI completa (5 páginas) + player público embebible | ~1.5h | ✅ |
| **6** | Polish: auto-create RadioStream, reveal passwords, toasts, docs | ~1.5h | ✅ |
| **TOTAL** | | **~11h** | ✅ |

## Capacidades finales

Para cualquier cliente del panel:

1. **Se registra** → RadioStream se crea automáticamente
2. **Entra a `/dashboard/streaming`** → ve su radio en vivo con oyentes
3. **Sube MP3s** vía drag&drop → lee ID3, edita metadata
4. **Crea playlists** → activa una
5. **Inicia el AutoDJ** → su radio transmite
6. **Pasa el URL del stream a DJs** → ellos se conectan con BUTT/MIXXX
7. **Embeber el player en su sitio** → `<StreamingPlayer clientId="..." />`

Todo multi-tenant, auditado, con passwords encriptados.

## Lo que falta para producción

### High priority
- [ ] **HTTPS con cert válido** (Icecast + Agent)
- [ ] **Reverse proxy** (Nginx) para WS en producción
- [ ] **Limites de recursos** (CPU/mem per client, via systemd o cgroups)
- [ ] **Backup** del filesystem `/var/lib/radio/<clientId>/mp3/`
- [ ] **Migración** de clientes existentes en SonicPanel (script de import)

### Medium
- [ ] **WebSocket proxy** real (SSE sería más simple en Next.js)
- [ ] **Transcoding multi-bitrate** (64k + 128k + 192k)
- [ ] **Scheduling** con timezone
- [ ] **DJ accounts** con login propio
- [ ] **Estadísticas** históricas (Icecast access log → DB)

### Low
- [ ] **GeoIP** / mapa de oyentes
- [ ] **On-air features**: jingles, TTS, mic con fade
- [ ] **App móvil nativa**
- [ ] **Auto-SSL** vía Let's Encrypt
- [ ] **White-label** (multi-tenant visual)

## Comandos de referencia

```bash
# Levantar todo
docker compose up -d --build

# Ver estado de los 5 contenedores
docker compose ps

# Login como admin
# email: admin@ipstream.com / password: admin123456

# Ver estado del stream
curl -s http://localhost:8000/status-json.xsl | jq

# Ver health de cada servicio
curl -s http://localhost:3000/api/health
curl -s http://localhost:4000/health
curl -s http://localhost:8000/status-json.xsl

# Acceder al container de liquidsoap
docker exec -it ipstream-liquidsoap bash
ls /var/lib/radio/
ls /etc/liquidsoap/scripts/

# Crear un nuevo cliente (auto-crea RadioStream)
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Mi Radio","email":"yo@ejemplo.com","password":"pass123"}' \
  http://localhost:3000/api/auth/register

# Ver logs
docker compose logs -f agent      # sidecar
docker compose logs -f icecast    # servidor de streaming
docker compose logs -f liquidsoap # AutoDJ
```
