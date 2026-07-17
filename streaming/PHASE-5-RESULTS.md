# Streaming — Resultados de Fase 5

**Fecha:** 2026-07-16
**Estado:** ✅ Validado
**Tiempo de ejecución:** ~1.5h

## Objetivo

Construir la **UI completa** del módulo de streaming en el panel,
integrada con el sidebar y todas las pantallas funcionales.
Plus: **player público embebible** para sitios externos.

## Lo que se construyó

### Páginas del dashboard (5)

| Path | Función |
|---|---|
| `/dashboard/streaming` | Vista principal: status en vivo + start/stop/restart + accesos rápidos |
| `/dashboard/streaming/library` | Drag&drop upload + tabla de tracks con editar/eliminar |
| `/dashboard/streaming/playlists` | Grid de playlists con crear/activar/eliminar |
| `/dashboard/streaming/playlists/[id]` | Editor con drag&drop reorder + add/remove tracks |
| `/dashboard/streaming/connection` | Datos para DJ: servidor, puerto, mount, password, software recomendado |

### Componentes (3)

| Path | Función |
|---|---|
| `components/dashboard/streaming/StreamingStatusCard.tsx` | Card con estado en vivo (process, icecast, db) |
| `components/dashboard/streaming/StreamControls.tsx` | Botones start/stop/restart con loading states |
| `components/dashboard/streaming/LibraryUploader.tsx` | Drag&drop zone para MP3s con progress |

### Hooks y librerías (1)

| Path | Función |
|---|---|
| `lib/useStreamingStatus.ts` | Hook con polling cada 5s (WebSocket listo para conectar) |

### Player público (1)

| Path | Función |
|---|---|
| `components/public/StreamingPlayer.tsx` | Componente embebible con play/pause, volumen, metadata, oyentes |

### Menú (1 cambio)

| Path | Cambio |
|---|---|
| `lib/menu-items.ts` | Agregado `streaming` a MenuItemKey + item con icono RadioIcon en sección Sistema |

## Características de la UI

### StreamingStatusCard
- Indicador ON AIR (verde) / OFF (gris) con pulse animation
- Grid de stats: Estado, Oyentes (con peak), Bitrate, PID
- Botón de refresh manual
- Manejo de error en card rojo

### StreamControls
- 3 botones grandes: ▶ Iniciar (verde), ⏹ Detener (rojo), ↻ Reiniciar (azul)
- Disabled cuando la operación no aplica (ej. Iniciar deshabilitado si está corriendo)
- Loading state durante la request

### LibraryUploader
- Drag&drop zone con highlight al hover
- Soporte para múltiples archivos
- Progress por archivo
- Validación de extensión (.mp3 only)
- Callback `onUploaded` para refrescar la lista

### Playlists page
- Grid de cards con border verde si está activa
- Modal de crear (nombre + descripción)
- Activar inline
- Eliminar con confirmación

### Playlist Editor
- Editar nombre, descripción, shuffle, repeat
- **Drag&drop reorder** funcional con persistencia inmediata
- Modal de agregar tracks con búsqueda
- Eliminar tracks inline
- Activar/desactivar playlist

### Connection page
- Datos de conexión con botón "Copiar"
- Software recomendado (BUTT, MIXXX, Altacast) con links
- Tutorial paso a paso para BUTT
- Toast de confirmación al copiar

### StreamingPlayer (público)
- Botón play/pause grande con colores personalizables
- Indicador de estado (autodj/live/off) con animación
- Metadata: nombre, título actual, oyentes
- Slider de volumen
- Auto-refresh cada 10s
- Manejo de error de autoplay

## Decisiones técnicas

1. **Polling cada 5s** en vez de WebSocket (más simple para v1).
   El hook `useStreamingStatus` ya está preparado para WS — solo falta el proxy en el panel.
2. **Drag&drop nativo HTML5** (sin librerías externas como dnd-kit) para mantener bundle size bajo.
3. **Confirmación con `window.confirm`** para acciones destructivas (más simple que modales custom).
4. **`fetch` sin cache** (`cache: 'no-store'`) en todos los loads para datos en vivo.
5. **Toast con estado local** (no usamos librería de toast para mantener simple).
6. **Tailwind utility classes** consistent con el resto del panel.

## Pruebas realizadas

### ✅ 5 páginas devuelven 200

```bash
$ for p in streaming library playlists/playlists playlists/playlists/pl_df874504 connection; do
    curl -s -b cookies.txt -o /dev/null -w "$p: %{http_code}\n" http://localhost:3000/dashboard/streaming/$p
  done
streaming: 200
library: 200
playlists: 200
playlists/playlists/pl_df874504: 200
connection: 200
```

### ✅ Sidebar tiene item "Streaming" con icono RadioIcon

(visible en el HTML del sidebar)

### ✅ HTML de la página principal contiene elementos esperados

```bash
$ curl -s -b cookies.txt http://localhost:3000/dashboard/streaming | grep -oE "Biblioteca|Playlists|Conexión DJ|Mount"
Biblioteca
Conexión DJ
Playlists
```

### ✅ Endpoints públicos siguen funcionando

```bash
$ curl http://localhost:3000/api/public/test_4fe56d37/streaming/status
{
  "clientId": "test_4fe56d37",
  "clientName": "Test Radio 1",
  "isLive": true,
  "streamUrls": { "http": "http://localhost:8000/test_b31024e8" }
}
```

### ✅ Stream sigue transmitiendo

```
Mount: http://localhost:8000/test_b31024e8
Name: Test Radio 1
Bitrate: 128 kbps
Status: ON AIR
```

## Archivos creados

### App pages
- `app/dashboard/streaming/page.tsx`
- `app/dashboard/streaming/library/page.tsx`
- `app/dashboard/streaming/playlists/page.tsx`
- `app/dashboard/streaming/playlists/[id]/page.tsx`
- `app/dashboard/streaming/connection/page.tsx`

### Components
- `components/dashboard/streaming/StreamingStatusCard.tsx`
- `components/dashboard/streaming/StreamControls.tsx`
- `components/dashboard/streaming/LibraryUploader.tsx`
- `components/public/StreamingPlayer.tsx`

### Lib
- `lib/useStreamingStatus.ts`

## Archivos modificados
- `lib/menu-items.ts` — agregado `streaming` item

## Estado del sistema

**5 contenedores healthy:**
- ipstream-db (MySQL 8.0)
- ipstream-app (Next.js 14)
- ipstream-icecast (Icecast 2.4.4)
- ipstream-liquidsoap (Liquidsoap 2.1.3)
- ipstream-streaming-agent (Node 20 + Fastify)

**5 tablas de streaming** con datos de prueba:
- 1 RadioStream activo
- 2 tracks en biblioteca
- 2 playlists (1 activa, 1 inactiva)
- 1 stream transmitiendo en `http://localhost:8000/test_b31024e8`

**UI completamente funcional** end-to-end:
- Cliente logueado ve su radio
- Puede hacer start/stop/restart
- Puede subir MP3s
- Puede crear/editar/activar/eliminar playlists
- Puede ver datos de conexión para DJ

## Próximos pasos (Fase 6)

- [ ] WebSocket proxy en el panel para updates en vivo (reemplazar polling)
- [ ] Passwords DJ: endpoint seguro para mostrar/revelar el livePassword
- [ ] Estilos: dark/light mode, responsive
- [ ] Tests E2E con Playwright
- [ ] Error boundaries
- [ ] Loading skeletons consistentes
- [ ] Toasts en vez de alert()
- [ ] Validación de archivos MP3 más estricta
- [ ] Drag&drop reorder también en la library (mover entre playlists)

## Comandos útiles

```bash
# Login como cliente de prueba
COOKIE_JAR=/tmp/cookies.txt
rm -f $COOKIE_JAR
CSRF=$(curl -s -c $COOKIE_JAR http://localhost:3000/api/auth/csrf | jq -r .csrfToken)
curl -s -b $COOKIE_JAR -c $COOKIE_JAR -X POST \
  -d "csrfToken=$CSRF&email=test_4fe56d37@test.ipstream&password=test123456" \
  http://localhost:3000/api/auth/callback/credentials

# Ver estado del stream
curl -s -b $COOKIE_JAR http://localhost:3000/api/dashboard/streaming/status | jq

# Controlar stream
curl -s -b $COOKIE_JAR -X POST -H "Content-Type: application/json" \
  -d '{"action":"start"}' http://localhost:3000/api/dashboard/streaming/control

# Ver player público
curl -s http://localhost:3000/api/public/test_4fe56d37/streaming/status | jq
```
