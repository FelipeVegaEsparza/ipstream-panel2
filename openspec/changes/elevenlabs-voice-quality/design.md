# Design

## Context

Ver `proposal.md` — Why. El flujo actual relevante:

- `synthesizeElevenLabs` pide `mp3_44100_128`, usa `stability: 0.5`, `similarity_boost: 0.75`, `use_speaker_boost: true` y un `style` que sale de `RadioStream.aiVoiceStyle`.
- `premium-tts` resuelve voz global/cliente y proveedor; si falla ElevenLabs prueba Fish Audio.
- El cache actual se indexa por modelo, voz, estilo, idioma y texto, pero no por el resto de los ajustes ni por el post-proceso.
- Los jingles mezclan música y voz con volúmenes fijos, sin sidechain; las cápsulas bajan la música por tiempo, no por presencia de voz.
- ElevenLabs expone `voice_settings.speed`, `audio_effects` (sin costo extra), `pronunciation_dictionary_locators` y formatos MP3 192/PCM según el plan.
- El consumo del panel se calcula por caracteres (`consumeAiCharacters`) y segundos de música (`consumeAiMusicSeconds`), no por formato ni post-proceso.

## Goals / Non-Goals

**Goals:**

- Mejorar claridad, naturalidad y consistencia de la voz sin cambiar el modelo por defecto.
- Mejorar la mezcla de jingles/cápsulas con ducking real y mastering.
- Reutilizar cache existente cuando sea posible para no disparar regeneraciones.
- Mantener el mismo texto facturable, la misma duración de música y la misma cantidad de llamadas.
- Permitir presets globales y por cliente, con compatibilidad hacia atrás.

**Non-Goals:**

- Cambiar el modelo por defecto a uno más caro.
- Aumentar el texto enviado, la duración de música o la cantidad de llamadas a ElevenLabs.
- Rediseñar el sistema de planes/cuotas.
- Cambiar la voz por defecto de cada cliente sin acción del usuario.
- Implementar un editor completo de diccionarios de pronunciación en esta fase; sí se soportan locators configurados.

## Decisions

### 1. Presets de calidad en vez de parámetros sueltos

Nuevo módulo `lib/tts-quality.ts` con presets:

| Preset | stability | similarity | style | speaker boost | speed |
| --- | --- | --- | --- | --- | --- |
| natural | 0.45 | 0.80 | 0.15 | true | 1.00 |
| stable | 0.65 | 0.80 | 0.00 | true | 1.00 |
| expressive | 0.35 | 0.80 | 0.45 | true | 0.98 |

- `natural` es el preset global por defecto.
- `RadioStream.aiVoicePreset` puede sobrescribir el global. Si es `null`, hereda.
- `RadioStream.aiVoiceStyle` se conserva: si es mayor que 0, gana sobre el `style` del preset; si es 0, se usa el `style` del preset. Esto preserva la intención explícita del cliente.
- `speed` se envía solo si el modelo lo soporta; si la API lo rechaza, se reintenta sin `speed`.

**Por qué**: los presets son comprensibles para el usuario y evitan exponer cinco sliders técnicos. No cambian el modelo ni el costo.

**Alternativa descartada**: dejar los valores fijos. No permite adaptar la voz a la emisora ni resolver voces apagadas o demasiado inestables.

### 2. Formato de salida de mayor calidad con fallback

`elevenlabs-tts` pedirá `mp3_44100_192` cuando el plan lo permita. Si la API responde error de formato/tier, reintentará con `mp3_44100_128`. El archivo se guarda y se post-procesa a 192 kbps.

- No se cambia el texto ni el modelo.
- No se solicita una segunda generación por calidad: el reintento solo ocurre si el formato es rechazado y no hay audio.
- La elección de formato entra en la clave de cache.

**Alternativa descartada**: pedir PCM/WAV 44.1 kHz directamente. Requiere plan Pro y obliga a decodificar/recodificar; el beneficio marginal no justifica el costo de CPU para esta fase.

### 3. Cache en dos capas y compatibilidad con cache viejo

- **Capa raw**: audio tal como lo entrega ElevenLabs. Clave: modelo, voz, ajustes de voz resueltos, formato, idioma, diccionario y texto.
- **Capa procesada**: audio final post-procesado. Clave: hash del raw + versión de post-proceso + bitrate de salida.
- Antes de generar, se busca la clave raw nueva; si no existe, se busca la **clave legacy** actual (modelo, voz, style, idioma, texto). Si existe, se reutiliza como raw y se post-procesa sin llamar a ElevenLabs.
- Si el raw no existe en ninguna capa, se llama a ElevenLabs una vez y se guardan ambas capas.

**Por qué**: el cambio de post-proceso no debe regenerar textos ya cacheados. El cambio de preset sí puede requerir una generación nueva, pero solo cuando el texto se vuelva a pedir y no haya raw compatible.

**Alternativa descartada**: invalidar todo el cache. Generaría un pico de créditos y latencia.

### 4. Post-proceso con FFmpeg

Cadena base para locución:

1. `highpass=f=80` para quitar retumbe.
2. `equalizer` de presencia alrededor de 3 kHz (+1.5 a +2 dB).
3. `acompressor` suave (threshold ~-18 dB, ratio 2.5, attack 5 ms, release 80 ms).
4. `loudnorm=I=-16:TP=-1.5:LRA=11` y `alimiter=limit=0.95`.
5. Salida MP3 192 kbps, 44.1 kHz, estéreo.

Si FFmpeg falla, se devuelve el raw de ElevenLabs y se registra el error. El post-proceso solo corre en cache miss o cuando cambia la versión de procesamiento.

### 5. Pronunciación sin aumentar caracteres

- Se agregan campos opcionales en `AppConfig` para `pronunciationDictionaryId` y `versionId`.
- Si están configurados, se envían como `pronunciation_dictionary_locators`; el texto no cambia y no suma caracteres. Aplica a los modelos que soportan diccionarios.
- Si no hay diccionario, se mantiene `language_code: es` y `apply_text_normalization: "on"`.
- Se puede agregar un mapa de reemplazos fonéticos de longitud controlada, pero **solo** si el reemplazo no supera la longitud del texto original. Si lo supera, no se aplica.
- La documentación explicará cómo crear el diccionario desde ElevenLabs y pegar los IDs en el panel.

**Por qué**: la pronunciación de marcas/palabras en inglés se corrige sin alterar el texto facturable ni el modelo.

### 6. Mezcla de jingles y cápsulas

Nuevo filtro de mezcla compartido (`lib/audio-mix.ts` o equivalente):

- Música: high-pass, EQ suave y volumen base.
- Voz: high-pass, EQ de presencia, compresión.
- Sidechain: la voz controla un compresor sobre la música para bajarla solo cuando habla.
- Mezcla: `amix` sin normalización automática, `loudnorm` final a -16 LUFS, TP -1.5, limitador.
- Cápsulas: conservan la intro musical y usan el mismo sidechain durante la locución.
- La duración de música, el texto y las llamadas no cambian.

**Alternativa descartada**: seguir usando volúmenes fijos. La voz se pierde cuando la música tiene energía.

### 7. Configuración y UI

- `AppConfig`: `ttsQualityPreset` (default `natural`), `pronunciationDictionaryId`, `pronunciationDictionaryVersionId`.
- `RadioStream`: `aiVoicePreset` (nullable). `aiVoiceStyle` se mantiene.
- Admin `/admin/settings` → Locución: selector de preset global y campos de diccionario.
- Dashboard `/dashboard/streaming/locutor-ia`: selector de preset por cliente y texto de ayuda.
- `ElevenLabsSettings` y `LocutorIaSettings` muestran el preset efectivo.
- No se agrega preview automático que consuma créditos.

### 8. Garantía de consumo invariable

- El modelo por defecto no cambia.
- El texto enviado a ElevenLabs es el mismo que se factura al cliente; no se agregan caracteres por post-proceso.
- El diccionario no cuenta como caracteres.
- La música mantiene la misma duración y cantidad de llamadas.
- Los cache hits no llaman a ElevenLabs.
- Se agregan tests que comparan `consumeAiCharacters`/`consumeAiMusicSeconds` antes y después del cambio para el mismo texto/duración.

## Risks / Trade-offs

- **El plan no soporta MP3 192** → fallback automático a 128; la calidad mejora igual por DSP y mezcla.
- **El post-proceso agrega CPU** → solo en cache miss; el resultado se cachea y el raw se conserva.
- **Cambio de preset invalida cache raw** → se reutiliza cache legacy cuando existe; si no, se regenera solo el texto solicitado.
- **`speed` no soportado por el modelo** → se omite y se reintenta sin ese campo.
- **Diccionario no configurado** → se mantiene `language_code` y normalización; no se agregan caracteres.
- **FFmpeg falla** → se entrega el audio raw; la generación no se cae.
- **Doble normalización en jingles** → el mastering final se hace sobre la mezcla; la voz se procesa suave para no competir con la música.
- **El cliente tenía un `aiVoiceStyle` explícito** → se respeta cuando es mayor que 0; el preset solo completa lo no configurado.

## Migration Plan

1. Agregar campos de preset y diccionario a `AppConfig`/`RadioStream` con migración Prisma y defaults compatibles.
2. Implementar presets, formato, post-proceso y cache en dos capas.
3. Implementar la mezcla con sidechain y migrar jingles/cápsulas.
4. Actualizar settings admin, locutor IA y APIs de configuración.
5. Desplegar el panel. No requiere "Actualizar nodo": el agente recibe el MP3 final como hoy.
6. Verificar con textos ya cacheados que no haya llamadas nuevas; luego comparar contadores de caracteres/música antes y después con un texto nuevo.
7. Rollback: volver al preset/modelo anterior; el cache raw sigue disponible y los audios procesados no bloquean la reproducción.

## Open Questions

Ninguna que bloquee la implementación. La disponibilidad de `mp3_44100_192` y del diccionario depende del plan de ElevenLabs; el diseño ya define fallback.
