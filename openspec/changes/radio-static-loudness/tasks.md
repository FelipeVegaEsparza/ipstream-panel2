# Tasks

## 1. Medición y etiquetado

- [x] 1.1 Crear el helper de loudness en el agente: medir LUFS-I con ffmpeg, calcular `gainDb = -16 - inputLufs` y clampear a ±12 dB.
- [x] 1.2 Agregar una función para escribir `replaygain_track_gain` y `replaygain_track_peak` sin re-encodear; verificar que un MP3 con carátula conserva audio y portada.
- [x] 1.3 Validar con Liquidsoap 2.4.5 que `normalize_track_gain` lee los tags; si no, documentar y aplicar el fallback de DB + anotaciones.

## 2. Script de radio

- [x] 2.1 Reemplazar `normalize` de música y jingles por `normalize_track_gain`.
- [x] 2.2 Mantener las locuciones fuera del AGC y agregar un limitador final al flujo.
- [x] 2.3 Actualizar las pruebas del generador de scripts y verificar con `liquidsoap --check`.

## 3. Biblioteca existente

- [x] 3.1 Crear `streaming/agent/scripts/backfill-loudness.js [clientId] [--all]` para medir y etiquetar tracks sin ganancia.
- [ ] 3.2 Ejecutarlo en un cliente de prueba y verificar que los tags quedan escritos y el audio no se re-encodea.
- [x] 3.3 Documentar el comando de backfill para nodos remotos.

## 4. TTS

- [x] 4.1 Cambiar `postProcessVoice` del panel a ganancia estática medida + limitador, sin `loudnorm` dinámico.
- [x] 4.2 Verificar que una locución con pausas mantiene volumen estable y no supera -1.5 dBTP.

## 5. Verificación y deploy

- [x] 5.1 Ejecutar `npx tsc --noEmit`, `npm test`, `cd streaming/agent && npm test` y `npx next build`.
- [ ] 5.2 Deployar y pulsar **"Actualizar nodo"** en los remotos.
- [ ] 5.3 Ejecutar el backfill y reiniciar streams en cada nodo.
- [ ] 5.4 Escuchar un tema completo, una hora/clima y una locución; confirmar que no hay bombeo.
