## Context

See proposal.md — Why. La PWA pública de cada cliente va a ofrecer un formulario de contacto; hoy no existe recepción ni bandeja. El panel ya tiene patrones consolidados para "contenido generado por visitantes" con multi-tenant estricto:

- **API pública** (`app/api/public/[clientId]/...`): rutas sin auth con CORS (`lib/cors.ts`), verificación del cliente, captura de IP vía `x-forwarded-for`/`x-real-ip` y rate limit en memoria (`lib/rate-limit.ts`). Ejemplo directo: `polls/[id]/vote/route.ts`.
- **API dashboard** (`app/api/dashboard/...`): `getServerSession(authOptions)` + `getEffectiveClient()` y toda query filtrada por `effective.clientId`; paginación `{ messages, pagination }` y 404 por `findFirst({ where: { id, clientId } })`. Ejemplo directo: `chat/messages` (GET + `[id]` DELETE).
- **Persistencia** (Prisma): IDs string `cuid()`, tablas en snake_case vía `@@map`, estados como `String` con valores documentados en comentario (p. ej. `SupportTicket.status`), cascade delete desde `Client`, e índice `@@index([clientId, createdAt])` (ver `ChatMessage`).
- **Validación** en `lib/validations.ts` (zod), **sanitización** de texto de visitantes con `lib/text-sanitizer.ts` (ver chat).

Los requerimientos concretos a satisfacer están en las specs del cambio: `specs/public-api/contact-messages/spec.md` y `specs/dashboard/contact-messages/spec.md`.

## Goals / Non-Goals

**Goals:**
- Persistir consultas de contacto multi-tenant con el modelo `ContactMessage` y exponerlas de forma segura (validación, sanitización y rate limit por IP).
- Bandeja de panel con listado, cambio de estado y borrado, reutilizando los patrones existentes de chat/`getEffectiveClient`.
- Documentar el endpoint público en `instruccionesapi.md` y `/dashboard/api-test`.

**Non-Goals:**
- No hay envío de notificaciones al operador (email/push) ante una consulta nueva.
- No hay respuesta automática al visitante ni hilo de conversación (es una consulta unidireccional).
- No hay bandeja global multi-cliente para el admin: cada sesión ve solo su cliente efectivo.
- No se toca `streaming/agent/*` ni librerías del agente.

## Decisions

### 1. Modelo Prisma `ContactMessage`
Se agrega el modelo con la relación inversa en `Client` (`contactMessages ContactMessage[]`) y una migración:

```prisma
model ContactMessage {
  id        String   @id @default(cuid())
  clientId  String
  name      String   @db.VarChar(120)
  email     String   @db.VarChar(254)
  phone     String   @db.VarChar(40)
  message   String   @db.Text
  status    String   @default("new") // "new" | "read" | "resolved"
  ip        String?  @db.VarChar(45)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId, createdAt])
  @@map("contact_messages")
}
```

- Se usan `VarChar` acotados y `Text` para el mensaje (igual que `ChatMessage`/`SupportTicket`). El formulario de contacto recoge solo `name`, `email`, `phone` y `message`, por lo que no hay campo de asunto y los cuatro son obligatorios (columna `phone` no nullable).
- `status` es `String` con valores documentados en comentario, siguiendo la convención del repo (`SupportTicket.status`), sin enums de Prisma.
- Índice compuesto `[clientId, createdAt]` para el listado del dashboard; el `onDelete: Cascade` replica al resto de modelos de cliente.
- **Alternativa descartada**: guardar `status` como enum Prisma — el repo no usa enums de BD para estados, rompería la convención.

### 2. Validación y sanitización compartidas
En `lib/validations.ts` se agrega un schema zod `contactMessageSchema` con `name` (trim, requerido, ≤120), `email` (trim, formato email, ≤254), `phone` (trim, requerido, ≤40) y `message` (trim, requerido, ≤2000). Un segundo schema `contactMessageStatusSchema = z.enum(['new', 'read', 'resolved'])` valida el PATCH del panel.

Además, en el POST público se aplica `sanitizeText` (de `lib/text-sanitizer.ts`, misma utilidad del chat) sobre `name` y `message` antes de persistir, para no guardar HTML/scripts de un visitante.
- **Alternativa descartada**: schema separado por endpoint — un único schema público evita divergencia y el del estado es trivial.

### 3. Endpoint público POST
Ruta `app/api/public/[clientId]/contact-messages/route.ts` (solo `OPTIONS` + `POST`, sin `dynamic` especial ya que siempre es dinámico). Flujo, reutilizando `lib/cors.ts` y `lib/rate-limit.ts`:

1. `handleCors()` para `OPTIONS`.
2. En `POST`: extraer IP (patrón de `poll vote`: `x-forwarded-for` primer valor → `x-real-ip` → `'unknown'`).
3. `rateLimit({ maxRequests: 5, windowMs: 10 * 60 * 1000, identifier: \`contact-message:${ip}\` })` → si no `allowed`, `429`.
4. Parsear body con `contactMessageSchema` → si falla, `400` con el primer mensaje de error.
5. Verificar que el `clientId` exista (`prisma.client.findUnique`) → `404` si no.
6. Sanitizar y crear con `status` por defecto `new` e `ip`.
7. Responder `201` con **solo** `{ id, status: "new", createdAt }` en ISO 8601 (`createdAt.toISOString()`).

El rate limit es por IP y global al panel (no por cliente): el requisito pide "5 mensajes / 10 min por IP"; al ser el formulario público de cada cliente, un mismo IP no debe poder saturar clientes distintos con la misma ventana.
- **Alternativa descartada**: rate limit en el agente o Redis — el repo ya limita en memoria en el panel; es suficiente para el volumen.

### 4. Endpoints del dashboard
- `app/api/dashboard/contact-messages/route.ts` → `GET`: `getServerSession` (401) → `getEffectiveClient` (401) → paginación `page`/`limit` (con tope, igual que chat) y filtro opcional `status` → `where = { clientId: effective.clientId, ...(status válido ? { status } : {}) }`, `orderBy: { createdAt: 'desc' }` → responde `{ messages, pagination }`. Cada mensaje serializado incluye `id`, `name`, `email`, `phone`, `message`, `status`, `ip`, `createdAt` (ISO) para que el operador pueda responder con esos datos.
- `app/api/dashboard/contact-messages/[id]/route.ts` → `PATCH` (body `{ status }` validado con `contactMessageStatusSchema` → `400`) y `DELETE`. Ambos hacen `findFirst({ where: { id: params.id, clientId: effective.clientId } })` → `404` si no existe o es de otro cliente; luego `update`/`delete`.
- `app/api/dashboard/contact-messages/unread-count/route.ts` → `GET`: misma autenticación y aislamiento, hace `count({ where: { clientId: effective.clientId, status: 'new' } })` y responde `{ count }`.

El aislamiento por cliente no depende de ningún parámetro de la URL: siempre se usa `effective.clientId` (patrón de `chat/messages/[id]`). El `?clientId=` del contrato es solo la referencia del cliente efectivo que el panel ya conoce por sesión/impersonación.

### 5. UI "Mensajes de contacto"
- Página `app/dashboard/contact-messages/page.tsx` (client component): tabla/lista de mensajes con estado destacado (badge `new|read|resolved`), orden descendente, paginación y filtro por estado. Cada fila se expande para mostrar `message` y los datos de contacto `email` (con enlace `mailto:`), `phone` e `ip`.
- Acciones por mensaje: cambiar estado (`new`/`read`/`resolved`) y eliminar con confirmación, llamando a los endpoints del dashboard.
- Alta en `lib/menu-items.ts`: nueva key `'contact-messages'` en el union `MenuItemKey`, item `name: 'Mensajes de contacto'`, `href: '/dashboard/contact-messages'`, `section: 'Interactivos'` (donde ya viven chat/soporte) con icono de sobre (`EnvelopeIcon` de `@heroicons/react/24/outline`).
- Badge de pendientes: el sidebar (`components/dashboard/Sidebar.tsx`, client component) consulta `GET /api/dashboard/contact-messages/unread-count` y muestra el contador junto al ítem "Mensajes de contacto" cuando `count > 0`. No existe infraestructura de badges en el menú hoy, por lo que el contador se agrega puntualmente para este ítem; al marcar un mensaje como `read`/`resolved` el contador baja en la siguiente consulta. Si el fetch falla (401/sin sesión), no se muestra el badge para no romper el menú.

### 6. Docs
- `instruccionesapi.md`: fila nueva en el índice de endpoints y una sección para `POST /api/public/{clientId}/contact-messages` con el body, la respuesta `201` y los errores `400`/`404`/`429`, en el mismo formato de las secciones existentes.
- `/dashboard/api-test` (`app/dashboard/api-test/page.tsx`): entrada nueva para probar el envío, siguiendo el patrón de los POST existentes (p. ej. `POST /polls/{id}/vote`).

## Risks / Trade-offs

- **Rate limit en memoria** → [Riesgo] se pierde con reinicios y no escala horizontal. Mitigación: volumen esperado bajo y patrón ya usado por votos/chat; si un cliente crece se migra a Redis sin cambiar el contrato.
- **Sin confirmación/notificación al visitante ni al operador** → [Riesgo] el emisor no sabe si llegó; el operador debe entrar a ver la bandeja. Mitigación: aceptado explícitamente como Non-Goal; el estado `new` queda visible en la bandeja.
- **Spam por volumen desde IPs distribuidas** → [Riesgo] el rate limit por IP no frena botnets. Mitigación: validación estricta + sanitización; fuera de alcance un CAPTCHA (se puede añadir después sin tocar el contrato).
- **Deploy** → [Riesgo] toca el panel y la BD (migración). Mitigación: aplicar la migración en el VPS y desplegar por el flujo habitual (GitHub Actions); no requiere "Actualizar nodo" porque no toca `streaming/agent/*`.

## Migration Plan

1. Editar `prisma/schema.prisma` (modelo + relación en `Client`) y crear migración (`npm run db:migrate -- --name add_contact_messages` en local).
2. Aplicar la migración a la BD de producción (VPS) por SSH antes o junto con el deploy.
3. Implementar rutas, UI y docs; desplegar con el flujo habitual (commit + push a `main` → GitHub Actions).
4. Verificar con curl: `201` en POST válido, `400` con email inválido o sin `phone`, `429` al superar 5 en 10 min, contador de pendientes en el panel, y listado/patch/delete con dos clientes distintos para confirmar aislamiento.

## Open Questions

- Ninguna: los límites concretos, el alcance sin notificaciones y la resolución del cliente por sesión quedaron fijados en la propuesta y en las specs.
