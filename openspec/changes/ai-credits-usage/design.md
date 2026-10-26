# Design

## Context

Ver `proposal.md - Why` y `specs/ai/usage/spec.md` para la motivación y el comportamiento esperado.

La cuota actual se guarda en `AiTtsUsage` por `clientId` y período UTC (`YYYY-MM`), con `characters`, `requests` y `musicSeconds`. `lib/ai-live.ts` y `lib/ai-music.ts` son la fuente de verdad para límites y bloqueos, y `AiCreditsCard` ya muestra el total de caracteres en el dashboard.

Los consumos facturables están dispersos en cinco flujos: locución libre, clima/hora, presentador del AutoDJ, cápsulas IA y jingles IA. Antes de este cambio solo se incrementaban los totales mensuales, así que no existe detalle histórico por función. El panel ya usa páginas server con Prisma para estadísticas y un sidebar distinto para cliente y admin.

## Goals / Non-Goals

**Goals:**

- Registrar el detalle por función sin cambiar la semántica de cuota ni los totales existentes.
- Compartir una única capa de consulta/agregación entre la vista del cliente y la del administrador.
- Mostrar el desglose del mes actual y los totales del mes actual más los 6 meses anteriores.
- Etiquetar explícitamente el consumo previo al registro detallado como “Sin detalle histórico”.

**Non-Goals:**

- No se convierte el consumo en costo monetario (USD/CLP); solo se muestran caracteres y segundos/minutos.
- No se incluye la generación de noticias globales con IA ni otros usos administrativos que no descuentan la cuota de IA del cliente.
- No se reconstruye retroactivamente el detalle por función de meses anteriores.
- No se agregan APIs públicas ni cambios en los contratos de las rutas de generación.
- No se modifica el agente de streaming.

## Decisions

### Ledger de eventos separado de los totales de cuota

Se agrega `AiUsageEvent` con `clientId`, `period`, `feature`, `characters`, `musicSeconds` y `createdAt`. `AiTtsUsage` se mantiene intacto como fuente de verdad para la cuota y el bloqueo. El detalle se calcula sumando eventos y el remanente histórico se obtiene restando el detalle del total mensual.

Alternativas consideradas:

- Columnas por función en `AiTtsUsage`: menos flexible para agregados por cliente/función y difícil de extender.
- JSON en `AiTtsUsage`: no permite agregaciones eficientes en admin.
- Reemplazar `AiTtsUsage` por el ledger: obliga a recalcular cuotas y agrega riesgo a un flujo crítico.

### Funciones canónicas y registro obligatorio

Se define un catálogo central de funciones (`live-locution`, `live-announce`, `autodj-presenter`, `ai-capsule`, `ai-jingle`) y los consumidores pasan la función a `consumeAiCharacters` / `consumeAiMusicSeconds`. Las firmas nuevas reciben la función como parámetro obligatorio para que el compilador detecte cualquier flujo sin instrumentar.

Cada consumo escribe el total mensual y el evento de detalle dentro de una transacción. Si el audio viene de caché o la operación se rechaza por cuota, no se escribe ninguno de los dos.

### Capa de agregación compartida y páginas server

`lib/ai-usage.ts` construye:

- El rango de 7 períodos UTC (mes actual + 6 anteriores) usando `aiPeriod()`.
- Los totales mensuales del cliente o globales desde `AiTtsUsage`.
- Los agregados por período/función y, en admin, por cliente desde `AiUsageEvent`.
- La fila “Sin detalle histórico” cuando el total mensual supera la suma detallada.

Las vistas se implementan como páginas server (`/dashboard/consumo-ia` y `/admin/consumo-ia`) que pasan datos ya agregados a componentes de presentación. No se crean rutas API nuevas: se evita duplicar autorización y se mantiene el patrón de `app/admin/stats` y `app/dashboard/estadisticas` para lecturas.

La UI usa tarjetas, barras de progreso y tablas con los tokens del proyecto; no se agrega una librería de gráficos nueva.

### Ubicación en los menús

- Cliente: ítem **Consumo IA** en el grupo General, ruta `/dashboard/consumo-ia`. Se agrega un enlace “Ver detalle” en `AiCreditsCard`.
- Admin: ítem **Consumo IA** en el grupo Clientes y Pagos, ruta `/admin/consumo-ia`, junto a la gestión de planes y pagos.
- Se agregan las traducciones ES/EN y las etiquetas del menú admin.

### Autorización y aislamiento

El cliente usa `getEffectiveClient`, por lo que funciona también durante impersonación y siempre consulta su propio `clientId`. La página admin exige rol `ADMIN`, igual que el layout y las páginas de administración existentes. El ranking admin solo muestra clientes con consumo mayor que cero, ordenados por caracteres consumidos y luego por segundos de música.

## Risks / Trade-offs

- **Consumo previo sin desglose** → se muestra una fila “Sin detalle histórico”; no se inventan funciones.
- **Evento y total desincronizados si falla una escritura** → total y evento se escriben en una transacción.
- **Callers olvidan clasificar un consumo** → el parámetro de función es obligatorio y el typecheck falla.
- **Crecimiento de la tabla de eventos** → índice por `clientId/period` y por `period/feature`; el volumen esperado es bajo frente a las otras tablas del panel.
- **Diferencia entre la fecha de deploy y el inicio del mes** → el primer mes puede tener una porción sin detalle; la UI lo hace explícito.
- **Contexto de impersonación** → la vista cliente usa el cliente efectivo, no el usuario administrador.

## Migration Plan

1. Crear la migración `add_ai_usage_events` (tabla, índices y FK cascade).
2. Desplegar panel y PWA; no hay backfill de detalle ni cambios de entorno.
3. Rollback: eliminar la tabla de eventos; los totales de cuota en `AiTtsUsage` siguen funcionando sin cambios.

## Open Questions

Ninguna pendiente.
