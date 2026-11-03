# Proposal

## Why

El locutor IA ya presenta el tema que va a sonar, pero solo lo nombra: "ahora suena X de Y". No aporta nada que el oyente no pueda leer en el reproductor. Una reseña corta —un dato del artista o del tema— convierte la presentación en contenido y diferencia a la radio del resto del dial.

La integración con DeepSeek ya existe en el panel (`lib/deepseek.ts`, usada para noticias del admin) y la infraestructura de locuciones IA ya está probada: texto, TTS premium con voz del cliente, subida al agente y anclaje de cada audio a su `trackId` en la playlist. Falta conectar ambas cosas.

## What Changes

- Nueva sección **Reseñas IA** en `/dashboard/streaming/locutor-ia`, con activación opt-in, frecuencia **cada X temas** (0 = apagada) y selector de **estilo**: dato curioso, detrás de la canción, contexto histórico, biografía del artista.
- El panel genera el texto con **DeepSeek** y lo cachea por cliente + artista + título + estilo, en una tabla nueva `AiReview`. El estilo es parte de la clave: cambiarlo regenera.
- Política de contenido **descriptiva primero**: el prompt privilegia datos estructurales y sonoros (género, época, instrumentación, mood) y solo permite historia/biografía cuando el modelo declara confianza. Prohibido: fechas exactas, charts, premios, ventas, anécdotas puntuales y temas sensibles (muerte, escándalos, política, religión).
- El texto se sintetiza con el **TTS premium** del cliente (Fish Audio o ElevenLabs) y se acota a **20 segundos**. Si el audio excede el tope, se acorta el texto en el último punto y se regenera una vez.
- **AutoDJ**: cada reseña se sube al agente como `rv-<n>-<trackId>.mp3` y se inserta inmediatamente antes de su tema en `playlist.m3u`, después de la intro cuando ambas coinciden en el mismo tema.
- **Consola en vivo**: la reseña se suma a la locución de la consola con contador propio y prefetch, y se reproduce como announcement (máximo 20 s).
- **Kill switch de admin** por radio: si está apagado, el cliente no puede activar reseñas aunque tenga la opción configurada.
- El cliente ve la lista de reseñas generadas y puede **escuchar, regenerar y desactivar** cada una.
- **Cuota**: solo consume caracteres de TTS, y únicamente en cache miss. El texto de DeepSeek no se descuenta y una reseña repetida no vuelve a costar.

## Capabilities

### New Capabilities

- `radio/ai-reviews`: generación y cache de reseñas con DeepSeek, política de contenido, estilos, síntesis TTS con tope de 20 s, programación en el AutoDJ anclada al `trackId`, integración con la consola en vivo, control del cliente y kill switch de admin.

### Modified Capabilities

<!-- Ninguna: no existe spec previa del presentador IA ni de la consola en vivo. -->

## Impact

- **Panel**: `lib/deepseek.ts` (función genérica reutilizable), `lib/ai-reviews.ts` (nuevo), Prisma (`AiReview` + campos en `RadioStream`), rutas API de generación/listado/edición y de lookup para la consola, sección en `locutor-ia`, kill switch en `/admin/streaming`, hook `use-live-console.ts`, i18n.
- **Agente**: `lib/files.js` (directorio de reseñas), `routes/ai-intros.js` (subida/listado), `lib/liquidsoap.js` (inserción en `playlist.m3u` y limpieza) y tests. Tocar el agente obliga a pulsar **"Actualizar nodo"** en cada nodo remoto después del deploy.
- **Base de datos**: migración con `AiReview` y `RadioStream.aiReviewEveryTracks`, `aiReviewStyle`, `aiReviewAdminEnabled`.
- **Envs**: `DEEPSEEK_API_KEY` (ya existe) y `DEEPSEEK_MODEL` (opcional). Sin clave, la sección queda deshabilitada y el resto del locutor sigue igual.
- **Sin cambios** en facturación, dominios, TV ni en el formato de las locuciones de hora/clima.
