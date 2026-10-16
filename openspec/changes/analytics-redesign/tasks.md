# Tasks

Alcance resuelto: la analítica es una sección del panel del cliente (el admin conserva `admin/monitoring`); la ubicación geográfica se muestra tanto en la tab Radio como en la de TV.

## 1. Esquema de datos y dependencias

- [x] 1.1 Agregar `geoip-lite` y `ua-parser-js` a `streaming/agent/package.json` y verificar que `npm install` en `streaming/agent` termina sin errores
- [x] 1.2 Crear en `streaming/agent/server.js` las tablas `listener_samples`, `viewer_samples`, `listener_sessions`, `viewer_sessions`, `metrics_hourly`, `metrics_daily` con índices `(clientId, timestamp)` y `signature` único, y verificar que el agente arranca y loguea cada tabla asegurada
- [x] 1.3 Agregar los modelos Prisma de las tablas nuevas más `PlayHistory` y `VideoPlayHistory` (drift) y sus relaciones, y verificar con `npm run db:generate` que el cliente Prisma se regenera sin errores

## 2. Recolección de audiencia y sesiones (agente)

- [x] 2.1 Implementar el cron de muestreo de radio cada 60 s (Icecast `status-json.xsl`, filtrado por `serverId` propio) escribiendo `listeners`, `peak`, `bitrate`, `title`, `artist` y `online` para cada stream habilitado, con test unitario que cubra streams al aire y apagados
- [x] 2.2 Implementar el cron de muestreo de TV cada 60 s reutilizando el conteo de espectadores, escribiendo `viewers` y `online`, con test unitario
- [x] 2.3 Implementar el parser de sesiones de radio desde el access log de Caddy (`stream-access.log`) con firma idempotente (`ts+ip+mount+bytes+duration`) y filtrado de peticiones no-audio, con test sobre líneas de log de ejemplo (incluye duplicados)
- [x] 2.4 Implementar el parser de sesiones de TV desde el access log de Caddy (`access.log`, manifiestos `.m3u8`) con firma idempotente, con test sobre líneas de ejemplo
- [x] 2.5 Registrar los crons en el arranque/shutdown del agente y verificar en el log de arranque que los cuatro ciclos se inician y se detienen limpiamente

## 3. GeoIP y dispositivo

- [x] 3.1 Crear el wrapper de geolocalización local (`geoip-lite`) que devuelve país/ciudad y `null` para IPs no resolubles, con test para una IP pública conocida y una privada
- [x] 3.2 Crear la clasificación de dispositivo/navegador desde user-agent con `ua-parser-js`, con tests para móvil, escritorio, TV y user-agent desconocido
- [x] 3.3 Integrar geo y dispositivo en la inserción de sesiones y verificar que las sesiones nuevas quedan con país/ciudad y dispositivo, sin romper con datos faltantes

## 4. Rollups, zona horaria y retención

- [x] 4.1 Implementar el utilitario de cálculo de límites de bucket en la zona horaria del cliente (`Intl`, sin `CONVERT_TZ`) con tests que cubran el offset de `America/Santiago` y un día con cambio de horario
- [x] 4.2 Implementar el cron de rollup horario (UTC) agregando muestras y sesiones, con test que compare contra un conjunto de fixtures
- [x] 4.3 Implementar el cron de rollup diario alineado al día local del cliente, incluyendo `uniqueListeners`, con test que valide que un día local no se parte en dos buckets UTC
- [x] 4.4 Extender la retención (`lib/retention.js`) a capas: crudas 30 días, rollups 12-24 meses, con test que verifique los borrados por ventana
- [x] 4.5 Recalcular los `metrics_daily` de un cliente al cambiar su zona horaria, con test que verifique que los buckets previos se re-alinean

## 5. API de analítica (panel)

Nota: el panel no tiene runner de tests; por decisión del usuario, estas tareas se verifican con `npm run build`/revisión, no con tests unitarios.

- [x] 5.1 Crear `GET /api/dashboard/analytics/summary` (KPIs por servicio y período + variación vs período anterior), con test sobre rollups sembrados
- [x] 5.2 Crear `GET /api/dashboard/analytics/series` con granularidad hora/día, con test para un período corto y uno largo
- [x] 5.3 Crear `GET /api/dashboard/analytics/top` para canciones, artistas, DJs y videos (desde `play_history`, `video_play_history` y `dj_sessions`), con test
- [x] 5.4 Crear `GET /api/dashboard/analytics/heatmap` por día de la semana y hora en la zona del cliente, con test
- [x] 5.5 Crear `GET /api/dashboard/analytics/export` que devuelve CSV del período/servicio, con test de formato y escapado
- [x] 5.6 Verificar que todos los endpoints resuelven el cliente con `getEffectiveClient` y responden 401 sin sesión, con test de acceso denegado

## 6. Sección de estadísticas (UI)

- [x] 6.1 Crear la ruta `/dashboard/estadisticas` con tabs Radio | TV (TV solo si el plan la incluye) y verificar con `npm run build` que compila
- [x] 6.2 Implementar el selector de período/granularidad y las cards de KPIs con variación, verificando el render con datos y con variación no disponible
- [x] 6.3 Implementar la serie de tiempo (hora/día) con `recharts`, reutilizando tokens del sistema de marca, y verificar visualmente ambos períodos
- [x] 6.4 Implementar los rankings (canciones/artistas/DJs/videos) y el heatmap día×hora, verificando que las horas respetan la zona del cliente
- [x] 6.5 Implementar el botón de export CSV y verificar que descarga el archivo del período seleccionado
- [x] 6.6 Implementar el estado vacío del período sin datos y verificar que no rompe la vista
- [x] 6.7 Redirigir la ruta antigua `/dashboard/streaming/stats` a la nueva sección y verificar la redirección

## 7. Zona horaria en Datos básicos

- [x] 7.1 Mover `TimezoneSelector` a la página de Datos básicos y quitarlo de las parrillas de radio y TV, verificando con `npm run build` y revisión visual
- [x] 7.2 Verificar que la analítica usa `client.timezone` para los buckets, con test de API sobre un cliente con zona distinta de UTC

## 8. Infraestructura y documentación

- [x] 8.1 Agregar el log de acceso a archivo (`/data/access.log`) en `deploy/Caddyfile.node` y validar la sintaxis de la configuración de Caddy
- [x] 8.2 Documentar en `AGENTS.md`/`README.md` la nueva analítica, las dependencias y el recordatorio de pulsar **"Actualizar nodo"** en los nodos remotos tras el deploy

## 9. Limpieza

- [x] 9.1 Actualizar las vistas de admin que leen `radio_streams.listenerCount` para usar el estado en vivo existente y verificar que no quedan referencias muertas
- [x] 9.2 Dejar de escribir `stream_stats` y eliminar su modelo Prisma y relaciones, verificando con `npm run db:generate` y `npm run build`

## 10. Verificación de integración

- [x] 10.1 Ejecutar `cd streaming/agent && npm test` y `npm run lint`/`npm run build` en la raíz, verificando que todo pasa
- [x] 10.2 En un entorno con tráfico real, verificar de punta a punta que las sesiones y rollups de radio y TV aparecen en `/dashboard/estadisticas` con KPIs, series y rankings coherentes con lo observado
