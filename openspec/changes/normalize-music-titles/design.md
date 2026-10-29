# Design

## Context

Ver `proposal.md` — Why. La metadata de la biblioteca de radio vive en la tabla `tracks` del agente (`title`, `artist`, `album`, `fileName`, `filePath`). El upload lo procesa `streaming/agent/routes/library.js`: guarda el MP3, lee tags con `readMetadata()` (`streaming/agent/lib/id3.js`) y hace fallback al nombre de archivo (`parseFilename`). El panel solo reenvía el archivo vía `streamingClient.uploadTrack` y nunca toca la metadata.

El locutor IA arma las frases con `RadioStream.aiIntroPhrases` reemplazando `{{titulo}}` y `{{artista}}` con el `title`/`artist` de la pista; por eso la limpieza debe ocurrir en el agente, que es la fuente de verdad. Tocar el agente obliga a **"Actualizar nodo"** en los nodos remotos.

## Goals / Non-Goals

**Goals:**

- Un único algoritmo de normalización reutilizado por el upload y por la acción manual.
- Resultado idempotente y conservador: no inventa texto, no borra el nombre completo y no toca archivos ni tags.
- Acción manual por lote desde la biblioteca, con resumen de resultados.

**Non-Goals:**

- Reescribir tags ID3 o renombrar archivos.
- Normalizar la biblioteca global de jingles (`/admin/music`) ni la videoteca de TV.
- Corregir nombres con heurísticas de MusicBrainz o IA; solo limpieza determinística.
- Cambios de esquema o migraciones.

## Decisions

### 1. Módulo puro en el agente: `streaming/agent/lib/title-normalizer.js`

Exporta `normalizeTrackMetadata({ title, artist })` → `{ title, artist, changed }`. Sin I/O, fácil de testear con `node --test`.

Algoritmo, aplicado por separado a título y artista:

1. Normalizar Unicode (NFC), reemplazar `_` por espacio y quitar extensión de audio si aparece al final (`.mp3`, `.m4a`, etc.).
2. Quitar URLs y dominios (`http(s)://…`, `www.…`, `*.com/…`).
3. Quitar segmentos entre paréntesis/corchetes cuyo contenido coincida con anotaciones:
   - técnicos: `official video`, `video oficial`, `videoclip`, `audio`, `con letra`, `lyric(s)`, `letra`, `hd`, `hq`, `4k`, `1080p`, `720p`, `320kbps`, `128kbps`, `kbps`, `mp3`, `descarga`, `download`, `gratis`, `youtube`;
   - versiones: `remix`, `mix`, `version`, `edit`, `remaster`, `extended`, `live`, `en vivo`, `en directo`, `acústico`, `acoustic`, `cover`, `feat. …`, `ft. …`, `gira`, `tour`, `session`, `demo`;
   - año de 4 dígitos (`(2021)`, `[1998]`).
   Se conservan subtítulos legítimos sin palabras de anotación, como `(Tu Forma De Ser)`.
4. Quitar tokens técnicos sueltos (`HD`, `HQ`, `4K`, `1080`, `720`, `320kbps`) y anotaciones finales sin paréntesis (`Video oficial`, `Audio`, `Con letra`, `En vivo`, `feat. …`).
5. Quitar el nombre del artista del título cuando aparece como `Artista - Tema`, `Tema - Artista` o `Artista ft. Invitado - Tema`. Primero se comparan los segmentos con el campo artista (incluyendo listas separadas por coma) y luego se aplica un fallback para canales de YouTube donde el campo artista no coincide.
6. Quitar numeración de pista al inicio: `[01]`, `(01)`, `01.`, `01 -`, `01_`, `1 -` y números con cero inicial seguidos de espacio (`01 Tema`). Un número sin separador ni cero inicial (`30 Seconds to Mars`, `24 Horas`) se conserva para no mutilar nombres legítimos.
7. Quitar separadores sobrantes al inicio/fin (`-`, `–`, `—`, `.`, `_`) y colapsar espacios.
8. Si el resultado queda vacío, devolver el valor original.

Solo se eliminan segmentos reconocidos como anotaciones o el nombre del artista ya presente en su campo. No se cortan palabras sueltas ni sufijos no reconocidos, para evitar borrar títulos legítimos como “Live and Let Die”. Alternativa considerada: regex sobre el string completo; se descartó por agresiva y propensa a falsos positivos. Alternativa considerada: limpiar en el panel antes de enviar; se descartó porque el panel no ve la metadata y los nodos quedarían inconsistentes.

### 2. Normalización en el upload

En `streaming/agent/routes/library.js`, después de `readMetadata(filePath)`:

```js
const normalized = normalizeTrackMetadata({ title: meta.title, artist: meta.artist })
```

Se insertan `normalized.title` / `normalized.artist` en `tracks` y se devuelven en la respuesta. El `fileName` guardado no cambia. No se normaliza `album` (no lo usa el locutor y puede ser un nombre de disco legítimo).

### 3. Endpoint de normalización por lote en el agente

`POST /api/streams/:clientId/library/normalize`

Body opcional: `{ trackIds?: string[] }`.

- Sin `trackIds` (o array vacío): procesa todos los tracks del cliente con `capsuleId IS NULL` (mismo universo que lista la biblioteca).
- Con `trackIds`: limita el `WHERE id IN (…) AND clientId = ?`.
- Por cada track: normaliza `title` y `artist`; si `changed`, ejecuta `UPDATE tracks SET title = ?, artist = ?, updatedAt = NOW() WHERE id = ? AND clientId = ?`; si no, cuenta como sin cambios.
- Errores por track se capturan y cuentan como `failed`, sin abortar el lote.
- Respuesta: `{ ok: true, scanned, normalized, unchanged, failed }`.
- Registra un `streaming_audit_logs` con `action = 'tracks_normalize'` y el resumen.

Se procesa secuencialmente: el volumen esperado (catálogos de radios) es manejable y evita saturar el pool. Alternativa considerada: SQL masivo; se descartó porque la lógica es regex y debe vivir en un solo lugar testeable.

### 4. Proxy del panel y método del cliente

- `lib/streaming-client.ts`: `normalizeTitles(clientId, trackIds?)` → `POST /api/streams/:clientId/library/normalize` con body `{ trackIds }` solo si vienen ids.
- Nueva ruta `app/api/dashboard/streaming/library/normalize/route.ts`: valida `requireStreamingClient`, exige `hasRadioStream`, reenvía al agente y mapea errores como el resto de rutas de biblioteca.

### 5. UI en `/dashboard/streaming/library`

- Botón **“Normalizar título”** junto a “Buscar carátulas”, con estado de carga.
- Usa `selectedTrackIds`; si está vacío, llama sin `trackIds` (toda la biblioteca) y pide confirmación indicando el total. Si hay selección, procesa solo esos ids sin confirmación.
- Al terminar, muestra el resumen (`normalized`, `unchanged`, `failed`) en el mismo lugar que el resultado de carátulas y recarga la lista.
- Textos nuevos en `lib/dashboard-i18n.ts` (es/en): `normalize`, `normalizing`, `normalizeConfirm`, `normalizeResult`, `normalizeError`.
- El botón no usa colores nuevos: mismo patrón visual (`bg-brand` o `bg-secondary`) que los controles existentes.

## Risks / Trade-offs

- [Sobre-limpieza de títulos legítimos] → Solo se eliminan segmentos entre paréntesis/corchetes y numeración inicial; los tests cubren títulos con “Live”, “Cover” y años fuera de paréntesis.
- [Artista derivado del nombre de archivo con formato inusual] → Si `parseFilename` no detecta `Artista - Título`, el título queda completo y la normalización no inventa un artista; el cliente puede corregirlo con el editor existente.
- [Catálogos grandes] → Procesamiento secuencial con una actualización por track; si el volumen crece, se puede añadir paginación o job en background más adelante.
- [Nodos desactualizados] → El botón fallaría con 404 en nodos viejos hasta pulsar **“Actualizar nodo”**; se documenta en las tareas y en el aviso de deploy.
- [Pérdida de “feat.”] → Decisión del usuario (limpieza de versiones); es reversible con el editor manual de título/artista.

## Migration Plan

1. Deploy del panel y del agente por GitHub Actions.
2. Pulsar **“Actualizar nodo”** en cada nodo remoto para recibir el nuevo código del agente.
3. Sin migración de datos: la limpieza del catálogo existente es opcional y la ejecuta el cliente con el botón.
4. Rollback: revertir el commit y volver a desplegar; los títulos ya normalizados en la BD se mantienen (son datos, no esquema).
