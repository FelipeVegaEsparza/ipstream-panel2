# Streaming — Resultados de Fase 7 (Admin Config)

**Fecha:** 2026-07-16
**Estado:** ✅ Validado
**Tiempo de ejecución:** ~1.5h

## Objetivo

Crear la sección de admin para configurar opciones de streaming por cliente
(storage quota, kill switch, max listeners, etc.).

## Lo que se construyó

### Schema (4 campos nuevos en RadioStream)

| Campo | Tipo | Default | Función |
|---|---|---|---|
| `enabled` | Boolean | `true` | Kill switch: si está en false, el cliente no puede operar |
| `storageQuotaMB` | Int? | `null` | Cuota de AutoDJ library (null = ilimitado) |
| `maxListeners` | Int? | `null` | Cap de oyentes simultáneos (null = ilimitado) |
| `maxTracksPerPlaylist` | Int? | `null` | Límite de tracks por playlist |
| `adminNotes` | String? | `null` | Notas internas del admin |

### API (4 nuevos endpoints)

| Método | Path | Función |
|---|---|---|
| `GET` | `/api/admin/streaming` | Lista todos los clientes con su config + usage |
| `GET` | `/api/admin/streaming/[clientId]` | Detalle: client + radioStream + usage |
| `PATCH` | `/api/admin/streaming/[clientId]` | Editar config (validación Zod, audit) |
| `POST` | `/api/admin/streaming/[clientId]/reveal` | Revelar source/live password (auditado) |

### Helpers (en `lib/streaming-helpers.ts`)

- `getStorageUsage(clientId)` — calcula uso actual y % de quota
- `checkStorageQuota(clientId, fileSize)` — verifica si una subida excedería quota
- `revealLivePassword` / `revealSourcePassword` — con audit log

### Enforcement (en routes del panel)

- **Upload** (`/api/dashboard/streaming/library`): rechaza con 403 si `enabled: false`, con 413 si excede quota
- **Control** (`/api/dashboard/streaming/control`): rechaza con 403 si `enabled: false`

### UI (2 páginas nuevas)

- **`/admin/streaming`** — Lista de clientes con:
  - Stats globales (total, con stream, activos, excedidos, storage total)
  - Filtros: búsqueda + "solo con streaming"
  - Tabla con: nombre, mount, estado, storage (con barra de uso), tracks, oyentes, link a config
  - Badges de color según uso: verde (<80%), amarillo (>80%), rojo (excedido)

- **`/admin/streaming/[clientId]`** — Editor de config:
  - **Status card** con estado actual del stream
  - **Storage usage** con barra visual y MB/GB/restante
  - **Form de config**: enabled, bitrate, storageQuotaMB, maxListeners, maxTracksPerPlaylist, adminNotes
  - **Reveal passwords** (source + live) con audit
  - **Validación**: no se puede bajar la quota por debajo del uso actual
  - **Auditoría**: cada cambio se loguea en `streaming_audit_logs`

### Sidebar

- Agregado item **"Streaming"** entre "Planes y Pagos" y "Tickets de soporte" con icono `RadioIcon`

## Decisiones técnicas

1. **Storage usage en tiempo real** vía query agregado a `tracks` (`SUM(fileSize)`) — no se mantiene cache para evitar drift
2. **Validación Zod** con límites razonables: bitrate 32-320kbps, quota 0-1TB, max listeners 0-100k
3. **No se puede bajar quota** por debajo del uso actual (validado en backend)
4. **Kill switch** verificado en CADA endpoint que muta estado (upload, control, etc.) — no se cachea
5. **Reveal passwords** solo accesible para ADMIN (verificado con `session.user.role`)
6. **Audit log** registra:
   - `admin_config_updated` con los cambios
   - `source_password_revealed` / `live_password_revealed`

## Pruebas realizadas (E2E)

### ✅ Listar clientes (admin)

```bash
$ curl -b admin-cookies /api/admin/streaming
{
  "count": 3,
  "clients": [
    { "clientName": "Test Radio 1", "hasRadioStream": true,
      "usage": { "totalMB": 0.46, "quotaMB": null, "percentUsed": null } },
    { "clientName": "Test Radio New", "hasRadioStream": true,
      "usage": { "totalMB": 0.23, "quotaMB": null } }
  ]
}
```

### ✅ Editar config (PATCH)

```bash
$ curl -X PATCH -b admin-cookies -H "Content-Type: application/json" \
  -d '{"storageQuotaMB":5,"maxListeners":100,"adminNotes":"Cliente de prueba"}' \
  /api/admin/streaming/test_4fe56d37

{ "ok": true, "radioStream": { "storageQuotaMB": 5, "maxListeners": 100, ... } }

# Usage updated
$ curl /api/admin/streaming/test_4fe56d37
{ "usage": { "totalMB": 0.46, "quotaMB": 5, "percentUsed": 9.2 } }
```

### ✅ Enforcement: storage quota

```bash
# Upload de 1 MB (OK, 0.46 + 1 = 1.46 < 5)
$ curl -X POST -F "file=@1mb.mp3" .../library
{ "ok": true, "track": { "fileSize": 960931 } }

# Upload de 4 MB (BLOQUEADO con 413)
$ curl -X POST -F "file=@4mb.mp3" .../library
{
  "error": "quota_exceeded",
  "message": "Subir este archivo excedería la cuota del cliente. Usado: 1.38 MB, cuota: 5 MB, intento: 5.04 MB."
}
HTTP: 413
```

### ✅ Enforcement: kill switch (enabled: false)

```bash
# Deshabilitar
$ curl -X PATCH -d '{"enabled":false}' .../api/admin/streaming/test_4fe56d37
{ "ok": true, "radioStream": { "enabled": false } }

# Cliente intenta subir
$ curl -X POST -F "file=@track.mp3" .../library (como cliente)
{ "error": "streaming_disabled", "message": "Tu streaming fue deshabilitado por el administrador." }
HTTP: 403

# Cliente intenta stop
$ curl -X POST -d '{"action":"stop"}' .../control (como cliente)
{ "error": "streaming_disabled", ... }
HTTP: 403

# Re-habilitar
$ curl -X PATCH -d '{"enabled":true}' .../api/admin/streaming/test_4fe56d37
{ "ok": true }

# Cliente puede subir de nuevo
$ curl -X POST -F "file=@track.mp3" .../library
{ "ok": true, ... }
```

### ✅ Reveal passwords con audit

```bash
$ curl -X POST -d '{"type":"source"}' -b admin .../api/admin/streaming/test_4fe56d37/reveal
{ "password": "3196624346fb8d64", "type": "source" }

# Audit log
SELECT action, JSON_EXTRACT(payload, '$.event') FROM streaming_audit_logs
WHERE action = 'config_update';
# source_password_revealed  2026-07-17 02:26:00
# live_password_revealed    2026-07-17 02:26:00
# admin_config_updated      2026-07-17 02:19:09
```

### ✅ UI pages

- `/admin/streaming` → 200 con stats, filtros, tabla
- `/admin/streaming/test_4fe56d37` → 200 con form de config completo
- Sidebar item "Streaming" con icono `RadioIcon` visible

## Archivos creados

- `app/api/admin/streaming/route.ts` (GET list)
- `app/api/admin/streaming/[clientId]/route.ts` (GET + PATCH)
- `app/api/admin/streaming/[clientId]/reveal/route.ts` (POST)
- `app/admin/streaming/page.tsx` (lista)
- `app/admin/streaming/[clientId]/page.tsx` (config)

## Archivos modificados

- `prisma/schema.prisma` — 5 campos nuevos en RadioStream
- `lib/validations.ts` — `streamingAdminConfigSchema`
- `lib/streaming-helpers.ts` — `getStorageUsage`, `checkStorageQuota`
- `lib/streaming-auth.ts` — agregado `enabled` al context
- `app/api/dashboard/streaming/control/route.ts` — check enabled
- `app/api/dashboard/streaming/library/route.ts` — check enabled + quota
- `components/admin/AdminSidebar.tsx` — item "Streaming" + RadioIcon

## Estado del sistema

**Schema migrado:**
```
radio_streams:
  - enabled           Boolean  default(true)
  - storageQuotaMB    Int?     default(null)
  - maxListeners      Int?     default(null)
  - maxTracksPerPlaylist Int?  default(null)
  - adminNotes        text?    default(null)
```

**5 contenedores healthy, 2 clientes con streaming, 1 con quota de 5 MB, todo enforcement funcionando.**

## Próximos pasos

### Features adicionales para v2
- [ ] **Auto-asignar quota según plan** del cliente (basic/pro/enterprise)
- [ ] **Notificación al admin** cuando un cliente llega al 80% de quota
- [ ] **Stats históricas** de uso de storage
- [ ] **Reset password** desde el admin
- [ ] **Enable/disable features individuales** (AutoDJ, Live DJ, transcoding)
- [ ] **Custom bitrate** por cliente
- [ ] **SSL/dominio personalizado** por radio
- [ ] **Webhooks** cuando se cambia config

### Multi-tenant hardening
- [ ] **Enforcement en el agent** (no solo en el panel) — por si alguien bypasea el panel
- [ ] **Rate limit** por cliente (no exceder N requests/min al agent)
- [ ] **Limites de procesos** (max 1 liquidsoap por cliente, etc.)

### White-label
- [ ] **Custom branding** del dashboard
- [ ] **Multi-tenancy visual** (cada cliente ve solo su radio)
- [ ] **Facturación automática** según uso

## Comandos útiles

```bash
# Login admin
EMAIL="admin@ipstream.com"
COOKIE_JAR=/tmp/admin-cookies.txt
rm -f $COOKIE_JAR
CSRF=$(curl -s -c $COOKIE_JAR http://localhost:3000/api/auth/csrf | jq -r .csrfToken)
curl -s -b $COOKIE_JAR -c $COOKIE_JAR -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF&email=$EMAIL&password=admin123456&callbackUrl=/admin" \
  http://localhost:3000/api/auth/callback/credentials

# Ver todos los clientes con streaming
curl -s -b $COOKIE_JAR http://localhost:3000/api/admin/streaming | jq

# Editar config de un cliente
curl -s -b $COOKIE_JAR -X PATCH -H "Content-Type: application/json" \
  -d '{"storageQuotaMB":500,"enabled":true,"adminNotes":"VIP"}' \
  http://localhost:3000/api/admin/streaming/CLIENT_ID

# Deshabilitar streaming (kill switch)
curl -s -b $COOKIE_JAR -X PATCH -H "Content-Type: application/json" \
  -d '{"enabled":false}' \
  http://localhost:3000/api/admin/streaming/CLIENT_ID

# Revelar password DJ
curl -s -b $COOKIE_JAR -X POST -H "Content-Type: application/json" \
  -d '{"type":"live"}' \
  http://localhost:3000/api/admin/streaming/CLIENT_ID/reveal
```
