## Why

El panel hoy se comunica con los clientes por push (OneSignal), WhatsApp (manual) y tickets internos, pero **no tiene ningún canal de correo**: las boletas son PDF descargables que el cliente debe ir a buscar, y los avisos de soporte/cobro dependen de la acción manual del admin. Un canal de email formal (vía Resend) es el paso natural para un servicio de pago: boletas de cobro que llegan solas, avisos de soporte y comunicaciones generales desde el admin.

## What Changes

- **Motor de email con Resend**: wrapper `lib/resend.ts` que envía correos transaccionales con plantillas HTML, adjuntos (boleta PDF en base64) y variables por tipo. Requiere `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y el dominio verificado en Resend (DKIM/SPF).
- **Nuevo modelo `EmailTemplate`**: plantillas editables desde el admin (subject + HTML con variables `{{nombre}}`, `{{plan}}`, `{{monto}}`, `{{fecha}}`, `{{link}}`), con key único (`boleta`, `soporte`, `aviso`, `general`), activación y seed inicial.
- **Nuevo modelo `EmailLog`**: historial de envíos con estado y rastreo (sent/delivered/bounced/opened/clicked/failed), `resendId`, `openedAt`/`clickedAt` y filtros por cliente.
- **Rastreo vía webhook**: endpoint `/api/webhooks/resend` (firma HMAC verificada) que actualiza el estado de cada `EmailLog`.
- **Boletas automáticas** (ambos sentidos, tras el commit de la transacción de pagos):
  - Al **generarse la cuota pendiente** → aviso de cobro (template `boleta`).
  - Al **confirmarse un pago** (status → completed) → boleta/recibo con **PDF adjunto** (reutiliza la generación de `account-pdf`).
- **Aviso de soporte**: al responder un ticket desde el admin → notificación por correo al cliente con la respuesta (template `soporte`).
- **Comunicaciones generales**: compositor en el admin (1 cliente, varios o todos) con plantilla o texto libre y adjunto opcional; envío secuencial con log por destinatario.
- **UI admin**: sección nueva **"Comunicaciones"** (compositor + editor de plantillas + historial con rastreo) y botones contextuales: "Enviar boleta" en Billing y "Avisar por correo" al responder tickets.

## Capabilities

### New Capabilities

- `email`: envío de correos a clientes vía Resend — plantillas editables, composición (1/varios/todos), adjuntos (boleta PDF), envío automático de boletas/avisos de soporte ligado a pagos y tickets, historial con rastreo (entregado/abierto/clic) y webhook de estado.

### Modified Capabilities

- Ninguna: no existe spec previa de facturación ni de soporte; el comportamiento nuevo de pagos/tickets queda dentro de la capacidad `email`.

## Impact

- **Esquema Prisma**: `EmailTemplate` y `EmailLog` (+ índices). Seed de plantillas iniciales.
- **Libs nuevas**: `lib/resend.ts` (envío + log), `lib/email-templates.ts` (render con variables), `lib/account-pdf.ts` (extraer la generación del PDF de `app/api/admin/clients/[id]/account-pdf/route.ts` para reusarla como adjunto).
- **Hooks de pago**: en `lib/payment-generator.ts` (o en sus llamadores) tras el commit, disparar aviso de cobro y boleta al confirmar. En el endpoint admin de respuesta de tickets, notificar por correo.
- **Endpoints**: CRUD de plantillas, compositor, historial, webhook Resend. Todos solo ADMIN (salvo el webhook, que valida firma).
- **UI**: `/admin/comunicaciones` + botones en Billing y Tickets + ítem en el sidebar de admin.
- **Config**: `.env` con `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`. Prerrequisito externo: dominio verificado en Resend.
- **Envíos masivos**: secuencial con throttling y log por correo; se respetan límites del plan gratuito de Resend (3.000/mes).
