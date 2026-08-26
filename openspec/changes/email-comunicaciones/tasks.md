## 1. Modelo de datos y configuración

- [x] 1.1 Modelos `EmailTemplate` (key único, name, subject, htmlBody, isActive) y `EmailLog` (clientId?, to, from, subject, templateKey, status, resendId, error, openedAt, clickedAt, sentAt) en `prisma/schema.prisma` + índices
- [x] 1.2 Migración Prisma y validación de schema
- [x] 1.3 Seed de plantillas iniciales (`boleta`, `soporte`, `aviso`) con HTML estilizado y variables documentadas
- [x] 1.4 `.env.example` con `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`

## 2. Motor de envío

- [x] 2.1 `lib/resend.ts`: `sendEmail({to, subject, html, templateKey, clientId, attachments})` → llama a la API de Resend, registra `EmailLog` (intento antes, `resendId`/estado después), aísla errores sin `throw`
- [x] 2.2 `lib/email-templates.ts`: `renderTemplate(template, vars)` con reemplazo de `{{var}}` y escape HTML
- [x] 2.3 `lib/account-pdf.ts`: extraer la generación del PDF de jsPDF desde `app/api/admin/clients/[id]/account-pdf/route.ts` como `generateAccountPdf(clientId) → Buffer` y reutilizarla en la ruta de descarga (sin cambiar su respuesta)

## 3. Hooks automáticos

- [x] 3.1 Aviso de cobro: al generarse una cuota pendiente (puntos de `lib/payment-generator.ts` o sus llamadores, tras el commit) enviar con template `boleta`
- [x] 3.2 Boleta con PDF: al confirmarse un pago (status → completed) enviar con template `boleta` y adjunto `generateAccountPdf`
- [x] 3.3 Ambos hooks aislados (nunca rompen el pago), con registro `failed`/`skipped` cuando no aplica
- [x] 3.4 Aviso de soporte: al responder un ticket desde el admin, enviar con template `soporte` (vars: nombre, respuesta, link al ticket)

## 4. Rastreo y webhook

- [x] 4.1 Endpoint `POST /api/webhooks/resend` que valida firma HMAC (`RESEND_WEBHOOK_SECRET`)
- [x] 4.2 Mapear eventos Resend (sent/delivered/bounced/opened/clicked/complained) a `EmailLog` por `resendId`
- [x] 4.3 Rechazar peticiones sin firma válida sin modificar el historial

## 5. API y UI admin

- [x] 5.1 Endpoints admin (solo ADMIN): CRUD de plantillas (`/api/admin/emails/templates*`), envío/compositor, correo de prueba, historial con filtros (cliente, plantilla, estado, fechas)
- [x] 5.2 Página `/admin/comunicaciones`: compositor (1/varios/todos con confirmación de conteo, plantilla o texto libre, adjunto opcional de boleta), editor de plantillas y vista de historial con estados de rastreo
- [x] 5.3 Ítem "Comunicaciones" en el sidebar de admin
- [x] 5.4 Botón "Enviar boleta" en Billing (por pago) que reusa el mismo envío con adjunto
- [x] 5.5 Opción "Avisar por correo" al responder un ticket

## 6. Envíos masivos y cierre

- [x] 6.1 Envío a "todos los clientes" con throttling secuencial y log por destinatario
- [x] 6.2 Documentar en `DEPLOY.md`: verificación de dominio en Resend (DKIM/SPF), `RESEND_FROM_EMAIL`, configuración del webhook y límites del plan
- [ ] 6.3 Verificar end-to-end: correo de prueba, boleta automática (cuota + pago confirmado con PDF), aviso de soporte y un envío masivo con rastreo en el historial
