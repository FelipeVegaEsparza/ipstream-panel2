## Why

El dashboard del cliente (`/dashboard`) muestra el reproductor actual (NowPlaying) y la tarjeta "Mi Plan" (PlanServicesCard, que lista secciones del plan en vez de datos útiles). El cliente no ve de un vistazo su estado de cuenta: cuántos oyentes tiene en vivo, cuánto almacenamiento le queda según su plan, y qué plan tiene contratado. Falta un resumen rápido al inicio del dashboard.

## What Changes

- **3 cards de resumen al inicio del dashboard** (antes de NowPlaying), en una grilla:
  1. **Oyentes en vivo**: oyentes de radio y espectadores de TV (TV solo si el plan lo incluye y hay transmisión).
  2. **Almacenamiento**: usado vs. disponible según el plan, para radio y/o TV según lo que incluya el plan.
  3. **Plan contratado**: nombre del plan, periodicidad (mensual/anual) y precio.
- **Eliminar la tarjeta "Mi Plan"** (`PlanServicesCard`) de la página principal del dashboard.

## Capabilities

### New Capabilities

- `dashboard/overview-cards`: resumen del dashboard del cliente (oyentes en vivo, almacenamiento usado/disponible según plan, y plan contratado) presentado en cards al inicio de la página.

### Modified Capabilities

- Ninguna: no existe spec previa del dashboard del cliente; el comportamiento nuevo queda en la capacidad `dashboard/overview-cards`.

## Impact

- **Dashboard UI**: `app/dashboard/page.tsx` agrega el bloque de 3 cards antes de `NowPlayingDisplay`, y quita `PlanServicesCard`.
- **Componentes nuevos** en `components/dashboard/`:
  - `DashboardOverviewCards` (o 3 componentes: `ListenersCard`, `StorageCard`, `PlanCard`).
- **Datos**: 
  - Oyentes radio: ya disponibles en `/api/dashboard/streaming/status` (`icecast.listeners`).
  - Espectadores TV: `/api/dashboard/television/status` no expone viewers hoy; hay que exponerlos (p.ej. agregar `viewers` al status de video del agente o un endpoint dedicado).
  - Almacenamiento: `getStorageUsage` (radio) y `getVideoStorageUsage` (TV) en `lib/streaming-helpers.ts`.
  - Plan: ya disponible en el server component (`clientInfo.plan`).
- **Agente (si se exponen viewers TV desde el status)**: `streaming/agent/routes/video.js` + `lib` de conteo de viewers (requiere "Actualizar nodo" en nodos remotos).
