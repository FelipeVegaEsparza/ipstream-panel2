## 1. Exponer espectadores de TV en el agente

- [x] 1.1 Extraer `countVideoViewers` de `streaming/agent/routes/monitor.js` a un helper compartido `streaming/agent/lib/video-viewers.js` (exportado).
- [x] 1.2 En `streaming/agent/routes/video.js`, el endpoint `/api/video/:clientId/status` incluye `viewers` del cliente (usando el helper).

## 2. Datos en el server component del dashboard

- [x] 2.1 En `app/dashboard/page.tsx`, calcular `getStorageUsage` y `getVideoStorageUsage` (según lo que incluya el plan) junto a las queries existentes.
- [x] 2.2 Pasar a `DashboardOverviewCards` los datos: `plan`, `usageRadio`, `usageVideo`.

## 3. Componente de cards de resumen

- [x] 3.1 Crear `components/dashboard/DashboardOverviewCards.tsx` (client) con 3 cards en grilla:
  - Oyentes en vivo (radio vía `useStreamingStatus`; TV vía `/api/dashboard/television/status` con `viewers`, solo si el plan incluye TV).
  - Almacenamiento usado/disponible (radio y/o TV según plan, "Ilimitado" si no hay cuota).
  - Plan contratado (nombre, periodicidad, precio; indica si no hay plan).
- [x] 3.2 Fallos silenciosos: si el agente no responde, mostrar 0/"—" sin romper el dashboard.

## 4. Integrar en el dashboard y eliminar "Mi Plan"

- [x] 4.1 En `app/dashboard/page.tsx`, renderizar `DashboardOverviewCards` antes de `NowPlayingDisplay`.
- [x] 4.2 Quitar `<PlanServicesCard ... />` de la página principal del dashboard.

## 5. Verificación final

- [x] 5.1 Verificar en el dashboard del cliente que las 3 cards aparecen antes de NowPlaying, que los oyentes de radio/TV se muestran, que el almacenamiento refleja el plan y que la card de plan es correcta.
- [x] 5.2 Verificar que la tarjeta "Mi Plan" ya no aparece en `/dashboard`.
- [x] 5.3 Ejecutar `tsc --noEmit`, `node --check` en los archivos del agente, y revisar `openspec validate` del cambio.
