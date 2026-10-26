# Proposal

## Why

Las cuotas de IA incluidas en el plan son mensuales y finitas. Cuando el cliente las agota pierde locuciones, presentador, cápsulas y jingles, y hoy no existe forma de venderle créditos adicionales ni de indicarle cómo obtenerlos. El administrador tampoco tiene un catálogo ni un registro de ventas de créditos IA.

## What Changes

- Agregar un catálogo de **paquetes adicionales de créditos IA** para caracteres TTS y para minutos de música IA, independiente de las cuotas del plan.
- Los créditos comprados **no vencen** y se consumen después de la cuota mensual del plan.
- El cliente puede ver los paquetes disponibles en **Consumo IA** y solicitar la compra de uno; el administrador confirma la venta y otorga los créditos.
- El administrador puede además otorgar un paquete directamente a un cliente sin una solicitud previa.
- Cada venta/otorgamiento registra un pago completado en el historial del cliente cuando corresponda.
- La cuota efectiva de todas las funciones de IA (locución libre, clima/hora, AutoDJ, cápsulas y jingles) incluirá los créditos adicionales disponibles.
- Mostrar un aviso de compra en la sección **Consumo IA** y en la tarjeta de créditos del dashboard cuando el saldo efectivo llegue a cero.
- Agregar al admin una sección de **Paquetes IA** con catálogo, solicitudes pendientes e historial reciente de otorgamientos.
- Registrar el saldo adicional por cliente y su consumo auditable por paquete.

## Capabilities

### New Capabilities

- `ai/credit-packs`: catálogo y venta de paquetes adicionales de créditos IA, solicitudes del cliente, otorgamiento por el administrador y consumo de saldos sin vencimiento.

### Modified Capabilities

Ninguna. El comportamiento base de cuotas por plan se mantiene, pero la cuota efectiva pasa a incluir los saldos adicionales.

## Impact

- **Base de datos**: nuevas tablas `ai_credit_packs`, `ai_credit_requests` y `ai_credit_grants`.
- **Cuotas**: `lib/ai-live.ts` y `lib/ai-music.ts` calculan el saldo efectivo y consumen primero la cuota del plan y luego los créditos adicionales; nuevas utilidades en `lib/ai-credits.ts`.
- **Dashboard cliente**: ampliar `/dashboard/consumo-ia` con saldos adicionales, catálogo de paquetes, solicitudes y aviso de compra; enlace desde `AiCreditsCard`.
- **Admin**: nueva sección `/admin/paquetes-ia` con CRUD de paquetes, solicitudes pendientes y venta/otorgamiento directo; enlace desde `Consumo IA` del admin.
- **Pagos**: las ventas de paquetes crean un `Payment` completado, sin suscripción, para que aparezcan en el historial del cliente.
- **Internacionalización**: textos ES/EN para catálogo, solicitudes, estados y avisos.
- **Tests**: saldos sin vencimiento, consumo plan → extras, solicitudes, aprobación/rechazo y aislamiento por cliente.
- No toca el agente de streaming ni requiere “Actualizar nodo”.
