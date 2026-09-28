## Why

El registro desde las páginas públicas (`/registro`, `/planes/[slug]`) crea cuenta, streams, suscripción y pago, pero deja el sistema en estados frágiles y difíciles de diagnosticar: no es atómico, no valida el plan y oculta fallos con `try/catch` que solo loguean; el dashboard busca la suscripción con `status: 'ACTIVE'` (mayúsculas) mientras el resto del sistema escribe `'active'` (minúsculas), así que un cliente con plan activo puede ver "Sin Plan Activo". Este change endurece ese flujo y **no** decide la activación: la activación del plan y el período de prueba se resuelven en el change `free-trial` (el plan se activa al registrarse en modo prueba).

## What Changes

- **Sin activación diferida**: la activación del plan y el período de prueba quedan en `free-trial`. Este change NO bloquea el plan esperando la confirmación de pago; sólo unifica el valor de estado y mantiene el primer pago como pendiente a cobrar.
- **Corrección del casing del estado**: el dashboard deja de buscar `'ACTIVE'` y usa el mismo valor que escribe el resto del sistema (`'active'`), centralizado en una constante, de modo que un cliente con plan activo lo ve reflejado.
- **Registro atómico**: cuenta, cliente, suscripción, pago y cuotas (y las filas de streams) se crean dentro de una transacción; un fallo no deja estados parciales.
- **Validación del plan en servidor**: el `planId` recibido se valida (existe y está activo) antes de usarlo; si no es válido, el registro responde error claro en vez de crear una cuenta sin plan en silencio.
- **Estado inicial del pago según origen, explícito**: registro público → primer pago `pending` (a cobrar, con vencimiento al fin de la prueba según `free-trial`); asignación por administrador → primer pago confirmado. La activación no se deriva de este estado en este change.
- **Seed de AutoDJ tolerante y observable**: sigue sin romper el registro si el nodo remoto falla o no está actualizado, pero el fallo se registra y se informa al administrador para su reintento.
- **Límite de tasa fiable**: el límite de registros por IP se hace consistente durante la vida del servicio y no evadible por cabeceras de proxy, o bien se documenta explícitamente su alcance si se mantiene en memoria.

## Capabilities

### New Capabilities

- `public-signup`: registro de clientes desde las páginas públicas — creación atómica de cuenta/cliente/suscripción/pago, validación del plan elegido, seed de AutoDJ tolerante a fallos y limitación de tasa.
- `billing/subscriptions`: coherencia del valor de estado de las suscripciones (mismo literal al leer y escribir) y estado inicial del pago según el origen del alta.

### Modified Capabilities

- Ninguna: no existen specs previas de registro público ni de suscripciones, y la capacidad `email` no cambia su comportamiento (los correos de boleta/bienvenida se mantienen).

## Impact

- `app/api/auth/register/route.ts` — validación del plan, transacción y manejo de errores visible.
- `lib/signup.ts` — `createSignupSubscription` transaccional; el estado/fechas de la prueba los define `free-trial`.
- `app/dashboard/page.tsx` — búsqueda de suscripción por `'active'`.
- `lib/payment-generator.ts` — revisión de coherencia de estados.
- `lib/rate-limit.ts` y la ruta de registro — alcance y robustez del límite.
- `lib/streaming-seed.ts` — registro/notificación del fallo del seed.
- Sin cambios de esquema de base de datos en este change (los `status` ya son `String`). Sólo panel: no requiere "Actualizar nodo" tras el deploy.
- **Coordinación**: `fix-public-signup-flow` y `free-trial` comparten el literal de estado; el módulo de constantes se introduce aquí y lo reutiliza `free-trial`.
