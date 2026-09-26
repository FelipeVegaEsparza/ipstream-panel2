# Design

## Context

Ver `proposal.md` — Why. El panel ya tiene un patrón consolidado para contenido por cliente: modelo Prisma con `clientId`, CRUD en `app/api/<recurso>` con `MENU_GUARD_INJECTED`, endpoint público dedicado en `app/api/public/[clientId]/<recurso>` (CORS con `lib/cors.ts`) e inclusión en el payload agregado de `app/api/public/[clientId]/route.ts`. El grupo `Contenido` y los permisos por plan/cliente se resuelven con `lib/menu-items.ts` + `lib/menu-permissions.ts` a partir del `MenuItemKey`.

## Goals / Non-Goals

**Goals:**
- Sección "Barra GC" en el grupo Contenido con CRUD de mensajes (texto, activo, orden).
- API de panel aislada por cliente y con guard de menú `gc-bar`.
- Exposición pública: endpoint dedicado `/api/public/{clientId}/gc-bar` + clave `gcBar` en el payload agregado, devolviendo solo mensajes activos ordenados.
- Reutilizar patrones existentes (announcers/promotions) sin introducir infraestructura nueva.

**Non-Goals:**
- No se modifican las plantillas del sitio público ni el render del cintillo (es responsabilidad del front del sitio que consume la API).
- No se agrega programación por fechas/vigencia, ni texto enriquecido, ni imágenes.
- No se tocan streams ni el agente de streaming.

## Decisions

### 1. Modelo `GcBarMessage` y relación con `Client`
Nuevo modelo Prisma:

```
model GcBarMessage {
  id        String   @id @default(cuid())
  clientId  String
  text      String   @db.Text
  active    Boolean  @default(true)
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
  @@map("gc_bar_messages")
}
```

Se agrega `gcBarMessages GcBarMessage[]` a `Client`. Migración SQL nueva en `prisma/migrations/`. El entrypoint de prod corre `prisma db push`, que crea la tabla.

- **Alternativa considerada:** reutilizar `Promotion` con un flag. Se descarta: la Barra GC es texto plano con orden explícito y activo/inactivo; mezclarla con promociones complica la API y el filtrado.

### 2. Menú y permisos sin lógica nueva
Se agrega `'gc-bar'` a `MenuItemKey` y un `MenuItemDef` en `section: 'Contenido'` (`name: 'Barra GC'`, `href: '/dashboard/gc-bar'`, ícono de barra/megáfono). Con eso, `menu-permissions.ts` ya lo considera para overrides globales, por cliente y por plan (`menuHiddenKeys`).

### 3. CRUD de panel siguiendo el patrón de `announcers`
- `app/api/gc-bar/route.ts`: `GET` (lista del cliente efectivo, orden por `order` asc y `createdAt` asc) y `POST` (crea con `clientId` del cliente efectivo).
- `app/api/gc-bar/[id]/route.ts`: `GET`, `PUT`, `DELETE` filtrando por `clientId` de la sesión para impedir acceso cruzado.
- Ambos con el bloque `MENU_GUARD_INJECTED` para `gc-bar` y `gcBarMessageSchema` de `lib/validations.ts` (`text` requerido, `active` booleano opcional, `order` entero opcional).

### 4. Endpoint público y payload agregado
- `app/api/public/[clientId]/gc-bar/route.ts`: valida que el cliente exista (404 si no), consulta `gcBarMessage.findMany({ where: { clientId, active: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] })` y responde con `createCorsResponse`. `OPTIONS` con `handleCors`.
- En `app/api/public/[clientId]/route.ts` se agrega la consulta al `Promise.all` y la clave `gcBar` en la respuesta.

Filtro `active: true` también en el agregado para no exponer inactivos.

### 5. UI: una sola página con manager en cliente
`app/dashboard/gc-bar/page.tsx` (Server Component) aplica el guard de menú, obtiene los mensajes del cliente y los pasa a `components/dashboard/GcBarManager.tsx` ('use client'), que:
- Lista los mensajes con su texto, orden y estado (badge activo/inactivo).
- Permite crear/editar en un formulario inline (texto, activo, orden), eliminar con confirmación y alternar activo con un switch.
- Llama al CRUD `/api/gc-bar` y hace `router.refresh()` al terminar, con `showToast` para errores.

Se prefiere una sola página con formulario inline (en lugar del patrón multi-página de `announcers`) por ser un recurso de un solo campo; menos navegación y menos archivos.

- **Alternativa considerada:** replicar `new`/`[id]/edit`/`[id]` como announcers. Se descarta por ser sobredimensionado para mensajes de una línea.

### 6. Documentación
Se agrega el endpoint a la lista de `app/dashboard/api-test/page.tsx` y se documenta en `instruccionesapi.md` (tabla de endpoints, payload agregado y ejemplo de respuesta), manteniendo el formato existente.

## Risks / Trade-offs

- **Órdenes duplicados o vacíos**: varios mensajes pueden compartir `order`. Mitigación: desempate por `createdAt` ascendente; el formulario permite definir el número y el listado se muestra estable.
- **Mensajes inactivos**: si un cliente espera verlos igual en el sitio, no aparecerán. Mitigación: documentado en el spec (los inactivos no se exponen).
- **`order` como campo manual**: puede ser poco intuitivo para listas largas. Mitigación: valor por defecto 0 y orden claro; si crece, se puede agregar drag-and-drop en un cambio futuro.
- **Migración en prod**: se aplica con `prisma db push` del entrypoint; al ser una tabla nueva no hay riesgo de pérdida de datos.

## Migration Plan

- Deploy normal de panel (GitHub Actions). El entrypoint corre `prisma db push` y crea `gc_bar_messages`; no requiere "Actualizar nodo" (no toca streaming).
- Rollback: revertir el commit; la tabla puede quedar sin uso sin afectar el resto.

## Open Questions

Ninguna que afecte specs, approach o tasks.
