# Proposal

## Why

Hoy el cliente solo ve un total de caracteres de IA en la tarjeta del dashboard. No puede saber qué funciones consumen su cuota (locución libre, clima/hora, presentador del AutoDJ, cápsulas o jingles), ni cuánto se gasta en música IA, y el administrador no tiene una vista global del consumo por cliente. Esto dificulta controlar el gasto y explicar el agotamiento de la cuota.

## What Changes

- Registrar el consumo de IA con detalle por evento y por función, manteniendo los totales mensuales actuales como fuente de verdad para la cuota.
- Instrumentar todos los consumos de caracteres TTS y de música IA con una función identificable.
- Agregar una sección **Consumo IA** en el dashboard del cliente con:
  - Cuota vigente de caracteres y de música IA (asignada, usada, disponible).
  - Desglose del mes actual por función: locución libre, clima/hora, presentador AutoDJ, cápsulas IA y jingles IA.
  - Historial de totales del mes actual y los 6 meses anteriores.
- Agregar una sección **Consumo IA** en el admin con:
  - Totales globales del mes y desglose por función.
  - Ranking de clientes por consumo de caracteres y música IA.
  - Historial global del mes actual y los 6 meses anteriores.
- Marcar como “Sin detalle histórico” el consumo anterior a la incorporación del registro por función, para no falsear el desglose.
- Enlazar la tarjeta de créditos existente con la nueva vista de detalle del cliente.

## Capabilities

### New Capabilities

- `ai/usage`: registro del consumo de IA por función y presentación de cuotas, desglose e histórico para clientes y administradores.

### Modified Capabilities

Ninguna. La cuota y el bloqueo por límite siguen funcionando igual.

## Impact

- **Base de datos**: nueva tabla `ai_usage_events`; se mantiene `ai_tts_usage` para los totales y la cuota.
- **Backend**: `lib/ai-live.ts`, `lib/ai-music.ts`, `lib/capsule-ai-audio.ts` y las rutas de TTS, anuncios, AutoDJ, cápsulas IA y jingles IA para registrar la función de cada consumo.
- **Dashboard cliente**: nuevo ítem de menú y página de consumo IA; enlace desde `AiCreditsCard`.
- **Admin**: nuevo ítem en el sidebar y página global de consumo IA.
- **Internacionalización**: textos ES/EN para las nuevas vistas y menús.
- **Tests**: agregaciones, cálculo del remanente histórico y registro por función.
- No toca el agente de streaming ni requiere “Actualizar nodo”.
