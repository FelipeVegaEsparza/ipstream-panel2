## 1. Seed de la plantilla de bienvenida

- [x] 1.1 Agregar la plantilla `bienvenida` a `TEMPLATES` en `scripts/seed-email-templates.js` (key `bienvenida`, nombre "Bienvenida / Plan contratado", description con variables `{{nombre}} {{proyecto}} {{plan}} {{monto}} {{moneda}} {{fecha}} {{link}}`, asunto y cuerpo HTML iniciales con estilo consistente con `boleta`).
- [x] 1.2 Ejecutar el seed en el entorno de desarrollo y verificar que la plantilla `bienvenida` se crea en la DB.

## 2. Hook de envío de bienvenida

- [x] 2.1 Agregar `sendWelcomeEmail(clientId: string, planName?: string)` en `lib/email-hooks.ts`, siguiendo el patrón de `sendAccountEmail`: obtiene `getClientEmailContext`, renderiza vía `sendTemplateEmail` con `templateKey: 'bienvenida'` y vars `{ nombre, proyecto, plan, monto, moneda, fecha, link }`, y nunca lanza (try/catch con log).
- [x] 2.2 Verificar que `sendWelcomeEmail` retorna `{ ok, status, logId }` y registra el envío en `EmailLog` (incluye casos skipped si el cliente no tiene correo o la plantilla está desactivada).

## 3. Disparo automático en los flujos de contratación

- [x] 3.1 En `lib/signup.ts` `createSignupSubscription`, junto al bloque existente de `sendAccountEmail` (tras persistir suscripción/pago y aplicar cuotas), llamar `sendWelcomeEmail(clientId, plan.name)` dentro de un `try/catch`.
- [x] 3.2 En `app/api/admin/clients/assign-plan/route.ts`, junto al bloque existente de `sendAccountEmail` (tras el `$transaction` y `applyPlanQuotasToClient`), llamar `sendWelcomeEmail(clientId, plan.name)` dentro de un `try/catch`.

## 4. UI: sección de bienvenida en Plantillas

- [x] 4.1 En `components/admin/EmailTemplatesManager.tsx`, destacar la plantilla con key `bienvenida` (por ejemplo, mostrarla primero con un badge como "Al contratar un plan"), manteniendo el formulario y acciones existentes (editar, activar, probar, guardar).
- [x] 4.2 Verificar en `/admin/comunicaciones` (pestaña "Plantillas") que la plantilla `bienvenida` aparece destacada, se puede editar/guardar, activar/desactivar y probar sin errores.

## 5. Verificación final

- [x] 5.1 Verificar que al asignar un plan a un cliente el correo de bienvenida se envía además de la boleta, y que si falla o está desactivado el plan se contrata igual.
- [x] 5.2 Ejecutar lint/build (`npm run build` o `npm run lint`) sin errores y revisar `openspec validate` del cambio.
