## Context

Hoy no existe ningún canal de correo: los pagos/boletas se gestionan con `lib/payment-generator.ts` (que crea cuotas pendientes y confirma pagos), la boleta se genera con jsPDF en `app/api/admin/clients/[id]/account-pdf/route.ts`, el soporte vive en `SupportTicket`/`SupportTicketMessage`, y el admin ya tiene un patrón de secciones (`app/admin/*`) y de cron con `CRON_SECRET`. La motivación está en `proposal.md`; los requisitos de comportamiento en `specs/email/spec.md`.

## Goals / Non-Goals

**Goals:**
- Motor de correo con Resend (plantillas HTML, variables, adjuntos, rastreo).
- Boletas automáticas en ambos sentidos (aviso de cobro al generar cuota; boleta con PDF al confirmar pago), post-commit y sin romper el flujo de pagos.
- Aviso de soporte automático al responder tickets.
- Compositor general (1/varios/todos) + editor de plantillas + historial con rastreo en `/admin/comunicaciones`.
- Botones contextuales en Billing y Tickets.

**Non-Goals:**
- Recordatorio por cron de cuotas vencidas (después del lanzamiento).
- Cola de trabajos persistente (Redis/Bull): los envíos masivos son secuenciales en el proceso.
- Pasarela de pago online; Webpay/Stripe quedan fuera.
- Suscripción/opt-out de correo gestionado por el cliente final.

## Decisions

### D1. Envío vía HTTP directo a la API de Resend
`lib/resend.ts` usa `fetch` a `https://api.resend.com/emails` (Authorization Bearer `RESEND_API_KEY`), sin SDK. Cada envío: crea/actualiza `EmailLog`, llama a Resend, guarda `resendId` y estado.

- *Por qué:* cero dependencias nuevas; la API es simple y ya usamos `fetch` en todo el proyecto.
- *Alternativa:* SDK oficial — descartado por simplicidad.

### D2. Plantillas en DB (`EmailTemplate`) con render por variables
Modelo con `key` único (`boleta`, `soporte`, `aviso`, `general`), `subject` y `htmlBody` (HTML con `{{variable}}`). `lib/email-templates.ts` hace `renderTemplate(template, vars)` reemplazando variables con **escape HTML** (evita inyección de contenido del cliente). Seed inicial con 3 plantillas estilizadas.

- *Por qué:* el admin debe poder editarlas sin deploy (decisión 5 del usuario).
- *Alternativa:* plantillas en código — descartada.

### D3. Adjunto de boleta: extraer `generateAccountPdf(clientId) → Buffer`
Se refactoriza `app/api/admin/clients/[id]/account-pdf/route.ts`: la generación del PDF (jsPDF) pasa a `lib/account-pdf.ts` como función reutilizable. La ruta de descarga la usa igual (devuelve el PDF), y `lib/resend.ts` recibe `attachments: [{ filename, content: base64 }]` para adjuntarla.

### D4. Hooks de pago tras el commit, con `fire-and-forget` aislado
Los tres puntos de `lib/payment-generator.ts` (o sus llamadores) disparan el envío **después** de que la transacción commitea:
- Cuota pendiente generada → aviso de cobro (`template boleta`, vars de la cuota).
- Pago confirmado (completed) → boleta con PDF adjunto.

El envío va envuelto en `try/catch` y **nunca** hace `throw` que revierta el pago: si falla, se registra en `EmailLog` como `failed`. Se verifica `template.isActive` y existencia de email del cliente; si no aplica, se registra como `skipped`.

- *Por qué:* desacopla el correo de la integridad del pago.
- *Detalle:* si el render del PDF o el envío tardan, no bloquean la respuesta HTTP del pago (se dispara sin `await` o con un timeout corto y se registra el resultado).

### D5. Aviso de soporte en el endpoint de respuesta del ticket
El endpoint admin que agrega una respuesta a un ticket (`app/api/admin/tickets/[id]`) dispara, tras guardar el mensaje, el envío con `template soporte` (vars: nombre, mensaje de la respuesta, link al ticket). Mismo patrón aislado que D4.

### D6. Rastreo vía webhook firmado
`/api/webhooks/resend` valida la firma HMAC con `RESEND_WEBHOOK_SECRET` (Resend firma los payloads). Mapea eventos (`email.sent/delivered/bounced/opened/clicked/complained`) a `EmailLog.status` + `openedAt`/`clickedAt`. Resend trackea opens/clicks por defecto (pixel/links).

- *Riesgo:* Resend no incluye el `id` del email en el payload webhook en todos los eventos → se guarda `resendId` al enviar y el webhook busca por ese id; si no hay match, se ignora.

### D7. Compositor general con envío secuencial + throttling
`/admin/comunicaciones`:
- Destinatarios: un cliente, una selección, o todos (solo con email).
- Plantilla o texto libre; adjunto opcional (boleta de un pago).
- Envío masivo: secuencial con delay corto (~250-500ms) para respetar el límite de Resend, con confirmación previa del conteo y log por destinatario.

### D8. Endpoints y UI admin (todo solo ADMIN salvo el webhook)
- `app/api/admin/emails/*`: CRUD plantillas, compositor/enviar, historial (filtros), correo de prueba.
- `app/api/admin/emails/templates` para el editor.
- Página `app/admin/comunicaciones/` + ítem en el sidebar.
- Botones contextuales: "Enviar boleta" en billing (reusa el mismo endpoint que el envío automático) y "Avisar por correo" en la respuesta de tickets (checkbox al responder).

### D9. Configuración
`.env`: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (ej. `no-reply@ipstream.cl`), `RESEND_WEBHOOK_SECRET`. La app arranca con plantillas seadadas si no existen. Si no hay `RESEND_API_KEY`, los envíos se registran como `skipped` (no rompe el panel en dev).

## Risks / Trade-offs

- **Dominio no verificado en Resend** → los correos no salen o caen en spam. Mitigación: documentar la verificación (DKIM/SPF) como paso obligatorio de deploy; `RESEND_FROM_EMAIL` debe usar un dominio verificado.
- **Resend sin webhook configurado** → el rastreo queda en "enviado" sin entregado/abierto. Mitigación: el historial igualmente registra el envío; configurar el webhook se documenta.
- **Email no bloqueante vs pérdida de registro** → si el proceso muere justo tras el envío, el log podría quedar sin `resendId`. Aceptable: se registra el intento antes de llamar a Resend y se actualiza tras la respuesta.
- **Envío masivo lento** (secuencial) → con cientos de clientes tarda minutos. Aceptable para el volumen inicial; la cola persistente es un Non-Goal.
- **HTML con contenido del cliente** → escape de variables en el render para evitar inyección.
- **Refactor de `account-pdf`** → debe conservar el endpoint de descarga exactamente como está; se cubre con verificación manual.

## Migration Plan

1. Prisma: `EmailTemplate` + `EmailLog`; `prisma db push`/migración.
2. Seed de plantillas (`boleta`, `soporte`, `aviso`) con estilos y variables documentadas.
3. `lib/resend.ts` + `lib/email-templates.ts` + `lib/account-pdf.ts` (refactor).
4. Hooks de pago y de ticket.
5. Endpoints admin + webhook.
6. UI: `/admin/comunicaciones` + botones contextuales + sidebar.
7. `.env` y documentación en `DEPLOY.md` (verificación de dominio, webhook).

**Rollback:** sin `RESEND_API_KEY` el sistema se comporta como hoy (sin envíos); los hooks registran `skipped`/`failed` sin tocar pagos ni tickets. Los nuevos modelos son aditivos.
