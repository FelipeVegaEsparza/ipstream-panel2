# Calidad de locución con ElevenLabs

Este documento describe la cadena de voz de locuciones, jingles y cápsulas, y
cómo se mantiene el consumo de créditos sin aumentos.

## Presets

El preset global se configura en **Admin → Configuración → Locución**. Cada
cliente puede heredarlo o elegir uno propio en **Locutor IA**.

| Preset | stability | similarity | style | speaker boost | speed |
| --- | --- | --- | --- | --- | --- |
| Natural | 0.45 | 0.80 | 0.15 | true | 1.00 |
| Estable | 0.65 | 0.80 | 0.00 | true | 1.00 |
| Expresiva | 0.35 | 0.80 | 0.45 | true | 0.98 |

`aiVoiceStyle` (0–100) sigue existiendo: si es mayor que 0, reemplaza el
`style` del preset. Si es 0, se usa el estilo del preset.

## Formato y post-proceso

- Se solicita `mp3_44100_192`. Si el plan no lo permite, se reintenta con
  `mp3_44100_128`.
- El audio se procesa con FFmpeg: high-pass, EQ de presencia, compresión suave,
  loudness EBU R128 a -16 LUFS, true peak -1.5 dBTP y limitador.
- Si FFmpeg falla, se entrega el audio original de ElevenLabs.

## Pronunciación

En **Admin → Configuración → Locución** se pueden pegar los IDs de un
diccionario de pronunciación de ElevenLabs y su versión. El diccionario no
cambia el texto enviado ni suma caracteres.

También existe un mapa fonético mínimo de reemplazos que solo se aplica si el
reemplazo no supera la longitud del texto original. Si lo supera, no se usa.

## Caché

Hay dos capas:

1. **Raw**: respuesta de ElevenLabs. Clave: modelo, voz, preset, formato,
   idioma, diccionario y texto.
2. **Procesada**: audio con post-proceso. Clave: hash del raw + versión de
   post-proceso + bitrate.

Si no existe la clave nueva, se busca el cache legacy (modelo, voz, estilo,
idioma, texto) y se post-procesa sin llamar a ElevenLabs. Un cambio de
post-proceso no regenera créditos; un cambio de preset sí puede requerir una
generación nueva, pero solo del texto solicitado.

## Jingles y cápsulas

`lib/audio-mix.ts` aplica:

- Ducking sidechain de la música bajo la voz.
- EQ y compresión separados para voz y música.
- Loudness final -16 LUFS, true peak -1.5 dBTP y limitador.
- Cápsulas con intro musical y cama baja durante la locución.

La duración de música, el texto y las llamadas a ElevenLabs no cambian.

## Consumo

La mejora no cambia el modelo por defecto, el texto facturable, la duración de
música ni la cantidad de llamadas. Los cache hits no consumen caracteres ni
segundos de música. No se agregan previews automáticos que gasten créditos.

## Verificación

```bash
npx tsc --noEmit
npm test
npm run build
```

Tests específicos:

```bash
npm test -- lib/tts-quality.test.ts lib/elevenlabs-tts.test.ts lib/audio-mix.test.ts lib/jingle-ai.test.ts lib/capsule-ai-audio.test.ts lib/elevenlabs-voices.test.ts
```

No toca el agente de streaming: el agente recibe el MP3 final como hoy.
No requiere "Actualizar nodo".
