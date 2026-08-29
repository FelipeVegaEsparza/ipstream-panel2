## Context

El panel ya cuenta con un motor de correo vía Resend (`lib/resend.ts`), plantillas editables en DB (`EmailTemplate` con keys `boleta`, `soporte`, `aviso`, `aviso-admin`), historial con rastreo (`EmailLog`), render con variables (`lib/email-templates.ts`) y envíos automáticos aislados de la operación de negocio (`lib/email-hooks.ts`). Hoy, al contratar un plan, se dispara únicamente la boleta/cobro (`sendAccountEmail` con template `boleta`) tanto en el flujo de signup (`lib/signup.ts:87`) como en la asignación por admin (`app/api/admin/clients/assign-plan/route.ts:143`).

Motivación y alcance: ver `proposal.md`. Requisitos de comportamiento: ver `specs/email/spec.md`.

## Goals / Non-Goals

**Goals:**
- Nueva plantilla `bienvenida` editable dentro de la pestaña "Plantillas" de `/admin/comunicaciones`, con envío de prueba y activación, reutilizando el CRUD existente.
- Envío automático del correo de bienvenida al contratar un plan, en ambos flujos (signup y asignación por admin), además de la boleta existente.
- El envío queda registrado en `EmailLog` y nunca interfiere con la contratación del plan.

**Non-Goals:**
- No se crea una pestaña nueva en Comunicaciones; la edición vive dentro de "Plantillas".
- No se modifica el esquema Prisma ni se agregan endpoints nuevos.
- No se cambia el comportamiento del correo de boleta existente.

## Decisions

### 1. Plantilla `bienvenida` reutiliza el modelo y CRUD existentes
Se agrega una plantilla con key `bienvenida` al seed (`scripts/seed-email-templates.js`). El CRUD de plantillas (`/api/admin/emails/templates`) y el envío de prueba (`/api/admin/emails/send`) ya funcionan genéricamente por key, por lo que no requieren cambios.

- **Alternativa considerada:** modelo o tabla dedicada para la bienvenida. Se descarta: duplica infraestructura sin ganancia; las variables, el render, el log y el CRUD ya son genéricos.

### 2. Nueva función `sendWelcomeEmail` en `lib/email-hooks.ts`
Misma forma que `sendAccountEmail`: obtiene el contexto del cliente, renderiza el template `bienvenida` vía `sendTemplateEmail` (que ya omite si la plantilla está desactivada o el cliente no tiene correo) y nunca lanza. Variables usadas: `{{nombre}}`, `{{proyecto}}`, `{{plan}}`, `{{monto}}`, `{{moneda}}`, `{{fecha}}`, `{{link}}` (link al dashboard del cliente).

- **Alternativa considerada:** lógica inline en cada llamador. Se descarta: concentrar en `email-hooks.ts` mantiene el patrón existente de hooks aislados y el mismo estilo de logging/fallback.

### 3. Disparo en ambos flujos de contratación, tras el commit y aislado
- `lib/signup.ts` `createSignupSubscription`: junto al bloque de `sendAccountEmail` (después de persistir suscripción y pago), se llama `sendWelcomeEmail(clientId, plan.name)` dentro del mismo patrón `try/catch`.
- `app/api/admin/clients/assign-plan/route.ts`: junto al bloque de `sendAccountEmail` (después del `$transaction` y de `applyPlanQuotasToClient`), se llama `sendWelcomeEmail(clientId, plan.name)` dentro de `try/catch`.

Como `sendWelcomeEmail` nunca lanza, este disparo no puede romper la operación; el requisito de aislamiento del spec queda cubierto por diseño.

### 4. UI: destacar la plantilla de bienvenida dentro de `EmailTemplatesManager`
Se agrega un ordenamiento o un panel destacado al inicio de la lista de plantillas para la key `bienvenida` (por ejemplo, renderizarla primero con un badge "Al contratar un plan"). La edición, activación y prueba reutilizan el formulario y las acciones existentes del componente; no se modifica la lógica del CRUD.

## Risks / Trade-offs

- **Plantilla faltante tras deploy** → El seed crea `bienvenida` si no existe; si el admin no ejecuta el seed, `sendWelcomeEmail` registra un "skipped" y el plan se contrata igual. Mitigación: ejecutar el seed en el deploy (ya es el flujo habitual para plantillas).
- **Correo duplicado al contratar (boleta + bienvenida)** → Es el comportamiento pedido explícitamente (además de la boleta); se documenta en el spec para evitar confusión.
- **Contenido HTML de la plantilla con variables** → El render escapa los valores salvo `{{link}}` (ya manejado por `lib/email-templates.ts`); sin riesgo nuevo.
