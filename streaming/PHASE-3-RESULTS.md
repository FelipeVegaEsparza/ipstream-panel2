# Streaming — Resultados de Fase 3

**Fecha:** 2026-07-16
**Estado:** ✅ Validado
**Tiempo de ejecución:** ~1.5h

## Objetivo

Implementar el **CRUD completo** de la biblioteca de MP3s y de las
playlists. Validar el ciclo end-to-end: subir track → crear playlist →
agregar tracks → activar → ver stream con nueva música.

## Lo que se construyó

### Lib nuevas (agent)

| Archivo | Función |
|---|---|
| `lib/id3.js` | Lectura de ID3 con `music-metadata`, sanitización de filenames, detección de MP3 |
| `lib/files.js` | Helpers de filesystem: `saveMp3`, `deleteMp3`, `clientMp3Dir`, `uniqueFileName`, `isSafeFileName` |

### Routes nuevas (agent)

#### Library (CRUD de tracks)
| Método | Path | Función |
|---|---|---|
| `GET` | `/api/streams/:clientId/library` | Listar tracks |
| `POST` | `/api/streams/:clientId/library/upload` | Subir MP3 (multipart, lee ID3, guarda en FS + DB) |
| `PATCH` | `/api/streams/:clientId/library/:trackId` | Editar metadata (title, artist, album) |
| `DELETE` | `/api/streams/:clientId/library/:trackId` | Eliminar track (archivo + DB + cascade playlist_entries) |

#### Playlists (CRUD + entries + reorder)
| Método | Path | Función |
|---|---|---|
| `GET` | `/api/streams/:clientId/playlists` | Listar playlists con trackCount |
| `GET` | `/api/streams/:clientId/playlists/:id` | Detalle con entries |
| `POST` | `/api/streams/:clientId/playlists` | Crear playlist vacía |
| `PATCH` | `/api/streams/:clientId/playlists/:id` | Editar nombre/desc/shuffle/repeat |
| `DELETE` | `/api/streams/:clientId/playlists/:id` | Eliminar playlist + entries |
| `POST` | `/api/streams/:clientId/playlists/:id/activate` | Marcar como activa (desactiva otras) + regenera m3u |
| `POST` | `/api/streams/:clientId/playlists/:id/tracks` | Agregar track (al final) |
| `DELETE` | `/api/streams/:clientId/playlists/:id/tracks/:trackId` | Quitar track |
| `POST` | `/api/streams/:clientId/playlists/:id/reorder` | Reordenar tracks |

### Cambios de infra
- **Agent server.js**: registrado `@fastify/multipart` (50MB max) + nuevos routes

## Decisiones técnicas

1. **Upload via multipart estándar** (`@fastify/multipart`), no `request.file()` raw.
2. **Filenames únicos con timestamp** (`1700000000_my-song.mp3`) para evitar colisiones.
3. **Title fallback** al nombre del archivo si no hay ID3.
4. **Sanitización agresiva** de filenames (sin tildes, sin chars especiales, sin path traversal).
5. **Playlist activate** dentro de transacción (desactiva otras + activa la seleccionada).
6. **Auto-regenerar m3u** cuando se modifica la playlist activa (add/remove/reorder/activate).
7. **trackCount y totalDuration** se recalculan automáticamente en cada cambio.
8. **Delete track** borra el archivo y cascade-borra de todas las playlists (FK).
9. **Limit 50MB** por upload (`MAX_FILE_SIZE` en library.js).

## Pruebas realizadas (E2E completo)

### ✅ Upload de 3 MP3s

```bash
$ for f in test-upload track2 track3; do
    curl -X POST -H "Authorization: Bearer ..." -F "file=@${f}.mp3" .../library/upload
  done
{ "track": { "id": "trk_2ac5b500", "title": "...", "duration": 15, "fileSize": 241205 } }
# 3 tracks subidos
```

### ✅ Crear playlist + agregar tracks + ver detalle

```bash
$ curl -X POST .../playlists -d '{"name":"Mi Playlist","description":"..."}'
{ "playlistId": "pl_df874504" }

$ for tid in trk_a trk_b trk_c; do
    curl -X POST .../playlists/pl_df874504/tracks -d "{\"trackId\":\"$tid\"}"
  done
{ "entryId": "pe_10333cd5", "order": 1 }
{ "entryId": "pe_e60cd831", "order": 2 }
{ "entryId": "pe_30c9b03e", "order": 3 }

$ curl .../playlists/pl_df874504
{
  "name": "Mi Playlist",
  "trackCount": 3,
  "totalDuration": 45,
  "entries": [ {order:1,...}, {order:2,...}, {order:3,...} ]
}
```

### ✅ Reorder (drag&drop simulado)

```bash
$ curl -X POST .../reorder -d '{"trackIds":["trk_c","trk_b","trk_a"]}'
{ "ok": true }

# M3u regenerado en el nuevo orden:
$ docker exec liquidsoap cat /var/lib/radio/test_4fe56d37/playlist.m3u
/var/lib/radio/test_4fe56d37/mp3/1784250741683_test-upload.mp3   ← ahora primero
/var/lib/radio/test_4fe56d37/mp3/1784250751283_track3.mp3
/var/lib/radio/test_4fe56d37/mp3/1784250751225_track2.mp3        ← ahora último
```

### ✅ Activar playlist

```bash
$ curl -X POST .../playlists/pl_df874504/activate
{ "ok": true }
# isActive=1 en la playlist, m3u regenerado
```

### ✅ Restart stream (toca la nueva playlist)

```bash
$ curl -X POST .../start
{ "ok": true, "pid": 2486, "hasPlaylist": true }

# Verificar que el stream emite:
$ curl http://localhost:8000/test_b31024e8 -o /tmp/stream.mp3
$ ffmpeg -i /tmp/stream.mp3
  Audio: mp3, 44100 Hz, stereo, 128 kb/s
```

### ✅ Delete track (cascade + m3u auto-update)

```bash
$ curl -X DELETE .../library/trk_b5a4b0ee
{ "ok": true }

# M3u ahora con 2 tracks (no 3):
$ docker exec liquidsoap cat /var/lib/radio/test_4fe56d37/playlist.m3u
/var/lib/radio/test_4fe56d37/mp3/1784250741683_test-upload.mp3
/var/lib/radio/test_4fe56d37/mp3/1784250751283_track3.mp3

# El track eliminado ya no aparece en la playlist tampoco.
```

### ✅ Audit log completo

```
action             pl_name      fname                            createdAt
stream_restart     NULL         NULL                             01:12:51
stream_restart     NULL         NULL                             01:12:47
track_delete       NULL         "1784250751225_track2.mp3"        01:12:47
track_upload       NULL         "1784250751283_track3.mp3"        01:12:31
track_upload       NULL         "1784250751225_track2.mp3"        01:12:31
playlist_create    "Mi Playlist" NULL                            01:12:31
playlist_activate  NULL         NULL                             01:12:31
track_delete       NULL         "song-3.mp3"                      01:12:21
track_upload       NULL         "1784250741683_test-upload.mp3"   01:12:21
```

## Estado del sistema

- ✅ 5 contenedores healthy
- ✅ 5 tablas de streaming en MySQL
- ✅ 5 endpoints de library + 9 endpoints de playlists
- ✅ Stream emitiendo en `http://localhost:8000/test_b31024e8` con 2 tracks en loop
- ✅ Audit log registrando todas las acciones

## Próximos pasos (Fase 4)

- [ ] Cliente HTTP en el panel (`lib/streaming-client.ts`) que consume el agent
- [ ] API dashboard en Next.js (`/api/dashboard/streaming/*`)
- [ ] API pública (`/api/public/[clientId]/streaming/*`)
- [ ] Validación con Zod en el panel
- [ ] Manejo de errores y retry

## Comandos útiles

```bash
# Listar tracks
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/streams/$CLIENT/library

# Subir track
curl -X POST -H "Authorization: Bearer $TOKEN" -F "file=@song.mp3" \
  http://localhost:4000/api/streams/$CLIENT/library/upload

# Crear playlist
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Main","description":"...","shuffle":false,"repeat":true}' \
  http://localhost:4000/api/streams/$CLIENT/playlists

# Activar playlist
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/streams/$CLIENT/playlists/$PLAYLIST_ID/activate

# Reorder (drag&drop)
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"trackIds":["trk_1","trk_2","trk_3"]}' \
  http://localhost:4000/api/streams/$CLIENT/playlists/$PLAYLIST_ID/reorder
```
