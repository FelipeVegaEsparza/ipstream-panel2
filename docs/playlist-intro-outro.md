# Intro y cierre por playlist

Cada playlist puede tener una **introducción** y un **cierre** propios, además de sus temas. Son opcionales y no forman parte de la rotación de jingles.

## Modelo

- `jingles.kind` distingue:
  - `jingle`: jingles normales (rotación).
  - `playlist_intro`: intro de una playlist.
  - `playlist_outro`: cierre de una playlist.
- `playlists.introJingleId` y `playlists.outroJingleId` apuntan al audio correspondiente.
- Las intros/cierres **no aparecen** en `/dashboard/streaming/jingles` ni en `jingles.m3u`; se excluyen por `kind`.
- Al eliminar una playlist se elimina su audio propio si ninguna otra playlist lo referencia.

## Creación del audio

En el detalle de la playlist (`/dashboard/streaming/playlists/[id]`), cada bloque permite:

- **Subir audio**: MP3, máximo 50 MB, mismo pipeline que jingles (normalización/loudness y subida al nodo correcto).
- **Crear con IA**: reutiliza el wizard completo de jingles (texto, música, estilo, SFX y voz). El audio se guarda con el `kind` correspondiente y queda vinculado a la playlist.
- Escuchar, reemplazar y quitar.

## Reproducción

- La intro se reproduce **una vez al entrar** a la playlist, tanto por parrilla como por activación manual.
- El cierre se reproduce **una vez al salir** de la playlist: cambio manual, fin de franja o cambio a la playlist de respaldo.
- La música de la playlist sigue en loop entre la intro y el cierre; la intro/cierre no se repiten en cada vuelta.
- El orden de una transición es:
  **fin del tema actual → cierre de la playlist anterior → intro de la nueva → música de la nueva**.
- La transición se aplica en el **siguiente límite de tema**; no corta la canción en curso.
- La implementación usa una cola `transitions` de Liquidsoap, antes de `announcements` y de la música. Si un script antiguo no tiene `transitions`, se intenta `announcements` como compatibilidad.

## Operación

- Tocar `streaming/agent/*` obliga a **“Actualizar nodo”** en cada nodo remoto después del deploy.
- La migración `20261119010000_playlist_intro_outro` agrega `jingles.kind`, `playlists.introJingleId` y `playlists.outroJingleId`.
- En arranques en frío (stream detenido), la cola no existe hasta que Liquidsoap inicia; la intro puede no sonar hasta el primer límite de tema. Para garantizar la transición, el stream debe estar corriendo al activar/cambiar.
