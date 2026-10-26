# Design

## Context

Ver `proposal.md - Why` y `specs/ai/credit-packs/spec.md` para la motivación y el comportamiento esperado.

La cuota de IA vive en `AiTtsUsage` por cliente y período UTC, con `characters`, `requests` y `musicSeconds`. `lib/ai-live.ts` y `lib/ai-music.ts` calculan el acceso y `consumeAiCharacters` / `consumeAiMusicSeconds` registran el consumo. El detalle por función ya se guarda en `AiUsageEvent`.

El panel ya tiene un catálogo de planes y pagos, un historial de pagos por cliente y una sección de Consumo IA. El cliente puede pagar la suscripción con PayPal o el admin puede registrar pagos manuales, pero no existe ningún concepto de créditos adicionales ni de solicitudes de compra.

## Goals / Non-Goals

**Goals:**

- Vender paquetes de caracteres y de música por separado, con catálogo administrado.
- Mantener saldos adicionales por cliente, sin vencimiento y auditables.
- Consumir primero la cuota del plan y luego los créditos adicionales en todos los flujos de IA.
- Permitir que el cliente solicite un paquete y que el admin confirme la venta.
- Registrar cada venta como pago completado en el historial del cliente.
- Avisar al cliente en Consumo IA y en la tarjeta del dashboard cuando no le quede saldo.

**Non-Goals:**

- No se procesan pagos online de paquetes: la venta la confirma el administrador.
- No se convierten monedas ni se calculan impuestos.
- No se otorgan créditos automáticamente por pago de suscripción.
- No se cambia la lógica de cuotas mensuales del plan ni el detalle por función existente.
- No se toca el agente de streaming.

## Decisions

### Tres modelos nuevos: catálogo, solicitud y otorgamiento

Se agregan:

- `AiCreditPack`: `name`, `description`, `creditType` (`characters` | `music`), `amount` (caracteres o minutos según el tipo), `price`, `currency`, `isActive`, `order`.
- `AiCreditRequest`: `clientId`, `packId`, `status` (`pending` | `approved` | `rejected`), `creditType`/`amount` y `price`/`currency` copiados al momento de solicitar, `note`, `paymentId` opcional, `resolvedBy` opcional, `resolvedAt`.
- `AiCreditGrant`: `clientId`, `packId`, `requestId` opcional único, `source` (`request` | `admin`), `characters`, `musicSeconds`, `remainingCharacters`, `remainingMusicSeconds`, `paymentId` opcional, `note`.

`Client` recibe las relaciones de solicitudes y otorgamientos. `AiCreditPack` recibe las relaciones de solicitudes y otorgamientos. Los montos del otorgamiento se guardan como snapshot para que editar un paquete no altere ventas pasadas.

Alternativa considerada: un único saldo por cliente sin ledger. Se descarta porque no permite auditar qué paquete se vendió, ni consumir FIFO ni mostrar historial de otorgamientos.

### Saldo adicional sin vencimiento y consumo plan → extras

`lib/ai-credits.ts` centraliza:

- `getAiCreditBalance(clientId)`: suma `remainingCharacters` y `remainingMusicSeconds` de los otorgamientos.
- `consumeExtraCharacters` / `consumeExtraMusicSeconds`: descuentan FIFO de los otorgamientos más antiguos dentro de una transacción y fallan si el saldo no alcanza.
- Helpers de otorgamiento y snapshot de paquetes.

`getAiLiveAccess` y `getAiMusicAccess` incorporan el saldo adicional a la cuota efectiva:

- `remaining` pasa a ser cuota restante del plan + saldo adicional.
- `used` sigue representando el uso del plan (capped al límite) para las tarjetas de cuota.
- Se exponen `extraRemaining` (caracteres) y `extraRemainingSeconds` (música) para la UI.
- Una cuenta solo puede usar extras si su plan tiene IA habilitada.

`consumeAiCharacters` y `consumeAiMusicSeconds` pasan a calcular, dentro de la transacción, cuánto corresponde al plan y cuánto al saldo adicional. El total mensual en `AiTtsUsage` y el evento de detalle se incrementan por el consumo completo; el saldo adicional se descuenta de los otorgamientos. Si el saldo adicional no alcanza, la transacción se revierte.

Alternativa considerada: sumar los extras al límite mensual. Se descarta porque los créditos deben sobrevivir al cambio de mes.

### Solicitud del cliente y venta del administrador

- El cliente solicita un paquete activo desde Consumo IA. Se crea `AiCreditRequest` en estado `pending` con snapshot de precio/moneda. No se otorga nada todavía.
- Se impide más de una solicitud pendiente por cliente y paquete.
- El administrador ve las solicitudes pendientes en `/admin/paquetes-ia` y puede aprobar o rechazar.
- Aprobar ejecuta una transacción: crea un `Payment` completado sin `subscriptionId`, con descripción `Paquete IA: <nombre>`, método y fecha; crea `AiCreditGrant` con origen `request`; marca la solicitud como aprobada y vincula el pago.
- Rechazar solo marca la solicitud como rechazada.
- El admin también puede vender/otorgar un paquete directamente desde la misma sección, creando el pago y el otorgamiento sin solicitud.

No se usa `markPaymentPaid` para estos pagos porque esa función activa suscripciones; los pagos de paquetes se crean ya completados y no tienen suscripción.

Alternativa considerada: emitir un `Payment` pendiente y esperar confirmación. Se descarta porque la venta de paquetes es una operación manual del admin y el pago se registra al confirmar la venta.

### UI de cliente y admin

- `/dashboard/consumo-ia` agrega:
  - Saldos adicionales de caracteres y música.
  - Catálogo de paquetes activos con precio, créditos y botón “Solicitar”.
  - Estado de las solicitudes del cliente.
  - Aviso destacado cuando la cuota efectiva es cero y hay paquetes activos.
- `AiCreditsCard` recibe un indicador de paquetes disponibles y muestra “Comprar más” cuando el saldo efectivo es cero.
- `/admin/paquetes-ia` incluye catálogo CRUD, solicitudes pendientes, venta directa e historial de otorgamientos. Se enlaza desde Consumo IA del admin.
- No se agregan gráficos nuevos; se usan tarjetas, tablas y formularios con los tokens existentes.

### Pagos y moneda

Cada paquete define un precio y una moneda fijos. El pago del paquete usa ese precio/moneda y el método indicado por el administrador. No hay conversión de moneda ni integración con PayPal para paquetes en esta iteración.

## Risks / Trade-offs

- **Dos consumos concurrentes agotan el saldo extra** → consumo y descuento ocurren en una transacción; si no alcanza, se revierte.
- **El total mensual incluye extras y puede superar el límite del plan** → las tarjetas muestran el uso del plan capped y el saldo extra por separado; el reporte histórico conserva el consumo total real.
- **Paquete editado después de una solicitud** → la solicitud guarda snapshot de precio/moneda y el otorgamiento guarda snapshot de créditos.
- **Pago de paquete activa una suscripción por error** → los pagos de paquetes se crean completados, sin `subscriptionId`, y no pasan por `markPaymentPaid`.
- **Paquete eliminado con ventas asociadas** → el catálogo solo permite desactivar; no se borran paquetes referenciados.
- **Cliente sin plan de IA compra un paquete** → los extras solo se consumen si el plan tiene IA habilitada; la UI lo muestra como saldo disponible pero la generación sigue bloqueada por el plan.
- **Crecimiento de otorgamientos** → índices por `clientId` y `createdAt`; el volumen es bajo y se consume FIFO.

## Migration Plan

1. Crear la migración con `ai_credit_packs`, `ai_credit_requests` y `ai_credit_grants`, índices y FK cascade.
2. Desplegar panel y PWA; no hay backfill de saldos ni cambios de entorno.
3. Rollback: eliminar las tres tablas. Los pagos ya creados permanecen en el historial, pero los saldos adicionales dejan de existir.

## Open Questions

Ninguna pendiente.
