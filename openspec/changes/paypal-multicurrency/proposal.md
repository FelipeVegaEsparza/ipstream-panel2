# Proposal

## Why

Hoy los planes se cobran solo en CLP y el pago se confirma a mano (transferencia). Para lanzar el servicio a países fuera de Chile necesitamos que el cliente pueda **elegir la moneda (CLP o USD)** y **pagar online con PayPal** en esa moneda. El sistema ya tiene `Plan.currency`, `Payment.currency` y `Payment.paymentMethod` con `"paypal"`, y formateo CLP/USD; falta el precio en USD, la elección de moneda y la pasarela.

## What Changes

- **Precios por moneda**: cada plan define precios por moneda (`PlanPrice`: CLP y USD), configurables desde el admin.
- **Selector de moneda** en la página pública de planes/registro (`CLP` / `USD`, mostrando la moneda local por defecto): al elegir, se muestra el precio en esa moneda y se propaga al registro.
- **Suscripción/pagos en la moneda elegida**: `Subscription`/`Payment` guardan la moneda elegida y usan el precio correspondiente.
- **Pago con PayPal**: el cliente paga un `Payment` pendiente con **PayPal** (Orders API v2). Al confirmarse, el `Payment` pasa a `completed` (`paymentMethod: paypal`, `transactionId`) y se actualiza el estado de suscripción.
- **Webhook de PayPal**: `/api/webhooks/paypal` procesa `CHECKOUT.ORDER.APPROVED`/`PAYMENT.CAPTURE.COMPLETED` para conciliar pagos (aun si el cliente cierra la pestaña).
- **Admin**: ver el estado del pago/transacción de PayPal y configurar credenciales/moneda base.

Fuera de alcance: cobro recurrente automático con PayPal Subscriptions (se puede sumar después); impuestos; otros medios.

## Capabilities

### New Capabilities

- `billing/currency-selection`: precios por moneda y elección de moneda del cliente (CLP/USD), propagada a la suscripción y a los pagos.
- `billing/paypal`: pago online de un pago pendiente con PayPal en la moneda del pago, con confirmación y conciliación vía webhook.

### Modified Capabilities

- Ninguna.

## Impact

- **Prisma**: nuevo `PlanPrice`; campos de PayPal en `Payment` (`provider`, `providerPaymentId`, `hostedInvoiceUrl` opcional) y en `Subscription`/`Client` si hace falta; `Plan.currency` pasa a ser la moneda base.
- **API**: `/api/checkout/paypal` (crear orden), `/api/checkout/paypal/capture`, `/api/webhooks/paypal`; ajustes en `/api/auth/register` (moneda elegida) y en el signup.
- **UI**: selector de moneda en `app/planes/**` y `SignupForm`; botón "Pagar con PayPal" en `ClientPaymentsView`/`PaymentStatusCard`.
- **Admin**: precios por moneda en `PlanForm`; estado PayPal en la vista de pagos.
- **Config**: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` (sandbox|live), `PAYPAL_WEBHOOK_ID`.
- **Sin impacto** en streaming, dominios, contenido.
