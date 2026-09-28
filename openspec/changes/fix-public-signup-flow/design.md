# Design

## Context

Ver `proposal.md - Why`. El flujo actual vive casi todo en `app/api/auth/register/route.ts:17` y `lib/signup.ts:39`:

- `register` crea `User` + `Client`, luego (fuera de transacción) crea streams, luego llama a `createSignupSubscription`, que a su vez crea `Subscription` (`status: 'active'`), actualiza `Client.planId`, crea `Payment` (`status: 'pending'`), aplica cuotas y dispara correos.
- Cada bloque posterior está envuelto en `try/catch` que solo hace `console.error`.
- El dashboard consulta `prisma.subscription.findFirst({ where: { status: 'ACTIVE' } })` (`app/dashboard/page.tsx:65`), pero el resto del sistema escribe/lee `'active'` en minúsculas.
- El agente de streaming (`seedDefaultAutoDjContent`) se llama al final y no reporta su resultado a nadie.
- `rateLimit` es un `Map` en memoria y usa el primer valor de `x-forwarded-for` (`app/api/auth/register/route.ts:9`).

La activación del plan y el período de prueba son responsabilidad del change `free-trial`; este change no decide el gating.

## Goals / Non-Goals

**Goals:**

- Un solo valor lógico de estado de suscripción, leído y escrito igual.
- Registro atómico en base de datos, con las llamadas externas (agente) fuera de la transacción.
- Validación del plan antes de usarlo.
- Límite de tasa que no sea evadible por cabeceras y coherente con el despliegue.
- Fallo del seed visible para el administrador sin romper el registro.

**Non-Goals:**

- No se decide aquí cuándo se activa el plan ni la duración de la prueba (change `free-trial`).
- No se agrega verificación de email ni pasarela de pago online.
- No se implementa multi-instancia del panel ni un store distribuido (fuera del despliegue actual).
- No se migran datos de suscripciones existentes (ya están `active`).
- No se cambia el esquema de base de datos en este change.

## Decisions

### 1. La activación se delega en `free-trial`

Este change no implementa activación diferida. `createSignupSubscription` quedará transaccional y respetará el estado y las fechas que defina `free-trial` (prueba gratuita con el plan activo al registrarse). Mantener la activación fuera de este change evita que la decisión de negocio de prueba quede duplicada o contradictoria.

- **Coordinación:** `free-trial` define `trialing`/`trialEndsAt` y su transición a `active`; aquí sólo se unifica el literal de estado y se hace transaccional la creación.

### 2. Un único valor de estado: `'active'` en minúsculas

Se corrige la consulta del dashboard a `'active'` y se centraliza el literal en una constante (por ejemplo `lib/subscription-status.ts`) usada por dashboard, admin, `signup.ts`, `payment-generator.ts` y `account-pdf.ts` para evitar que vuelva a divergir. `free-trial` reutiliza estas constantes.

- **Alternativa considerada:** usar `'ACTIVE'` y cambiar todas las escrituras. Se descarta porque los datos existentes ya son `'active'`; cambiar las escrituras exigiría migración.

### 3. Transacción en base de datos; agente fuera de ella

`User` + `Client` + `Subscription` + `Payment` + cuotas se crean dentro de un `prisma.$transaction` interactivo. La creación de streams (filas `RadioStream`/`VideoStream`) también entra en la transacción. El seed del AutoDJ llama al agente remoto, que no es transaccional ni revertible, así que se ejecuta **después del commit** y de forma best-effort.

- **Alternativa considerada:** incluir el seed dentro de la transacción. Se descarta: mantendría abierta una transacción de BD mientras se espera a un nodo remoto y no hay rollback real del lado del agente.
- **Nota:** `createSignupSubscription` se refactoriza para aceptar un cliente transaccional (`tx`) o se inlinea en la ruta, para no anidar transacciones. `free-trial` trabaja sobre esta misma función.

### 4. Validar el plan dentro de la transacción

Se lee el plan por `id` y se verifica `isActive`; si no cumple, se aborta con error de validación (400) y no se crea nada. Esto elimina el uso de `body.planId` sin validar y el `registerSchema` transformado pero luego ignorado.

### 5. Límite de tasa: IP real + alcance documentado

Se mantiene el `Map` en memoria (adecuado para la instancia única actual), pero:

- La IP se deriva del **último** valor de `x-forwarded-for` (el que agrega el proxy de confianza) en lugar del primero, y se cae a `x-real-ip`. Así añadir valores a la cabecera no otorga cupo.
- Se documenta que el límite es por instancia y se reinicia con el proceso; si el panel pasa a multi-instancia, se migrará a un store compartido.

- **Alternativa considerada:** tabla en BD o Redis para el contador. Se descarta por ahora para no agregar esquema/dependencia a un despliegue de una sola instancia; queda como camino de escalado.

### 6. Seed observable

`seedDefaultAutoDjContent` ya devuelve `{ ok, error }`. `register` propagará ese resultado a `notifyAdminNewSignup`, de modo que el correo al admin indique si el contenido por defecto se sembró o falló (con el motivo), permitiendo reintento. El registro nunca se revierte por esto.

## Risks / Trade-offs

- **[Cambio más largo al incluir streams]** → se dejan fuera todas las llamadas al agente y sólo se escriben filas; el tiempo de transacción se mantiene acotado a la BD.
- **[Comportamiento dividido entre registros viejos y nuevos]** → documentado; el gating se basa en el estado, no en la fecha.
- **[Límite en memoria se reinicia al reiniciar el contenedor]** → aceptado para instancia única; anotado para futura migración.
- **[Fallo del seed silencioso para el cliente]** → se notifica al admin; el cliente igual puede subir contenido manualmente.
- **[Dependencia con `free-trial`]** → el orden de implementación importa: las constantes de estado se introducen aquí y `free-trial` las consume.

## Migration Plan

1. Deploy normal (push a `main` → GitHub Actions). No hay migración de BD ni de datos en este change.
2. Verificar en el dashboard de un cliente con plan que reconoce el estado activo.
3. Rollback: revertir el commit; no hay cambios de datos.

## Open Questions

- Ninguna pendiente que altere specs, enfoque o tareas. La activación queda definida en `free-trial`.
