## Context

El dashboard del cliente (`/dashboard`) es un server component (`app/dashboard/page.tsx`) que ya carga `basicData`, `clientInfo` (incluye `plan`) y `subscription`. Hoy renderiza `NowPlayingDisplay` (client, polling 5s vía `/api/dashboard/streaming/status`, que incluye `icecast.listeners` para radio), `NowPlayingTvDisplay` (client, polling vía `/api/dashboard/television/status`), `PlanServicesCard` y `PaymentStatusCard`.

- Almacenamiento radio: `getStorageUsage(clientId)` en `lib/streaming-helpers.ts` (expuesto al cliente en `/api/dashboard/streaming/library/storage`).
- Almacenamiento TV: `getVideoStorageUsage(clientId)` en `lib/streaming-helpers.ts`.
- Espectadores TV: el agente los cuenta en `monitor.js` (`countVideoViewers`, lee el access log de Caddy por streamKey) y los reporta en `/api/admin/streaming-status`, pero `/api/video/:clientId/status` NO los incluye.
- Plan: `clientInfo.plan` ya está disponible en el server component.

Motivación y alcance: ver `proposal.md`. Requisitos de comportamiento: ver `specs/dashboard/overview-cards/spec.md`.

## Goals / Non-Goals

**Goals:**
- Tres cards de resumen al inicio del dashboard (oyentes, almacenamiento, plan).
- Eliminar `PlanServicesCard` de la página principal.
- Exponer espectadores de TV al cliente.

**Non-Goals:**
- No se modifica el reproductor/NowPlaying (solo se anteponen las cards).
- No se cambia la lógica de almacenamiento ni los planes.
- No se agregan permisos nuevos: es solo visualización en el dashboard del cliente.

## Decisions

### 1. Exponer espectadores de TV en el status de video del agente
Se agrega `viewers` al endpoint `/api/video/:clientId/status` del agente (`streaming/agent/routes/video.js`), reutilizando `countVideoViewers` (extraído a un helper compartido, p.ej. `streaming/agent/lib/video-viewers.js`, para no duplicar la lógica entre `monitor.js` y `video.js`). El dashboard ya llama a ese endpoint vía el proxy `/api/dashboard/television/status`, así que la card recibe `viewers` sin cambios en el proxy.

- **Alternativa considerada:** un endpoint nuevo en el panel que llame a `/api/admin/streaming-status`. Se descarta: ese endpoint es admin-only y devuelve todos los clientes; exponer viewers en el status del propio cliente es más directo y respeta el modelo de auth existente.
- **Impacto:** toca el agente → al desplegar hay que pulsar "Actualizar nodo" en cada nodo remoto.

### 2. Cards de resumen en el dashboard (server + client)
Se crea un componente contenedor `DashboardOverviewCards` (client component) que recibe por props lo que el server component ya tiene (plan, y URLs/ids) y obtiene los datos en vivo:
- **Oyentes**: radio vía `useStreamingStatus` (ya da `icecast.listeners`); TV vía fetch a `/api/dashboard/television/status` (con `viewers` tras el cambio del agente). Muestra TV solo si `plan.services` la incluye.
- **Almacenamiento**: se calcula en el server component (`app/dashboard/page.tsx`) con `getStorageUsage` y `getVideoStorageUsage` y se pasa a la card (los datos de storage no cambian en tiempo real, no hace falta polling).
- **Plan**: se pasa `clientInfo.plan` desde el server component.

Alternativa: 3 componentes separados. Se elige `DashboardOverviewCards` con sub-secciones para mantener la grilla de 3 cards cohesionada y reutilizable.

### 3. Eliminar `PlanServicesCard` del dashboard principal
Se quita `<PlanServicesCard plan={clientInfo?.plan as any} />` de `app/dashboard/page.tsx`. La card de plan de resumen la reemplaza. El componente `PlanServicesCard` queda sin uso en la página principal (no se borra el archivo, por si se usa en otra vista).

### 4. Datos en el server component
`app/dashboard/page.tsx` calcula en paralelo `getStorageUsage` y `getVideoStorageUsage` (solo si el plan incluye el servicio) junto con las queries existentes, y pasa a `DashboardOverviewCards`: `plan`, `usageRadio`, `usageVideo`.

## Risks / Trade-offs

- **Exponer viewers de TV toca el agente** → requiere "Actualizar nodo" tras el deploy. Mitigación: sin el campo, la card de TV muestra 0; el cambio es aditivo y no rompe.
- **Caddy log para viewers** → el conteo depende de que exista el access log y la ventana (30s); puede subestimar. Es el mismo mecanismo que ya usa el monitor admin.
- **Cards sin datos** → si el agente no responde, las cards muestran 0/"—" sin romper el dashboard (fallos silenciosos con try/catch).
