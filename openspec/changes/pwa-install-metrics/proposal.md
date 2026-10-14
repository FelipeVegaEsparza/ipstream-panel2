# Proposal

## Why

El panel ya registra dispositivos que **abren** la PWA, pero no distingue las **instalaciones reales**: el registro se dispara en cada primera carga con un `deviceId` aleatorio en `localStorage`, así que también cuenta visitas de navegador, incógnito o datos borrados. El resultado está sobreestimado (en producción un cliente de prueba acumula 132 "instalaciones") y no responde a la pregunta "¿cuántos dispositivos tienen la app instalada?".

## What Changes

- **Registrar instalación real**: la PWA envía una señal "instalado" cuando corre en modo standalone (`display-mode: standalone` / `navigator.standalone`) o cuando se dispara el evento `appinstalled`.
- **Persistir el estado**: nuevo campo `installedAt` en `pwa_installs`. El conteo pasa a ser la cantidad de filas con `installedAt` no nulo. **Arranca desde 0**: las filas existentes (visitas) no se marcan.
- **Endpoint**: `GET /api/dashboard/pwa-stats` devuelve la cantidad de **instalaciones** del cliente.
- **UI**: tarjeta "PWA instalada" en el **home del dashboard** de cada cliente (en `DashboardOverviewCards`), con tokens de marca. No se agrega a la sección de estadísticas por ahora.

## Capabilities

### New Capabilities
- `pwa/install-metrics`: detección y conteo de instalaciones reales de la PWA por cliente, y su visualización en el dashboard.

### Modified Capabilities
- (ninguna)

## Impact

- **Panel**: `app/api/public/[clientId]/pwa/register/route.ts` (o endpoint nuevo de señal), `app/api/dashboard/pwa-stats/route.ts`, `components/dashboard/DashboardOverviewCards.tsx`; posible reutilización/retiro de `components/dashboard/PwaSubscribersCard.tsx` (hoy huérfano).
- **PWA (`pwa/`)**: `src/modules/pwa/register.ts` y/o `InstallPrompt.tsx` para reportar la instalación al detectarla. Un cambio solo de `pwa/**` republica el bundle (workflow `deploy-site-bundle.yml`), no el panel.
- **DB**: cambio aditivo `PwaInstall.installedAt DateTime?`.
- **No-goals**: métricas de crecimiento histórico, vista global del admin, deduplicación de "personas" (se cuenta por dispositivo).
