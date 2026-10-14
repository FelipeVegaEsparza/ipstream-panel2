# Design

## Context

Ver `proposal.md` (Why). Estado actual relevante:
- `pwa_installs (clientId, deviceId)` se crea en la primera carga de la PWA vía `usePwaRegistration` → `ensurePwaRegistered` → `POST /api/public/[clientId]/pwa/register`. Mide **visitas**, no instalaciones.
- `install-prompt` ya detecta instalación con `detectStandalone()` (display-mode / `navigator.standalone`) y escucha el evento `appinstalled`, pero solo para la UI.
- `GET /api/dashboard/pwa-stats` devuelve `count(pwa_installs)`.
- `components/dashboard/PwaSubscribersCard.tsx` existe pero no se renderiza y usa gradientes fuera del sistema de marca.

## Goals / Non-Goals

**Goals:**
- Contar **instalaciones reales** por cliente, arrancando desde 0.
- Mostrar el número en el home del dashboard de cada cliente con el sistema de marca.

**Non-Goals:**
- Histórico/crecimiento en el tiempo, vista global del admin, y deduplicación de "personas" (se cuenta por dispositivo).

## Decisions

### D1. Señal de instalación sobre el registro existente
Extender `POST /api/public/[clientId]/pwa/register` para aceptar un flag opcional `installed: true` que marca el `installAt`. Se reutiliza el mismo `deviceId` y el registro previo; si el registro con `installed:true` llega antes que el normal, se hace upsert. Alternativa descartada: endpoint dedicado (más superficie, mismo dato).

### D2. Detección en la PWA
Reutilizar `detectStandalone()` y el evento `appinstalled`. Dos disparadores:
- Al cargar la app: si `detectStandalone()` es true, se reporta instalación.
- En runtime: al recibir `appinstalled`, se reporta.
La señal se envía una sola vez por dispositivo (flag en `localStorage`, igual patrón que `DEVICE_REGISTERED_PREFIX`). Se centraliza en `pwa/src/modules/pwa/register.ts` para que no dependa de que se renderice el `InstallPrompt`.

### D3. Persistencia y conteo
Nuevo campo `PwaInstall.installedAt DateTime?`. El conteo es `count(where: { clientId, installedAt: { not: null } })`. Las filas existentes quedan con `installedAt = null` y no cuentan → el número arranca en 0.

### D4. Visualización
Agregar una tarjeta "PWA instalada" a `DashboardOverviewCards` (pasa de 3 a 4 tarjetas, grid responsivo) usando tokens (`bg-card`, `border-border`, `text-muted-foreground`, `--brand-500`). Se retira o reescribe `PwaSubscribersCard` (hoy huérfano y con estilos viejos) para no dejar código muerto.

### D5. Alcance del endpoint
`GET /api/dashboard/pwa-stats` pasa a devolver `{ installedCount }` (o mantiene `count` con el nuevo significado). Requiere sesión de cliente (ya lo hace vía `getEffectiveClient`).

## Risks / Trade-offs

- **[localStorage borrado]** → el dispositivo genera un `deviceId` nuevo y vuelve a contar al reinstalar. Aceptado (no distinguimos personas).
- **[iOS no dispara `appinstalled`]** → se cubre por la detección standalone al abrir la app instalada.
- **[Endpoint público]** → el registro de instalación es público; podría inflarse. Mitigación futura: rate-limit por IP (el registro normal ya es público).
- **[Número arranca en 0]** → no se puede reconstruir el histórico; se documenta.
- **[Deploy]** → el cambio toca panel y PWA. El panel requiere deploy (schema + endpoint + UI); la PWA republica el bundle (`pwa/**`).

## Migration Plan

1. `prisma db push` agrega `installedAt` (nullable) — sin pérdida de datos.
2. Desplegar panel (endpoint + tarjeta) y republicar bundle de la PWA.
3. Verificar con un dispositivo: instalar, abrir la app instalada, confirmar que la tarjeta sube de 0 a 1; y que una visita en navegador no cuenta.
4. Rollback: revertir el commit; la columna nullable no rompe nada.

## Open Questions

- Nombre/ubicación final de la tarjeta y si "0" se muestra como número o como "sin instalaciones" (se resuelve en implementación, no cambia el contrato).
