## Why

Hoy, al contratar un plan, el cliente recibe automáticamente la boleta/cobro (template `boleta`), pero no hay un correo de bienvenida dedicado que le confirme el alta del servicio, sus datos de acceso y cómo empezar. El admin no tiene dónde redactar ese mensaje: el correo de bienvenida no existe como plantilla editable.

## What Changes

- **Nueva plantilla de correo `bienvenida`**: editable desde el admin (asunto + cuerpo HTML con variables `{{nombre}}`, `{{proyecto}}`, `{{plan}}`, `{{link}}`, `{{monto}}`, `{{moneda}}`, `{{fecha}}`), activable/desactivable y con envío de prueba, igual que el resto de plantillas.
- **Sección dedicada dentro de "Plantillas"** en `/admin/comunicaciones`: destaca la plantilla de bienvenida para redactarla y guardarla fácilmente, sin crear flujos de UI nuevos.
- **Envío automático al contratar un plan**: el correo de bienvenida se envía al cliente cuando contrata un plan, tanto al registrarse/suscribirse por su cuenta (flujo de signup) como cuando el admin le asigna un plan. Se envía **además** de la boleta/cobro existente, no la reemplaza.
- **Seed**: la plantilla `bienvenida` se crea en `scripts/seed-email-templates.js` con un contenido inicial.
- **Aislamiento de fallos**: si el envío falla o la plantilla está desactivada, la contratación del plan NO se ve afectada; el envío queda registrado en el historial (`EmailLog`) como fallido/omitido, igual que el resto de envíos automáticos.

## Capabilities

### New Capabilities

- Ninguna: el comportamiento nuevo extiende la capacidad de correo existente.

### Modified Capabilities

- `email`: se agrega una plantilla de bienvenida editable y su envío automático al contratar un plan (signup y asignación por admin), además de la boleta/cobro existente.

## Impact

- **Prisma**: no hay cambios de esquema. La plantilla usa el modelo `EmailTemplate` existente con la key `bienvenida`.
- **Libs**: en `lib/email-hooks.ts` se agrega `sendWelcomeEmail(clientId, plan)` que renderiza y envía la plantilla `bienvenida`; en `lib/resend.ts` y `lib/email-templates.ts` no se requiere cambio (se reutilizan).
- **Flujos de contratación**: en `lib/signup.ts` (`createSignupSubscription`) y en `app/api/admin/clients/assign-plan/route.ts` se dispara el correo de bienvenida tras el commit de la operación, en paralelo al aviso de boleta actual.
- **Seed**: `scripts/seed-email-templates.js` agrega la plantilla `bienvenida`.
- **UI**: en `components/admin/EmailTemplatesManager.tsx` se agrega la edición/destacado de la plantilla `bienvenida` dentro de Plantillas.
- **Endpoints**: no se requieren endpoints nuevos; se reutiliza el CRUD de plantillas (`/api/admin/emails/templates`) y el envío de prueba (`/api/admin/emails/send`) existentes.
- **Config**: sin cambios de configuración ni variables de entorno.
