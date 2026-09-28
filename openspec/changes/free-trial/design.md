# Design

## Context

Ver `proposal.md - Why`. El estado actual relevante:

- `lib/signup.ts:39` (`createSignupSubscription`) crea la suscripción con `endDate = now + intervalo`, un `Payment` `pending` con `dueDate = endDate` y aplica cuotas; `lib/payment-generator.ts:120` (`completePaymentAndGenerateNext`) pasa la suscripción a `active` y genera el siguiente pago.
- `generateSubscriptionPayments` (`lib/payment-generator.ts:32`) sólo crea pagos hasta "hoy", por lo que **no** sirve para un vencimiento futuro (fin de prueba).
- `lib/payment-status.ts` deriva el estado de negocio desde los pagos/`endDate`, no conoce pruebas.
- `PaymentStatusCard` y `ClientesTable`/`ClienteRow` muestran estados de pago.
- No existe scheduler de facturación: `instrumentation.ts` sólo levanta el health poller de servidores.
- `fix-public-signup-flow` introdujo (aún sin implementar) una activación diferida que este change revierte.

## Goals / Non-Goals

**Goals:**

- Activar el plan elegido al registrarse, en modo prueba, sin intervención del admin.
- Programar y convertir el primer cobro sin depender de un scheduler.
- Mostrar el estado de prueba en cliente y admin.
- Duración de prueba configurable globalmente (7 días por defecto).

**Non-Goals:**

- No se implementa scheduler de facturación ni correos recordatorios automáticos al final de la prueba.
- No se suspende automáticamente streaming/acceso al vencer la prueba.
- No se implementa antri-abuso de pruebas repetidas en esta iteración (queda como riesgo).
- No se toca streaming-agent ni nodos.
- No se ofrecen pruebas por plan (sólo la global).

## Decisions

### 1. Estado `trialing` + `trialEndsAt` en `Subscription`

Se agrega `trialEndsAt DateTime?` (nullable, no afecta suscripciones existentes) y se admite el valor `trialing` en `Subscription.status` (String, sin enum). La duración sale de `AppConfig.trialDays Int @default(7)`.

- **Alternativa considerada:** derivar la prueba sólo de `startDate + N` sin campo. Se descarta porque el admin podría necesitar extender la prueba y porque el fin de prueba es un dato de negocio explícito.
- **Alternativa considerada:** enum de Prisma. Se descarta para no migrar los `status` existentes.

### 2. Activación inmediata del plan elegido (revierte la activación diferida)

El flujo de `createSignupSubscription` deja de crear la suscripción en `pending`/`active` y la crea en `trialing`, aplicando plan, streams y cuotas al instante. Esto responde al requisito de que el plan "se active según el plan desde donde se completa el formulario".

- **Coordinación:** en `fix-public-signup-flow` se elimina la activación diferida y su requisito asociado; ese change conserva atomicidad, validación de plan, casing de estado, rate limit y seed observable.
- **Impacto:** sólo registros nuevos; las suscripciones existentes siguen `active`.

### 3. Primer pago con vencimiento futuro, sin scheduler

En el registro se crea el pago `pending` con `dueDate = trialEndsAt` y `amount = plan.price` **directamente** (no vía `generateSubscriptionPayments`, que ignora fechas futuras). La bienvenida informa monto y fecha; no se envía cobro inmediato.

- **Alternativa considerada:** crear el pago en un job al día 7. Se descarta para no introducir scheduler en esta iteración; el pago diferido ya deja el estado y la fecha correctos para que `completePaymentAndGenerateNext` lo procese.

### 4. Conversión al confirmar pago

`completePaymentAndGenerateNext` ya pasa la suscripción a `active`; se ajusta para partir de `trialing` y calcular `endDate = dueDate + intervalo` (hoy asume un desplazamiento mensual fijo). El pago confirmado elimina los pendientes y crea el siguiente del ciclo.

### 5. Vencimiento derivado en lectura, sin suspensión

No hay job que marque `expired`: el estado vencido se **deriva** al leer (`trialEndsAt < now` y sin pago confirmado) en `lib/payment-status.ts`, el dashboard y el admin. No se ejecuta ninguna acción automática sobre streams o acceso.

- **Alternativa considerada:** worker que expire y suspenda. Se descarta por decisión de negocio (el admin decide) y para evitar un scheduler.

### 6. Estado de prueba en la UI

`getClientPaymentStatus` agrega el label `trial` cuando la suscripción está `trialing` y vigente, con los días restantes. `PaymentStatusCard` renderiza "Prueba gratis · N días". En admin se agrega badge y filtro "En prueba".

## Risks / Trade-offs

- **[Abuso de pruebas con correos nuevos]** → fuera de alcance; se documenta y se recomienda un follow-up (bloqueo por email/dominio o por IP).
- **[Sin recordatorio antes del día 7]** → el cliente ve los días restantes en el dashboard; un recordatorio requeriría scheduler (follow-up).
- **[Pago generado con vencimiento futuro podría enviarse como cobro inmediato]** → el registro no llama a `sendAccountEmail` de cobro; sólo se envía bienvenida con la información del trial.
- **[Zona horaria al calcular `trialEndsAt`]** → se usa UTC del servidor; la duración es en días completos.
- **[Estados duplicados entre changes]** → las constantes de estado se unifican en `fix-public-signup-flow` y este change las reutiliza.

## Migration Plan

1. Migración de schema: agregar `Subscription.trialEndsAt` (nullable) y `AppConfig.trialDays` (default 7); sin backfill.
2. Deploy normal (push a `main` → GitHub Actions). Sólo panel.
3. Verificar un registro nuevo: suscripción `trialing`, plan activo, pago pendiente al día 7, bienvenida correcta; confirmar pago y verificar `active`.
4. Rollback: revertir el commit y la migración es aditiva/reversible; los trials creados quedan con estados que el código anterior puede ignorar.

## Open Questions

- Recordatorio de fin de prueba por correo y acciones de admin para extender/finalizar la prueba: diferibles, no alteran specs ni tareas actuales.
