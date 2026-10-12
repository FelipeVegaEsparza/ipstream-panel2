# Tasks

## 1. Fase 1 — Precios por moneda + selector

- [ ] 1.1 Agregar `PlanPrice { planId, currency, amount }` y `Subscription.billingCurrency` a Prisma; verificar `prisma validate` + `generate`.
- [ ] 1.2 Gestionar precios por moneda (CLP/USD) en `PlanForm` + API de planes; verificar guardar/leer precios.
- [ ] 1.3 Selector de moneda en `app/planes/**` y `SignupForm` (default moneda base; sólo monedas con precio); verificar que cambia el precio mostrado.
- [ ] 1.4 Propagar la moneda elegida al registro (`/api/auth/register` + `createSignupSubscription`) y generar el pago con el monto/moneda elegidos; verificar suscripción y pago en esa moneda.
- [ ] 1.5 Formatear montos según moneda en web pública, dashboard y PDF (reusar `lib/currency.ts`); verificar CLP y USD.

## 2. Fase 2 — PayPal (USD)

- [ ] 2.1 Crear `lib/paypal.ts` (auth OAuth2 + crear/capturar orden) leyendo env (`PAYPAL_CLIENT_ID/SECRET/ENV/WEBHOOK_ID`); verificar que sin credenciales queda deshabilitado.
- [ ] 2.2 `POST /api/checkout/paypal` (crear orden para un `Payment` pendiente en moneda soportada) y `POST /api/checkout/paypal/capture`; verificar creación y captura (sandbox).
- [ ] 2.3 `/api/webhooks/paypal` con verificación de firma e idempotencia; verificar un evento repetido no duplica ni altera un pago completado.
- [ ] 2.4 Botón "Pagar con PayPal" en `ClientPaymentsView`/`PaymentStatusCard` (solo pagos pendientes en monedas soportadas; CLP mantiene el flujo actual); verificar el flujo end-to-end en sandbox.

## 3. Fase 3 — Pulido

- [ ] 3.1 Mostrar estado/transacción de PayPal en la vista de pagos del admin.
- [ ] 3.2 Correos/PDF con la moneda elegida; verificar el render.
- [ ] 3.3 Documentar envs de PayPal y el alcance (CLP manual) en `AGENTS.md`/`.env.example`.

## 4. Verificación

- [ ] 4.1 `npx tsc --noEmit` + `npm run build` sin errores.
- [ ] 4.2 Registro en USD → suscripción/pago en USD; pago con PayPal sandbox → pago `completed`; reintento/idempotencia OK.
- [ ] 4.3 Registro en CLP → flujo actual intacto (pago manual).
