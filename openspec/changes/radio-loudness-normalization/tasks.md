# Tasks

## 1. Normalización en Liquidsoap

- [x] 1.1 Envolver música, jingles, intros IA y locuciones con `normalize(lufs=true, target=-16.0)` en `script-generator.js`.
- [x] 1.2 Agregar una prueba del script generado que verifique los normalizadores de música/jingles; `cd streaming/agent && npm test` pasa.
- [x] 1.3 Normalizar el TTS automático de hora/clima con ganancia estática en el agente (`audio-normalize.js`) para evitar fluctuación dentro de la locución.

## 2. Verificación y deploy

- [x] 2.1 Regenerar un script de prueba y validarlo con `liquidsoap --check`.
- [ ] 2.2 Deployar el agente, pulsar **"Actualizar nodo"** en los remotos y reiniciar los streams.
- [ ] 2.3 Verificar en producción un corte música → hora/clima y un tema con locución.
