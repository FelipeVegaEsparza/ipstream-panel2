# Design

## Context

Ver `proposal.md - Why`. Estado actual:

- `Plan` tiene `price` (Float) + `currency` (default `CLP`); `Payment` tiene `amount`, `currency`, `status`, `paymentMethod` (incluye `"paypal"`), `transactionId`.
- El registro (`createSignupSubscription`) crea `Subscription` + un `Payment` pendiente con `plan.price`/`plan.currency`. No hay cobro online: se confirma a mano.
- Formateo CLP/USD existe (`lib/currency.ts`, `lib/billing-format.ts`).
- Webhooks ya se usan (Resend, OneSignal) → hay patrón.

**Restricción clave**: PayPal **no soporta CLP** como moneda de transacción. Por lo tanto PayPal se usa para **USD** (y otras monedas soportadas por PayPal); el pago en **CLP sigue por el flujo actual** (transferencia + registro manual). El selector ofrece ambas monedas, pero el botón de PayPal aparece solo en pagos en monedas soportadas.

## Goals / Non-Goals

**Goals:**
- Precios por moneda por plan (CLP + USD), elegibles por el cliente.
- Pagar un pago pendiente con PayPal (USD) y conciliarlo por webhook.
- Mantener CLP (manual) funcionando igual.

**Non-Goals:**
- Recurrencia automática en PayPal (Subscriptions) — fase futura; por ahora el pago es por período.
- Impuestos/VAT y facturación fiscal internacional.
- Otros medios (tarjeta directa, Stripe).

## Decisions

### 1. `PlanPrice` (precios por moneda)
Nuevo modelo `PlanPrice { id, planId, currency, amount }` con `@@unique([planId, currency])`. `Plan.currency` queda como moneda base. El admin gestiona CLP/USD desde `PlanForm`.
- **Alternativa**: `Plan.priceUsd` — se descarta por ser poco general.

### 2. Selección de moneda y propagación
Selector en `app/planes/**` y `SignupForm` (default: moneda base del plan). El registro recibe `currency`; se valida contra `PlanPrice`; se guarda en la suscripción (`Subscription.billingCurrency`) y los pagos se generan con ese monto/moneda. Si el plan no tiene precio en la moneda elegida, no se ofrece esa moneda.

### 3. PayPal Orders API v2 (pago por período)
- `POST /api/checkout/paypal` (cliente autenticado, body `{ paymentId }`): crea una **order** de PayPal `intent: CAPTURE`, monto = `payment.amount`/`payment.currency`, `reference_id = paymentId`, con `return_url`/`cancel_url`. Devuelve el link de aprobación.
- El cliente aprueba en PayPal → vuelve al `return_url` → `POST /api/checkout/paypal/capture` con `orderId`: captura y marca el `Payment` como `completed` (`paymentMethod: 'paypal'`, `transactionId`).
- **Idempotencia**: si el pago ya está `completed`, no se re-captura ni se altera.
- **Webhook** `/api/webhooks/paypal`: verifica firma con `PAYPAL_WEBHOOK_ID`, y ante `CHECKOUT.ORDER.APPROVED` / `PAYMENT.CAPTURE.COMPLETED` marca el pago `completed` de forma idempotente (resolviendo el `paymentId` por `reference_id`/`transactionId`).

### 4. Credenciales y entorno
`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` (`sandbox`|`live`), `PAYPAL_WEBHOOK_ID`. Si faltan, el botón de PayPal no se muestra y el resto de la facturación sigue igual.

### 5. Alcance de la UI
- Público: selector de moneda (CLP/USD) + precio.
- Dashboard: en `ClientPaymentsView`/`PaymentStatusCard`, botón "Pagar con PayPal" para pagos pendientes en monedas soportadas; para CLP, mantener el flujo actual.
- Admin: estado/transacción de PayPal en la vista de pagos.

## Risks / Trade-offs

- **PayPal no soporta CLP** → PayPal solo para USD; CLP queda manual (documentado y reflejado en la UI).
- **Tokens/captura** → si el cliente cierra la pestaña tras aprobar, el webhook concilia igual.
- **Verificación de firma del webhook** → obligatoria; sin `PAYPAL_WEBHOOK_ID` se rechaza.
- **Moneda elegida vs plan** → validar contra `PlanPrice`; si no existe, rechazar el registro con mensaje claro.
- **Migración** → `PlanPrice` nullable por plan; los planes existentes siguen con su `Plan.currency`/`price` (se puede poblar `PlanPrice` con esos valores).

## Migration Plan

1. **Fase 1**: `PlanPrice` + precios por moneda en admin + selector + propagación a suscripción/pagos (sin PayPal). Verificable sin credenciales.
2. **Fase 2**: PayPal (checkout + capture + webhook + botón), env-driven. Requiere credenciales (sandbox para probar).
3. **Fase 3**: pulido (estado en admin, emails con la moneda, reintentos).

**Rollback**: cada fase es un commit; sin credenciales de PayPal, la Fase 2 queda inerte.
