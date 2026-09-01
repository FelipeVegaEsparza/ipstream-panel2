## Context

See proposal.md — Why. El reproductor/sitio de cada radio/TV consume la API pública (`/api/public/{clientId}`) y necesita saber qué playlist está "al aire" ahora y cuáles vienen después. El dato (tablas `playlist_schedules` / `video_playlist_schedules` + resolución de franja vigente por zona horaria) vive exclusivamente en el agente de streaming, en endpoints `schedule/current` protegidos entre panel y agente (Bearer token). El panel ya tiene rutas públicas con CORS (`/api/public/{clientId}/streaming`, etc.) que proxean al agente vía `lib/streaming-client.ts`.

## Goals / Non-Goals

**Goals:**
- Exponer `current` + `upcoming[3]` + `timezone` de la parrilla de radio y TV en la API pública.
- Resolver "ahora" y "siguientes" con la zona horaria del cliente en el agente (una sola fuente de verdad).
- Respuestas sin caché y con CORS, errores `502` consistentes con el dashboard si el agente falla.

**Non-Goals:**
- Exponer el CRUD de la parrilla (solo lectura).
- Cambiar el formato de `schedule/current` del dashboard (se extiende hacia atrás-compatible).
- Programación recurrente avanzada (bloques, prioridades, excepciones).

## Decisions

### 1. El agente computa `current` + `upcoming`
Los endpoints `GET /api/streams/:clientId/schedule/current` y `GET /api/video/:clientId/schedule/current` se extienden para devolver:

```json
{
  "current": { "id", "playlistId", "playlistName", "dayOfWeek", "startTime", "endTime" } | null,
  "upcoming": [ /* hasta 3 franjas activas ordenadas cronológicamente */ ],
  "timezone": "America/Santiago"
}
```

La lógica de ordenar las franjas "siguientes" (cruzando días de la semana y medianoche) se implementa en `streaming/agent/lib/time.js` como un helper reutilizable (p. ej. `getNextSlots(slots, now, timeZone, limit)`), compartido por radio y video.
- **Alternativa**: computar `upcoming` en el panel → descartada: duplica la lógica de zona horaria (`time.js`) y arriesga inconsistencia entre "ahora" y "siguientes".

### 2. Rutas públicas nuevas en el panel
Se crean dos rutas en `app/api/public/[clientId]/`:

- `schedule/current/route.ts` → `streamingClient.getCurrentSchedule(clientId)`
- `tv/schedule/current/route.ts` → `videoClient.getCurrentSchedule(clientId)`

Ambas con el mismo patrón que `/api/public/{clientId}/streaming`: `OPTIONS` + CORS (`lib/cors.ts`), `Cache-Control: no-store`, `dynamic = 'force-dynamic'`, y verificación de que el cliente existe (404). Si el agente falla (`StreamingAgentError`) → `502` con cabeceras CORS, igual que el dashboard.
- **Alternativa**: `video/schedule/current` en vez de `tv/...` → se eligió `tv` por ser el prefijo que ya usa el player (`/tv/{key}`) y la terminología del panel ("Televisión").

### 3. Sin cambios en `lib/streaming-client.ts`
Los métodos `getCurrentSchedule` ya existen y no llevan parámetros; como el límite de `upcoming` es fijo (3) y se resuelve en el agente, no se requiere modificarlos.
- **Alternativa**: pasar `?upcoming=N` → descartada por simplicidad; 3 es suficiente y evita exponer un parámetro configurable sin necesidad.

### 4. Respuesta de error y fallback
Si no hay franja vigente pero sí franjas activas: `current: null` + `upcoming` poblado. Si no hay ninguna franja: `current: null` + `upcoming: []`. Si el agente no responde: `502 { error }`. No hay fallback a estado de DB (no existe en DB local), a diferencia de `/streaming` que cae a `radioStream.currentTitle`.

## Risks / Trade-offs

- **Costo en el agente** → [Riesgo] el cálculo de "siguientes" cruza franjas y días; es una consulta simple sobre tablas pequeñas por cliente (máximo ~50 franjas), con cacheable de la query. Mitigación: el endpoint ya consulta todas las franjas activas del cliente; el costo adicional es ordenar en memoria.
- **Deploy de nodos** → [Riesgo] el cambio toca `streaming/agent/*`; los nodos remotos no se auto-actualizan. Mitigación: tras el deploy hay que pulsar **"Actualizar nodo"** en `/admin/servers` para cada nodo.
- **Compatibilidad hacia atrás** → [Riesgo] el dashboard consume `data.current`; la respuesta agregada (`upcoming`, `timezone`) es aditiva, no rompe consumidores existentes.

## Migration Plan

1. Implementar y desplegar el cambio en el panel (GitHub Actions) y el agente del VPS principal.
2. Pulsar **"Actualizar nodo"** en `/admin/servers` para cada nodo remoto.
3. Verificar con curl los endpoints públicos nuevos contra el panel de producción y contra un nodo.

## Open Questions

- Ninguna: el límite (3), el nombre de ruta (`tv/`), y el comportamiento de error quedaron fijados en el diseño y en la spec.
