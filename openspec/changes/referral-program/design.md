# Design

## Context

El panel es una app Next.js 14 (App Router) con Prisma/MySQL, autenticación NextAuth, facturación manual + PayPal y un patrón de servicios en `lib/*` con tests Vitest. La facturación ya tiene piezas que el programa debe reutilizar:

- `Subscription` (una por cliente, `planId`, `status`, `startDate`, `endDate`, `billingCurrency`) y `Payment` (`status`, `amount`, `currency`, `dueDate`, `paidAt`, `paymentMethod`, `transactionId`).
- `generateSubscriptionPayments` / `completePaymentAndGenerateNext` / `createManualPayment` en `lib/payment-generator.ts` y `markPaymentPaid` en `lib/billing-payments.ts` como únicos puntos donde un pago nace o se confirma.
- `Plan` + `PlanPrice` para precios por moneda (CLP/USD) y `lib/currency.ts` para formateo.
- Registro público en `app/api/auth/register/route.ts` con una transacción única para usuario, cliente, subdominio y streams.
- No existe centro de notificaciones in-app: solo `push_notifications` (OneSignal hacia la audiencia) y correos. El programa necesita avisos dentro del panel, así que se introduce un modelo mínimo reutilizable y se dejan intactos push y email.

Ver `proposal.md` para la motivación y `specs/referrals/*` para el contrato de comportamiento.

## Goals / Non-Goals

**Goals:**

- Atribución persistida y transaccional en el alta, inmutable después.
- Validación determinista y auditables desde pagos reales, tolerante a reintentos y concurrencia.
- Recompensas con importe histórico congelado, acumulación 2→1 y sin duplicados.
- Crédito que cubre renovaciones futuras sin reescribir el historial ni los precios.
- UI de cliente y admin coherente con los tokens de marca (`bg-card`, `border-border`, `brand`, `text-foreground`).
- Compatibilidad total con clientes, planes y suscripciones existentes.

**Non-Goals:**

- Comisiones en dinero, retiros, transferencias o pagos a terceros.
- Referidos multinivel o campañas con códigos temporales.
- Cambiar precios, planes, ciclos de renovación o el flujo de cobro.
- Notificaciones por email o push para eventos de referidos (se usa el centro in-app).
- Soporte de monedas distintas de CLP/USD en esta iteración.
- Afectar nodos de streaming: es un cambio solo de panel, sin "Actualizar nodo".

## Decisions

### 1. Modelo de datos aditivo, con `referrals` como fuente de verdad de la atribución

```prisma
model Client {
  referralCode String? @unique // null hasta la primera generación perezosa
  referralsGiven    Referral[] @relation("ReferralsGiven")
  referralsReceived Referral?  @relation("ReferralsReceived")
  clientNotifications ClientNotification[]
}

model Referral {
  id               String   @id @default(cuid())
  referrerClientId String
  referredClientId String   @unique // una sola atribución por cuenta
  code             String   @db.VarChar(32)
  status           String   @default("registered")
  flagged          Boolean  @default(false)
  flagReason       String?
  signupIp         String?  @db.VarChar(64)
  signupUserAgent  String?  @db.VarChar(500)
  registeredAt     DateTime @default(now())
  firstPaidAt      DateTime?
  secondPaidAt     DateTime?
  validatedAt      DateTime?
  rejectedAt       DateTime?
  rejectionReason  String?  @db.Text
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  referrer Client @relation("ReferralsGiven", fields: [referrerClientId], references: [id], onDelete: Cascade)
  referred Client @relation("ReferralsReceived", fields: [referredClientId], references: [id], onDelete: Cascade)
  payments ReferralPayment[]
  rewards  ReferralReward[]
  @@index([referrerClientId, status])
  @@index([status, registeredAt])
  @@map("referrals")
}

model ReferralPayment {
  id         String   @id @default(cuid())
  referralId String
  paymentId  String   @unique // un pago valida como máximo un referido
  role       String   // first | second
  amount     Float
  currency   String
  paidAt     DateTime
  createdAt  DateTime @default(now())
  referral Referral @relation(fields: [referralId], references: [id], onDelete: Cascade)
  payment  Payment  @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  @@index([referralId, role])
  @@map("referral_payments")
}

model ReferralAuditLog {
  id          String   @id @default(cuid())
  actorUserId String?
  actorRole   String
  action      String
  clientId    String?
  referralId  String?
  rewardId    String?
  before      Json?
  after       Json?
  reason      String?  @db.Text
  ipAddress   String?  @db.VarChar(64)
  createdAt   DateTime @default(now())
  @@index([clientId, createdAt])
  @@index([action, createdAt])
  @@map("referral_audit_logs")
}
```

- `Referral.referredClientId` es `@unique`: la base de datos garantiza una sola atribución por cuenta aunque falle la lógica de aplicación.
- `Client.referralCode` se genera de forma perezosa (primer acceso al programa o primer uso del enlace) para no requerir backfill ni bloquear el deploy. `@unique` con `NULL` permitidos en MySQL no choca con clientes existentes.
- Alternativa descartada: tabla `ReferralCode` separada. Añade joins y no aporta nada mientras el código sea uno por cliente.

### 2. Código y enlace

- Generación: `CAST-` + slug del nombre en mayúsculas (máx. 8) + sufijo aleatorio de 3 caracteres; reintento ante colisión (máx. 5) y sufijo largo como respaldo. Se usa `crypto.randomInt` para el sufijo.
- La creación es idempotente: `ensureReferralCode(clientId)` lee el código existente; si no existe, hace `updateMany` condicionado a `referralCode: null` y, si otra petición ganó la carrera, relee el código ganador.
- El enlace se construye con la URL pública del panel (`PANEL_PUBLIC_URL` o `NEXTAUTH_URL`), porque el alta vive en el panel y no en el sitio público raíz: `https://<dominio-panel>/planes?ref=<code>`. Es configurable por entorno y no depende de la DB.
- `/planes` es un listado de planes sin formulario; cada tarjeta enlaza a `/planes/<slug>?ref=<code>`, la única ruta que renderiza el formulario de alta. `/registro` se mantiene como redirección 308 a `/planes` para enlaces antiguos, conservando `ref` y `plan`.

### 3. Atribución dentro de la transacción de registro

- `registerSchema` agrega `referralCode?: string` (trim, longitud 4–32, patrón laxo `[A-Za-z0-9-]+`).
- En `app/api/auth/register/route.ts`, dentro de `prisma.$transaction` y después de crear `user`/`client`:
  1. Buscar el cliente referente por `referralCode` (solo si el código está presente).
  2. Verificar elegibilidad con una consulta acotada: `user.isActive`, `subscription.status = active` y al menos un pago confirmado válido (las mismas reglas de exclusión que la validación).
  3. Verificar que el email normalizado no coincida con el del referente (el email ya es único a nivel `users`) y comparar la IP del registro con `client.legalAcceptedIp`.
  4. Crear `Referral` con `status: 'registered'`, `signupIp` y `signupUserAgent`; si hay coincidencia de IP, `flagged: true` con `flagReason`.
  5. Devolver `referralApplied` y `referralPendingReview` en la respuesta; nunca datos del referente.
- Un código inválido o de un referente no elegible no bloquea el registro: se omite la atribución y se informa `referralApplied: false`.
- No se permite cambiar el referente: no hay endpoint de actualización, el modelo no expone `referrerClientId` en formularios y el admin no puede reasignar. Un segundo intento de atribución se rechaza por `@@unique(referredClientId)` y se audita.

### 4. Validación derivada de pagos, no de estados de UI

- `lib/referrals/validation.ts` expone `recalculateReferral(referralId, db)` y `onPaymentConfirmed(paymentId, db)`, ambos idempotentes.
- Reglas de pago válido (`isValidationPayment`):
  - `status === 'completed'`, `paidAt != null`, `amount > 0`.
  - `paymentMethod !== 'referral_credit'` y `creditApplied === 0` (un mes cubierto, total o parcialmente, por crédito no valida referidos).
  - No es prueba: método `test`/`sandbox` o `transactionId` con prefijo `TEST_`/`TEST-`.
  - No está reembolsado ni anulado.
- Consecutividad: se generan las fechas esperadas del ciclo desde `subscription.startDate` según `plan.interval` (+1 mes o +1 año). Se exige que los **dos primeros ciclos** tengan cada uno un pago válido. Un ciclo faltante o cubierto por crédito rompe la secuencia y el referido queda pendiente.
- Al validar se guardan `firstPaidAt`, `secondPaidAt`, `validatedAt` y entradas `ReferralPayment` (rol `first`/`second`) con `@@unique(paymentId)`, de modo que un pago no puede validar dos referidos ni contarse dos veces.
- Disparadores:
  - `markPaymentPaid` (PayPal/webhook) llama `onPaymentConfirmed` después del commit.
  - `completePaymentAndGenerateNext` (admin completa pago) llama `onPaymentConfirmed` después del commit.
  - Poller de respaldo cada 15 min revisa referidos no válidos con pagos recientes y reintenta el cálculo. Las importaciones son dinámicas para evitar ciclos.
- Alternativa descartada: recalcular solo desde el frontend o desde webhooks. Un webhook perdido dejaría referidos sin validar; el poller y el recálculo idempotente cubren ese hueco.

### 5. Riesgo y revisión antifraude

- Reglas duras (rechazo o no atribución): cuenta existente, código propio, referente no elegible, segunda atribución.
- Reglas blandas (marcar `flagged` y excluir del conteo hasta revisión): IP de registro igual a la del referente, email con variantes (`+alias`, puntos en Gmail), y nombre de radio/subdominio ya existente (el registro ya lo bloquea).
- `flagged` no invalida la atribución, pero `countValidReferrals` solo cuenta `status='valid'`; un referido marcado puede ser aprobado por el admin (limpia la marca) o rechazado.
- No se comparan datos que no existen: no se almacenan documentos ni datos de pago de terceros.

### 6. Recompensas: valor histórico y generación idempotente

- `computeRewardValue` (función pura) recibe plan del referente, plan del referido, moneda de emisión, precios `PlanPrice` y tasa FX, y devuelve `{ amount, currency, snapshot }`.
  - Precio mensual: `PlanPrice.amount` para la moneda pedida, o conversión desde `plan.price/plan.currency`; planes anuales se dividen por 12.
  - Conversión CLP↔USD con `app_config.referralFxUsdClp` (CLP por 1 USD). La tasa usada se guarda en `snapshot.fxRate`.
  - `amount = min(mensual(referente), mensual(referido))`, redondeado según moneda (CLP 0 decimales, USD 2).
  - Si falta un plan, se usa el otro; si faltan ambos, no se genera recompensa y se audita `reward_skipped` para revisión.
- `ReferralReward`:

```prisma
model ReferralReward {
  id               String   @id @default(cuid())
  referrerClientId String
  referralId       String   // referido que completó el grupo
  slotIndex        Int      // floor(validCount/2) - 1 al generarse
  months           Int      @default(1)
  amount           Float
  currency         String
  remainingAmount  Float
  status           String   @default("available") // available | applied | expired | voided
  priceSnapshot    Json
  generatedAt      DateTime @default(now())
  appliedAt        DateTime?
  subscriptionId   String?
  voidedAt         DateTime?
  voidReason       String?  @db.Text
  referrer Client @relation(fields: [referrerClientId], references: [id], onDelete: Cascade)
  referral Referral @relation(fields: [referralId], references: [id], onDelete: Restrict)
  ledger   ReferralCreditLedger[]
  @@unique([referrerClientId, slotIndex])
  @@index([referrerClientId, status])
  @@map("referral_rewards")
}
```

- Generación en transacción con aislamiento `Serializable` y bloqueo `SELECT ... FOR UPDATE` sobre el cliente referente para serializar validaciones simultáneas. Se cuenta `valid` y se crea la recompensa del slot `floor(validCount/2) - 1` solo si `validCount` es par. El índice único `(referrerClientId, slotIndex)` es la última defensa contra duplicados.
- Si el referido que completa el grupo luego se rechaza, la recompensa no se borra automáticamente: pasa a revisión administrativa. Es más seguro conservar el historial que revertir silenciosamente.

### 7. Crédito: ledger firmado en lugar de "restar al precio"

- Se usa un **ledger** `ReferralCreditLedger` como fuente de verdad contable; `ReferralReward.remainingAmount` es una caché para lectura y se actualiza en la misma transacción.

```prisma
model ReferralCreditLedger {
  id        String   @id @default(cuid())
  clientId  String
  rewardId  String?
  paymentId String?
  type      String   // reward | application | void | debt | adjustment
  amount    Float    // con signo, en la moneda del reward
  currency  String
  fxRate    Float?   // tasa usada al aplicar a un pago en otra moneda
  note      String?  @db.Text
  createdAt DateTime @default(now())
  @@unique([rewardId, paymentId]) // evita doble aplicación del mismo par
  @@index([clientId, currency, createdAt])
  @@index([paymentId])
  @@map("referral_credit_ledger")
}
```

- Crear recompensa → entrada `reward` (+amount).
- Aplicar a pago → entrada `application` (−aplicado), con `paymentId` y `fxRate` si hubo conversión.
- Anular recompensa disponible → entrada `void` (−remaining).
- Anular una recompensa ya consumida → entrada `debt` (−consumido) para descontar de futuros créditos.
- Saldo utilizable = `SUM(amount)` por moneda; si es ≤ 0 no se aplica nada. Esto hace que una deuda pendiente consuma automáticamente la próxima recompensa.
- Alternativa descartada: reducir `Payment.amount` o el precio del plan. Rompe la inmutabilidad del historial y la contabilidad; además exigiría tocar todas las pantallas de facturación.
- `Payment` gana `creditApplied Float @default(0)` y `creditCurrency String?`. `amount` sigue siendo el importe nominal; el neto exigible es `amount - creditApplied`. Las pantallas existentes solo muestran el neto cuando `creditApplied > 0`.

### 8. Motor de aplicación automática

`lib/referrals/credit.ts` → `applyReferralCredits(clientId)`:

1. Bloquear al cliente y cargar recompensas `available` con `remainingAmount > 0` en FIFO por `generatedAt`.
2. Calcular el saldo por moneda desde el ledger.
3. Candidatos: pagos `pending`/`failed` del cliente con `dueDate >= reward.generatedAt` (nunca períodos anteriores o ya pagados), ordenados por `dueDate`.
4. Para cada pago, aplicar `min(saldo, amount - creditApplied)` desde las recompensas positivas en FIFO; insertar entradas `application`, actualizar `remainingAmount`, `status` (`applied` si llega a 0) y `Payment.creditApplied`. Registrar conversión si la moneda del reward difiere de la del pago.
5. Si el crédito cubre el pago completo: marcarlo `completed` con `paymentMethod: 'referral_credit'`, `paidAt: now`, `transactionId: 'REFERRAL_CREDIT_<id>'` y avanzar la suscripción con la misma lógica de `completePaymentAndGenerateNext` (siguiente `dueDate`, `endDate`, nuevo pago pendiente), **sin** enviar el correo de boleta (no hay cobro). Luego continuar con el siguiente pago si queda saldo, con un tope de 24 ciclos por ejecución.
6. Si cubre solo una parte, dejar el pago `pending` con su neto; el cliente paga la diferencia por el flujo habitual.

- Idempotencia: transacción + condicional `remainingAmount >= aplicado` + índice único `(rewardId, paymentId)` en el ledger para impedir dobles aplicaciones del mismo par.
- Puntos de entrada: tras generar una recompensa, tras confirmar un pago (para liberar el siguiente ciclo) y en el poller de respaldo. El poller también detecta pagos vencidos con saldo disponible.
- Alternativa descartada: aplicar crédito solo cuando el cliente lo pide. El requisito pide que no se generen cargos mientras haya crédito suficiente; la aplicación automática evita suspender a un cliente con meses gratis.

### 9. Reembolsos y contracargos

- Se agrega `POST /api/admin/payments/[id]/refund` (solo admin) que marca el pago `refunded` y audita la acción. No altera montos ni genera reembolsos reales; registra la decisión operativa.
- Al revertirse un pago, `handlePaymentReversed(paymentId)`:
  - Busca `ReferralPayment`; si existe, mueve el referido a `flagged` con motivo `payment_refunded` y lo saca del conteo de válidos.
  - Busca recompensas cuyo `referralId` sea ese referido y las deja en revisión (no las anula automáticamente).
- El admin resuelve desde `/admin/referidos`: anular (ledger `void`/`debt`) o mantener con justificación auditada.
- Si el pago reembolsado había sido cubierto por crédito, se revierte la aplicación con una entrada `adjustment` positiva, devolviendo el saldo cuando corresponda.

### 10. Notificaciones in-app

```prisma
model ClientNotification {
  id        String   @id @default(cuid())
  clientId  String
  type      String
  title     String
  message   String   @db.Text
  link      String?
  eventKey  String   @db.VarChar(191)
  readAt    DateTime?
  createdAt DateTime @default(now())
  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
  @@unique([clientId, eventKey])
  @@index([clientId, readAt, createdAt])
  @@map("client_notifications")
}
```

- `lib/notifications.ts` → `notifyClient()` usa `createMany({ skipDuplicates: true })`: la clave de evento (`referral:<id>:registered`, `referral:<id>:first_paid`, `reward:<id>:created`, `reward:<id>:applied`, `audit:<id>`) garantiza una sola notificación por evento.
- Campana en `components/dashboard/Header.tsx` (o el contenedor del layout) con polling cada 30 s al estilo del badge de mensajes de contacto; API `/api/dashboard/notifications` y `/api/dashboard/notifications/[id]/read`. No usa OneSignal ni correo.
- El panel admin no consume este modelo salvo para auditar; las modificaciones administrativas notifican al cliente afectado.

### 11. APIs y UI

Cliente:

- `GET /api/dashboard/referrals` → `{ eligible, code, link, summary, progress, referrals[], rewards[] }`, derivado de la sesión.
- Página `/dashboard/referidos` (server component) con guard de menú (`isMenuItemEnabled`) y componentes en `components/dashboard/referrals/*`.
- Nueva clave `referrals` en `MenuItemKey`/`MENU_ITEMS` (sección General, icono `UserGroupIcon` o `ShareIcon`), con etiqueta i18n `menu.referrals`.

Admin:

- `GET /api/admin/referrals?query&status&from&to&page`
- `GET /api/admin/referrals/[id]` (estado, pagos de validación, recompensas, auditoría)
- `POST /api/admin/referrals/[id]/flag` (aprobar/rechazar con motivo)
- `POST /api/admin/referral-rewards/[id]/void`
- `GET /api/admin/referrals/audit`
- `POST /api/admin/payments/[id]/refund`
- Página `/admin/referidos` con tabs Resumen / Referentes / Referidos / Recompensas / Revisión / Auditoría, componentes en `components/admin/referrals/*` y entrada en `AdminSidebar`.
- Todas las rutas verifican `session.user.role === 'ADMIN'` con el patrón existente (`getSession` o `getServerSession`).

Diseño visual: tarjetas `bg-card border border-border rounded-2xl`, KPIs con `text-muted-foreground` y acentos `brand`, barra de progreso con `bg-brand`, tablas con bordes finos y sin sombras grandes; tablas responsive con scroll horizontal; ambos temas (`data-theme="light"`).

### 12. Poller y operación

- `lib/referral-poller.ts` arrancado desde `instrumentation.ts` con la misma guarda `PANEL_POLLER` que los pollers existentes. Cada 15 min:
  - Recalcula referidos no válidos con pagos recientes (ventana de 7 días).
  - Aplica créditos disponibles a pagos pendientes.
  - Procesa recompensas pendientes de notificación (si una notificación falló).
- Sin dependencias nuevas, sin cambios en Docker y sin acciones sobre nodos de streaming.

### 13. Pruebas

- Funciones puras testeadas con Vitest al estilo `lib/*.test.ts`:
  - `computeReferralProgress(validCount)` → 1/2/3/4/10 casos.
  - `computeRewardValue` → mismo precio, distinto precio, anual, CLP↔USD, snapshot inmutable.
  - `selectValidationPayments` → 0, 1, 2 pagos; pendiente/fallido/prueba/crédito/reembolsado; consecutividad.
  - `buildReferralCode` → formato, colisión, idempotencia.
  - `allocateCredit` → cobertura total, parcial, varios meses, deuda negativa.
- Pruebas de API/servicio con `fakeDb` (patrón `lib/ai-credits.test.ts`) para atribución, generación idempotente, anulación y auditoría.
- Escenarios funcionales obligatorios del requerimiento mapeados 1:1 a tests (ver `tasks.md`).

## Risks / Trade-offs

- **Hooks de pago incompletos** (algún camino confirma pagos sin llamar al motor): el poller y el recálculo idempotente reducen el impacto; se agregan tests que verifican los tres caminos existentes.
- **Crédito aplicado a un período que luego se reembolsa**: el ledger permite revertir con `adjustment`/`debt`; el admin siempre revisa, nunca se revierte solo.
- **Doble recompensa por concurrencia**: `@@unique(referrerClientId, slotIndex)` + transacción serializable + bloqueo por cliente. Si aun así se detecta, el índice impide el duplicado y el proceso reintenta.
- **Precios/monedas inconsistentes**: el snapshot guarda precios, moneda, tasa y fuente; las recompensas ya generadas no cambian aunque el admin edite planes.
- **Cliente con plan gratuito o sin plan**: no puede ser elegible ni generar recompensas; si un referido no tiene plan, se usa el plan del referente para calcular y se audita la fuente.
- **Crecimiento de notificaciones**: índice por cliente/fecha; no se define retención en esta iteración (fuera de alcance).
- **UI de pagos existente**: `amount` sigue siendo el nominal; si una pantalla antigua no considera `creditApplied`, mostraría un importe mayor. Mitigación: badge "Cubierto/parcial por crédito" en las vistas de pagos del cliente y admin, y tests de neto.
- **Cambios de plan del referente/referido**: el valor se congela al segundo pago; si el plan cambia antes, se usa el vigente en ese momento, según el requisito.

## Migration Plan

1. Actualizar `prisma/schema.prisma` (modelos nuevos y columnas aditivas) y generar la migración `prisma/migrations/<timestamp>_referral_program/migration.sql` con `CREATE TABLE`, índices únicos y `ALTER TABLE` de columnas nullables/default 0.
2. `npx prisma generate` + `npx prisma migrate dev` en local; en producción el entrypoint aplica `prisma db push` y la migración manual, igual que el resto del proyecto. Sin backfill: `referralCode` queda `NULL` y se genera al primer acceso.
3. Desplegar el panel (push a `main`, gate de CI). No se requiere "Actualizar nodo".
4. Verificar en staging: registrar una cuenta con `?ref=`, activar plan, completar dos pagos, ver recompensa y aplicación de crédito.
5. Rollback: las tablas y columnas son aditivas; desplegar la imagen anterior deja los datos huérfanos pero no rompe nada. Las notificaciones y recompensas quedan en la DB para reintentar tras un redeploy.

## Open Questions

- Ninguna que cambie el alcance. La retención de notificaciones y el envío de correo opcional para eventos de referidos quedan como mejoras futuras.
