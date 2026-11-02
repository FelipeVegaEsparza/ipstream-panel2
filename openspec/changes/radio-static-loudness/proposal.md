# Proposal

## Why

El AGC de Liquidsoap (`normalize`) sigue moviendo la ganancia dentro del mismo tema, incluso con ventana lenta. Eso produce el bombeo que el cliente escucha: la intro sube, el estribillo baja y el puente vuelve a subir. Para que un tema mantenga un volumen estable hay que aplicar una **ganancia estática por archivo**, no un control dinámico.

## What Changes

- Medir la loudness integrada (LUFS-I) de cada MP3 al subirlo y guardar una ganancia estática por track (ReplayGain).
- Reemplazar el `normalize` dinámico de música y jingles por `normalize_track_gain`, que aplica una sola ganancia constante durante todo el track.
- Agregar un proceso batch para medir y etiquetar la biblioteca existente.
- Cambiar el post-proceso de TTS del panel a ganancia estática medida + limitador, para evitar bombeo también dentro de locuciones.
- Mantener el TTS del agente con ganancia estática (ya implementado) y dejar un limitador final de picos.
- Objetivo: **-16 LUFS integrados**, true peak **-1.5 dBTP**.

## Capabilities

### New Capabilities

- `radio/static-loudness`: normalización estática por track para música, jingles y locuciones.

### Modified Capabilities

<!-- Ninguna: reemplaza la nivelación dinámica agregada en radio/loudness. -->

## Impact

- Agente: `streaming/agent/lib/script-generator.js`, nuevo helper de medición/etiquetado, `streaming/agent/scripts/backfill-loudness.js`, `Dockerfile` (ffmpeg ya incluido).
- Panel: `lib/elevenlabs-tts.ts` (post-proceso TTS), posible helper compartido de loudness.
- Biblioteca: tags ReplayGain en los MP3; sin cambio de esquema SQL.
- Nodos: requiere **"Actualizar nodo"**, reiniciar streams y ejecutar el batch de la biblioteca.
- No cambia la interfaz ni la lógica de negocio.
