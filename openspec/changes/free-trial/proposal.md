## Why

El registro público no tiene hoy un gancho de venta: o exige confirmar el pago antes de habilitar el plan, o lo activa sin cobrarlo. Se quiere captar clientes ofreciendo sus **primeros 7 días gratis**, activando de inmediato el plan elegido desde la página/formulario público y programando el primer cobro al terminar la prueba. Este change revierte la "activación diferida" planteada en `fix-public-signup-flow`: el plan se activa al registrarse (en modo prueba) y no queda bloqueado esperando al administrador.

## What Changes

- **Prueba gratuita de 7 días**: al completar el registro público, la suscripción se crea en estado de prueba (`trialing`) por 7 días (duración global configurable) y el **plan elegido se activa de inmediato**, con sus streams y cuotas.
- **Primer cobro al terminar la prueba**: se crea el primer pago en estado `pending` con vencimiento en el fin de la prueba; el correo de bienvenida informa al cliente el monto y la fecha de cobro. No se envía cobro inmediato.
- **Conversión al confirmar el pago**: al confirmarse el primer pago, la suscripción pasa de `trialing` a `active` y comienza el período pagado (siguiente cobro según el intervalo del plan).
- **Prueba vencida sin pago**: al pasar el fin de la prueba sin pago confirmado, la suscripción se muestra vencida; **no se suspenden streams ni se bloquea el acceso automáticamente** (el administrador decide).
- **Visibilidad del estado de prueba**: el dashboard del cliente muestra "Prueba gratis · N días restantes" y el panel de administración muestra un badge/filtro "En prueba".
- **Configuración global**: la duración de la prueba se define en `AppConfig` (`trialDays`, por defecto 7).

## Capabilities

### New Capabilities

- `billing/free-trial`: período de prueba gratuito en el registro público — activación inmediata del plan elegido, generación y conversión del primer cobro al terminar la prueba, y visualización del estado de prueba para cliente y administrador.

### Modified Capabilities

- Ninguna: la prueba se introduce como capacidad nueva y autocontenida.

## Impact

- **Schema**: `Subscription.trialEndsAt DateTime?`, nuevo valor de estado `trialing`; `AppConfig.trialDays Int @default(7)`. Requiere migración.
- **Registro**: `lib/signup.ts` (`createSignupSubscription`) crea la suscripción en prueba y el primer pago diferido.
- **Pagos**: `lib/payment-generator.ts` convierte `trialing` → `active` al confirmar y ajusta `endDate` al período pagado.
- **Estados**: `lib/payment-status.ts` agrega el estado `trial`; `app/dashboard/page.tsx` y `components/dashboard/PaymentStatusCard.tsx` lo muestran.
- **Admin**: `components/admin/ClientesTable.tsx` y `ClienteRow.tsx` con badge/filtro de prueba.
- **Emails**: `lib/email-hooks.ts` y plantilla de bienvenida con la información del trial.
- **UI pública**: `components/public/SignupForm.tsx`, `app/planes/[slug]/page.tsx` y `app/registro/page.tsx` comunican los 7 días gratis.
- **Deploy**: sólo panel (`app/*`, `lib/*`, `components/*`); **no** toca streaming-agent ni nodos, así que no requiere "Actualizar nodo".
- **Depende de / coordina con**: `fix-public-signup-flow` (constantes de estado y mensaje de éxito); ver ese change para los ajustes de coherencia.
