# Design

## Context

Ver `proposal.md` para la motivación y `specs/radio/ai-reviews/spec.md` para los requisitos. Lo que importa del estado actual:

- El presentador IA se **pre-genera al aplicar** (`POST /api/dashboard/streaming/ai/autodj`): arma un texto por tema objetivo, lo sintetiza con `synthesizePremiumTts` y lo sube al agente como `ia-<n>-<trackId>.mp3`.
- El agente inserta cada intro **inmediatamente antes de su tema** en `playlist.m3u` (`streaming/agent/lib/liquidsoap.js`), buscando el `trackId` en el nombre del archivo. Por eso una intro sigue a su canción aunque la playlist se reordene.
- El camino `rotate(weights=…)` en `script-generator.js` quedó como código legado y no se usa para las intros; no se toca.
- La consola en vivo **prefetchea** la presentación un tema antes (`introPrefetchRef`) y la reproduce con `playAnnouncement(buffer, 0, 15)`.
- La cuota (`lib/ai-live.ts`) se descuenta **solo en cache miss de TTS**; el cache es por hash de texto + voz + modelo (`lib/elevenlabs-tts.ts`, `lib/fish-audio-tts.ts`).
- `lib/deepseek.ts` tiene el cliente HTTP, pero expone solo `generateNewsForCategory` con prompts de noticias.
- El agente tiene acceso a la base (lee `app_config`, escribe `play_history`) pero **no** tiene `DEEPSEEK_API_KEY` ni URL del panel.
- `probeAudioBufferDuration()` en `lib/audio-mix.ts` ya mide MP3 con `ffprobe` (lo usan cápsulas y la biblioteca de música).

## Goals / Non-Goals

**Goals:**

- Que la reseña sea una locución independiente, con frecuencia propia, sin tocar la presentación ni hora/clima.
- Que el audio quede anclado al tema por `trackId`, igual que las intros.
- Que el banco de reseñas sirva al AutoDJ y a la consola en vivo con la misma clave (artista + título), porque los temas de la consola son archivos locales sin id de base.
- Que un fallo de DeepSeek nunca tumbe la preparación del AutoDJ.

**Non-Goals:**

- Grounding externo (MusicBrainz, Wikipedia, Deezer). Decisión explícita: solo DeepSeek.
- Variantes de reseña por tema. Una por tema, repetible en cada vuelta de playlist.
- Reseña en vivo dentro del AutoDJ generada en runtime. Se descartó por dependencias del nodo y por colisión con la cola de announcements.
- Medición de calidad o edición colaborativa más allá de regenerar/desactivar.

## Decisions

### D1. Pre-generar al aplicar y anclar por `trackId`, no un scheduler en el agente

Se reusa el flujo de las intros: el panel decide qué temas llevan reseña (`i % every === 0`, `i > 0`), sintetiza y sube `rv-<n>-<trackId>.mp3`; el agente solo inserta **donde hay archivo**.

- **Por qué**: determinista. No hay latencia de DeepSeek al aire, no hay colisión con la cola `announcements` (hora, clima, locuciones libres), y no hace falta que el nodo tenga clave de DeepSeek ni URL del panel.
- **Alternativa descartada**: scheduler tipo hora/clima. Requiere que el agente llame a DeepSeek (clave en `app_config` o endpoint nuevo al panel) y compite por la misma cola de announcements. Se puede sumar después sin cambiar el modelo de datos.
- **Consecuencia**: el "cada X temas" se resuelve al aplicar. Si cambia la playlist, hay que volver a aplicar, como ya pasa con las intros.

### D2. Banco por cliente, clave `(clientId, kind, artistKey, titleKey, style)`

- **Por qué**: el audio es lo caro y el cache de TTS ya es global por hash de texto. Un banco global ahorraría llamadas a DeepSeek (centavos) pero obligaría a una tabla de overrides para que "desactivar" sea por cliente. Con banco por cliente, desactivar es un `active = false` local y no hay efectos cruzados.
- **Dos niveles**: `kind = 'track'` (dato del tema) y `kind = 'artist'` (bio corta). La reseña prefiere el dato del tema; si no hay, usa la bio del artista.
- **Normalización**: artista y título pasan por `sanitizeArtist`/`sanitizeTrackTitle` y luego a una clave sin acentos, minúsculas y sin puntuación, para que "Soda Stereo" y "soda  stereo" compartan fila.
- **El estilo va en la clave**: cambiar de estilo genera filas nuevas; las viejas se conservan pero no se emiten. Es el precio de que el estilo realmente cambie el texto.

### D3. El prompt devuelve JSON con `tipo` y `seguro`

`response_format: json_object` ya se usa en el cliente actual. La respuesta esperada:

```json
{ "texto": "…", "tipo": "descriptivo|historico|biografico", "seguro": true }
```

- **Descriptivo primero**: el prompt pide arrancar por sonido/estructura/época y solo usar historia si está seguro. `seguro=false` o `tipo` histórico sin confianza → se descarta y se reintenta en modo descriptivo.
- **Lista negra explícita** en el system prompt: fechas exactas, charts, premios, ventas, anécdotas puntuales, muerte, escándalos, política, religión, vida privada.
- **Dos aperturas**: el panel sabe si ese tema tiene intro (lo está generando en el mismo apply), así que arma el texto con `"Un dato sobre ese tema: …"` si hay intro, o `"Se viene «Título» de Artista. Un dato: …"` si no. Es una variante de plantilla, no dos prompts.

### D4. Tope de 20 s: texto corto + verificación con `ffprobe`

- El texto se corta a ~320 caracteres (≈ 20 s a ritmo normal).
- Después del TTS se mide con `probeAudioBufferDuration`. Si supera 20 s, se recorta en el último punto antes del límite y se sintetiza **una sola vez** más. Si sigue excediendo, la reseña se descarta.
- **Por qué no recortar el audio**: cortar un MP3 a los 20 s deja una frase a medias al aire.
- **Costo**: el re-TTS consume caracteres, pero solo en los casos que se pasan, y el texto recortado queda cacheado.

### D5. Un solo "Aplicar al AutoDJ" para intros y reseñas

Se extiende `POST /api/dashboard/streaming/ai/autodj` en lugar de crear un botón aparte: ya tiene la playlist, la frecuencia, el chequeo de cuota, el `restart` y la limpieza de archivos previos.

- La respuesta pasa a informar `generatedIntros` y `generatedReviews`.
- La limpieza incluye `clearAiReviews` cuando la frecuencia es 0 o el admin apagó la función.
- **Cuota**: el pre-chequeo suma los caracteres de las reseñas nuevas (las ya generadas para ese cliente suelen ser cache hit). Si no alcanza, se informa antes de generar. Si se agota a mitad de camino, se conservan las reseñas ya hechas y se informa cuántas quedaron.

### D6. Rutas del agente separadas de las intros

`/api/streams/:clientId/ai-reviews` (DELETE / POST upload / GET list) espeja las de intros, con directorio propio (`ai-reviews`) y prefijo `rv-`. Así el borrado de intros nunca toca reseñas y viceversa.

En `regenerateM3u`, por cada tema: si hay intro se empuja primero, si hay reseña se empuja después, y luego el tema. El orden `[intro][reseña][tema]` queda garantizado por construcción.

### D7. Consola en vivo: contador propio + lookup por artista/título

- `tracksSinceReviewRef` independiente de `tracksSinceIntroRef`.
- Cuando se cumple la frecuencia y hay próximo tema, la consola pide el texto a `POST /api/dashboard/streaming/ai/reviews/lookup` con `{ artist, title }` (sin id, porque los tracks son locales) y lo reproduce con `generateSpeech` + `playAnnouncement(buffer, 0, 20)`.
- **Por qué no reusar el endpoint de TTS directamente**: el texto tiene que salir del banco. El endpoint de lookup es el que consulta/genera y cachea.
- El prefetch de la reseña convive con el de la intro: si ambos tocan en el mismo tema, se resuelven en paralelo y se reproducen en orden intro → reseña.

### D8. Kill switch admin como columna, no como permiso de menú

`RadioStream.aiReviewAdminEnabled` (default `true`) se lee en el panel al configurar y en el agente al armar el m3u. No se usa el sistema de permisos de menú porque esto no oculta una sección: apaga una función en el aire.

## Risks / Trade-offs

- **Dato inventado al aire** → política descriptiva primero, flag `seguro`, lista negra de temas sensibles y lista de reseñas con desactivación individual antes de que suenen.
- **Repetición en cada vuelta de playlist** (mismas 4 reseñas con X=5 y 20 temas) → aceptado; el audio queda cacheado y no consume cuota. Si molesta, se agregan variantes sin cambiar el modelo.
- **Intro + reseña seguidas** pueden sumar ~40 s de habla → aceptado; la reseña abre con un conector para que suene a continuación, no a repetición.
- **Cambiar de estilo regenera todo** (nuevas llamadas a DeepSeek y TTS) → aviso en la UI antes de aplicar.
- **Playlist más corta que la frecuencia** → no se genera ninguna reseña; la UI lo informa en vez de fallar.
- **Nodo desactualizado** → sin el agente nuevo, las reseñas se suben pero no se insertan. Detectar por la marca de "Nodo desactualizado" que ya existe en `/admin/servers` y pedir "Actualizar nodo".
- **`ffprobe` en el contenedor del panel** → ya se usa en cápsulas y biblioteca de música, así que está disponible.

## Migration Plan

1. Migración Prisma aditiva: tabla `ai_reviews` y columnas `aiReviewEveryTracks` (default 0), `aiReviewStyle` (null), `aiReviewAdminEnabled` (default true). Nada se activa solo.
2. Deploy del panel + agente vía GitHub Actions (gate `verify`).
3. Pulsar **"Actualizar nodo"** en cada nodo remoto para que reciba el agente con `ai-reviews`.
4. El cliente activa la sección y pulsa "Aplicar al AutoDJ".
5. Rollback: poner la frecuencia en 0 (o el kill switch del admin en off) y reiniciar el AutoDJ. La tabla y las columnas quedan sin uso; no hay migración destructiva.

## Open Questions

- ¿La dirección de voz (`FISH_AUDIO_DIRECTIONS`) conviene que varíe por estilo? Se puede ajustar después sin cambiar specs ni modelo de datos.
