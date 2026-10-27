# Proposal

## Why

La locución con ElevenLabs funciona, pero la calidad percibida es despareja: se pide MP3 128 kbps, se usan ajustes de voz fijos, la pronunciación de marcas/palabras en inglés depende del modelo y los jingles mezclan música y voz sin ducking real. Se puede mejorar la claridad, naturalidad y presencia de la voz sin aumentar los créditos consumidos, porque el costo depende de los caracteres del texto y las llamadas extra, no de la post-producción.

## What Changes

- Revisar y mejorar la cadena de TTS de ElevenLabs sin cambiar el modelo por defecto ni alargar el texto facturable:
  - Presets de calidad de voz (natural, estable, expresiva) con `stability`, `similarity_boost`, `style`, `use_speaker_boost` y, si el modelo lo soporta, `speed`.
  - Solicitar una salida de mayor calidad (lossless/PCM o MP3 192 kbps) cuando esté disponible, manteniendo el mismo texto y modelo.
  - Post-procesar el audio con high-pass, EQ de presencia, compresión suave, normalización de loudness EBU R128 y limitador antes de guardarlo.
  - Controlar pronunciación de marcas y palabras en inglés sin sumar caracteres facturables (diccionario de pronunciación o reemplazo fonético de longitud controlada).
- Mejorar la mezcla de jingles y cápsulas:
  - Ducking real de la música bajo la voz (sidechain), EQ separado para voz y música, compresión y normalización final.
  - Mantener la misma duración de música, el mismo texto y la misma cantidad de llamadas a ElevenLabs.
- Actualizar la clave de caché para incluir todos los ajustes de voz, formato y versión de post-proceso. Un cambio de calidad no debe regenerar dos veces el mismo texto.
- Exponer los presets/ajustes en el panel y respetar la voz elegida por cliente.
- Agregar pruebas de que el consumo de caracteres/música no aumenta y de que los cache hits no consumen créditos.

## Capabilities

### New Capabilities

- `audio/voice-quality`: calidad de locuciones y jingles de ElevenLabs, presets de voz, pronunciación, post-proceso, mezcla y garantía de consumo de créditos sin aumentos.

### Modified Capabilities

Ninguna.

## Impact

- **Panel / TTS**: `lib/elevenlabs-tts.ts`, `lib/premium-tts.ts`, `lib/elevenlabs-config.ts`, `lib/elevenlabs-voices.ts`, `lib/elevenlabs-models.ts`, configuración admin y settings de voz por cliente.
- **Jingles y cápsulas**: `lib/jingle-ai.ts`, `lib/capsule-ai-audio.ts`, rutas de generación y preview.
- **Datos**: posibles campos de preset/ajustes de calidad en `AppConfig` y `RadioStream`; migración Prisma si se persisten.
- **Consumo**: se mantiene el modelo por defecto, la longitud del texto facturable, la duración de música y el número de llamadas. La mejora es por ajustes de API, formato, DSP y mezcla.
- **Tests**: pruebas de cache, presets, mix, y comparación de contadores de caracteres/música antes y después.
- No toca el agente de streaming ni requiere "Actualizar nodo", salvo que el audio final se consuma desde el agente sin cambios (el agente solo recibe el archivo ya generado).
