# Design

## Context

Ver `proposal.md - Why` y `specs/chat/live/spec.md`. El backend de chat existe, el panel ya modera y la PWA tiene un `ChatSection` sin montar. La API pública devuelve los mensajes más antiguos cuando no recibe cursor y la API del dashboard ignora `since`. El email es obligatorio en el servidor pero opcional en la UI.

## Goals / Non-Goals

**Goals:**

- Chat visible y usable en todo el sitio público.
- Mensajes incrementales sin pérdidas ni retrocesos de cursor.
- Permisos coherentes entre dashboard, PWA y APIs.
- Retención efectiva mediante cron.
- Tests que cubran los flujos corregidos.

**Non-Goals:**

- No se migra a WebSocket ni a tiempo real por push; se mantiene polling.
- No se agregan adjuntos, reacciones ni edición de mensajes.
- No se rediseña el panel de moderación.
- No se toca el agente de streaming.

## Decisions

### `chatEnabled` en los datos públicos

El agregado `GET /api/public/[clientId]` incluirá `chatEnabled` calculado con `isMenuItemEnabled(clientId, 'chat')`. La PWA usará ese flag para mostrar u ocultar sección/widget. Las rutas públicas de chat validarán el mismo permiso y responderán bloqueadas si está deshabilitado.

Alternativa considerada: mostrar el chat siempre. Se descarta porque el admin ya puede deshabilitar ese ítem y el comportamiento actual sería inconsistente.

### Sección en home + widget flotante

- La sección se agrega como `chat` al catálogo de secciones de PWA, con su orden por template y un icono para blue.
- La sección se renderiza desde `ContentSectionStack` solo si `chatEnabled` es verdadero.
- El widget flotante vive en `App.tsx`, fuera de las rutas, para estar disponible en páginas de detalle.
- El widget se oculta en el home cuando la sección ya está montada. La excepción es minimalista, cuyo home no monta el stack de contenido: allí se usa el widget.
- `ChatSection` acepta un modo `embedded` para no repetir el contenedor `<Section>` dentro del widget.

### Contrato de mensajes con `nextCursor` y `hasMore`

Ambas APIs de mensajes (pública y dashboard) devolverán:

- Sin `since`: últimos N mensajes, orden ascendente, `nextCursor` del más reciente y `hasMore=false`.
- Con `since`: mensajes con `createdAt > since`, ascendentes, hasta `limit + 1` para calcular `hasMore`; `nextCursor` del último mensaje devuelto.

El cliente usa `nextCursor` y drena tandas mientras `hasMore` sea verdadero. El dashboard conserva paginación/búsqueda cuando no hay `since`; el camino incremental se activa al recibir cursor.

### Validación de email en PWA

El formulario valida email obligatorio y formato antes del POST. La API mantiene la validación Zod existente. Se persiste el nombre; el email no se persiste.

### Staff y conteo de oyentes

La PWA usa `authorType === 'staff'`. El endpoint de online cuenta solo `authorType === 'listener'`, deduplicando por email cuando exista o por nombre como respaldo. El dashboard aplica el mismo criterio para “oyentes activos”.

### Permisos del dashboard

La página `/dashboard/chat` agregará `MENU_GUARD_INJECTED` con la clave `chat`. Las rutas de mensajes, bans y stats del dashboard comprobarán `isMenuItemEnabled` antes de responder.

### Cron de retención

Se agrega `deploy/scripts/cron-chat.sh`, protegido por `CRON_SECRET`, para invocar `/api/cron/chat/cleanup` cada hora. Se documenta el crontab y se corrige el README: sin `CRON_SECRET`, el endpoint responde error de configuración.

### Tests

- Tests de rutas con Prisma mockeado: últimos N, `since`, `hasMore`, `nextCursor`, bloqueo por menú.
- Tests de `ChatSection`: email obligatorio, staff, cursor y errores.
- Tests de helpers de paginación/online si aplica.

## Risks / Trade-offs

- **Dos instancias del chat en el home** → el widget se oculta en homes con sección; minimalista usa solo el widget.
- **Polling con muchos mensajes** → se drenan tandas con `hasMore` y un máximo de iteraciones por ciclo.
- **Mensajes en el mismo milisegundo** → el cursor usa `createdAt`; el cliente deduplica por id. Es una colisión improbable para el volumen del chat.
- **Permiso cacheado** → `isMenuItemEnabled` usa caché corta; un cambio de permiso puede tardar unos segundos.
- **Cron no instalado en VPS** → se entrega script y documentación; la instalación del crontab sigue siendo una tarea de despliegue.
- **Widget flotante sobre el reproductor** → se posiciona por encima de la barra de reproducción y se adapta a móvil.

## Migration Plan

1. Desplegar panel y PWA.
2. No hay migración de base de datos.
3. Instalar el nuevo cron de chat en el VPS después del deploy.
4. Rollback: revertir el deploy; las APIs mantienen compatibilidad con clientes anteriores por el campo `serverTime` existente.

## Open Questions

Ninguna pendiente.
