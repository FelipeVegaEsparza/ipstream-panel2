# Design

## Context

Ver `proposal.md` — Why. La nivelación actual usa `normalize(lufs=true, ...)`, que es un AGC dinámico. Aunque el target sea -16 LUFS, la ganancia se recalcula durante el track y produce bombeo. `normalize_track_gain` de Liquidsoap aplica una ganancia fija leída de metadatos del track.

## Goals / Non-Goals

**Goals:**

- Ganancia constante dentro de cada tema.
- Medición única por archivo y reutilización.
- Nivelación de biblioteca existente sin re-encodear.

**Non-Goals:**

- Cambiar la ecualización o la compresión artística de los temas.
- Normalizar la señal del DJ en vivo.
- Cambiar el encoder MP3 ni Icecast.

## Decisions

### 1. ReplayGain por track + `normalize_track_gain`

Se mide LUFS-I de cada archivo y se calcula:

```
gainDb = -16.0 - inputLufs
```

Se agregan los tags `replaygain_track_gain` y `replaygain_track_peak` al MP3 sin re-encodear (`ffmpeg -map 0 -c copy -metadata ...`). Liquidsoap usa `normalize_track_gain` sobre música y jingles.

**Spike validado:** Liquidsoap lee los tags, pero `normalize_track_gain` por defecto busca `liq_normalize_track_gain`. Se agrega al script:

```
settings.normalize_track_gain_metadata := "replaygain_track_gain"
```

Con eso aplica la ganancia del tag (probado: -26,0 LUFS → -23,8 LUFS con un tag de +2,11 dB).

### 2. Sin AGC en música

Se elimina `normalize` de música y jingles. `normalize_track_gain` no mueve la ganancia dentro del track. Si un archivo no tiene medición, no se aplica ganancia (queda pendiente de backfill), pero no se usa AGC dinámico.

### 3. Backfill de la biblioteca

Nuevo script del agente:

```
node scripts/backfill-loudness.js [clientId] [--all]
```

Recorre `tracks`, mide los que no tienen tags, los etiqueta y reporta cuántos quedaron pendientes. No re-encodea audio. Se puede correr por cliente o para toda la biblioteca.

### 4. TTS con ganancia estática

El post-proceso de TTS del panel deja de usar `loudnorm` dinámico. Se mide la loudness integrada del audio raw y se aplica:

```
volume=<gainDb>dB, alimiter=limit=0.95
```

El agente ya usa esta estrategia para hora/clima. El objetivo es -16 LUFS y -1.5 dBTP.

### 5. Limitador final

Se agrega `limit` al final del flujo de radio como protección de picos, sin AGC. No debe cambiar el volumen medio.

## Risks / Trade-offs

- [Liquidsoap no lee ReplayGain de MP3] → Spike previo; fallback a ganancia en DB + `amplify` por metadata.
- [Biblioteca grande tarda en medirse] → Batch por cliente, ejecutable en background; los tracks sin medir siguen sonando sin AGC.
- [Escritura de tags con `-c copy` puede alterar carátulas] → Probar con un archivo con cover y verificar que se conserva; si falla, usar DB + anotaciones.
- [TTS con ganancia estática puede quedar bajo si el raw es muy dinámico] → Limitador y clamp de ganancia ±12 dB.

## Migration Plan

1. Implementar medición/etiquetado y spike de Liquidsoap.
2. Cambiar el script a `normalize_track_gain`.
3. Cambiar el post-proceso TTS.
4. Deploy del agente.
5. Ejecutar backfill en el nodo principal y en cada nodo remoto.
6. Reiniciar streams y verificar un tema completo y una locución.
