# Parrilla horaria de playlists (Radio)

## Reglas

- Cada franja tiene una playlist, uno o varios **días de la semana**, hora de inicio y hora de fin.
- Los días se guardan en `playlist_schedules.daysOfWeek` como CSV (`1,2,3,4,5`). `dayOfWeek` conserva el primer día por compatibilidad con datos y consultas antiguas.
- La hora se evalúa en la **zona horaria del cliente** (`clients.timezone`).
- Si `endTime <= startTime`, la franja **cruza medianoche** y termina al día siguiente. Por ejemplo, miércoles `17:35 → 09:00` está activa el miércoles desde las 17:35 y el jueves hasta las 09:00. La interfaz lo muestra con `+1 día`.
- Para franjas multi-día con cruce de medianoche, la parte posterior a las 00:00 se evalúa usando el día anterior. Ejemplo: lunes a viernes `17:35 → 09:00` está activa el sábado de 00:00 a 09:00 (viene del viernes), pero no el domingo.

## Playlist de respaldo

Al iniciar una franja, el agente guarda en `radio_streams.scheduleFallbackPlaylistId` la playlist que estaba activa antes del cambio. Cuando ya no hay ninguna franja activa:

1. Restaura esa playlist de respaldo.
2. Limpia el campo.
3. Regenera el `.m3u` para que Liquidsoap la tome.
4. Registra `schedule_fallback` en `streaming_audit_logs`.

Si el panel se actualiza con una franja ya aplicada y el campo está vacío, el agente infiere el respaldo desde el último `schedule_switch` (`fromPlaylist`). Esto evita que la playlist programada siga sonando indefinidamente después de terminar la franja.

Si no hay respaldo, el agente no toca la playlist activa (comportamiento legado).

## Operación

- El cron del agente revisa todas las radios cada **30 segundos**.
- La UI está en `/dashboard/streaming/schedule`; el modal permite seleccionar varios días con checkboxes.
- Cambios en `streaming/agent/*` requieren pulsar **“Actualizar nodo”** en cada nodo remoto después del deploy.
- La migración `20261119000000_schedule_multiday_fallback` agrega `daysOfWeek` y `scheduleFallbackPlaylistId`.
