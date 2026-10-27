# Tasks

## 1. Presets y configuración

- [x] 1.1 Crear `lib/tts-quality.ts` con los presets natural/stable/expressive y la resolución global→cliente, respetando `aiVoiceStyle` cuando sea mayor que 0; verificar con tests unitarios de resolución y defaults.
- [x] 1.2 Agregar `ttsQualityPreset`, `pronunciationDictionaryId`, `pronunciationDictionaryVersionId` a `AppConfig` y `aiVoicePreset` a `RadioStream`, con migración Prisma y defaults compatibles; verificar con `npx prisma validate` y aplicando la migración en local.
- [x] 1.3 Exponer los nuevos campos en `/api/admin/app-config` y `/api/dashboard/streaming/ai/config`; verificar con tests de lectura/escritura y que los valores ausentes usen el preset global.

## 2. Calidad del TTS

- [x] 2.1 Actualizar `lib/elevenlabs-tts.ts` para pedir `mp3_44100_192` con fallback a `mp3_44100_128`, enviar los ajustes del preset y omitir `speed` si el modelo no lo soporta; verificar con tests que simulan aceptación y rechazo del formato.
- [x] 2.2 Implementar cache en dos capas (raw y procesada) con clave que incluya preset, formato, diccionario y versión de post-proceso, reutilizando el cache legacy cuando exista; verificar que un cache hit no llama a ElevenLabs y que el cache viejo se post-procesa sin generar.
- [x] 2.3 Implementar el post-proceso FFmpeg (high-pass, EQ, compresión, loudnorm, limitador, 192 kbps) con fallback al raw si falla; verificar con un test del filtro y una prueba de audio que no haya clipping.
- [x] 2.4 Soportar `pronunciation_dictionary_locators` desde la configuración y un mapa fonético de longitud controlada; verificar que un reemplazo más largo que el original se descarta y que el texto facturable no cambia.

## 3. Mezcla de jingles y cápsulas

- [x] 3.1 Crear un helper de mezcla compartido con ducking sidechain, EQ de voz/música, compresión, loudnorm y limitador; verificar con tests del filtro y una prueba auditiva de voz sobre música.
- [x] 3.2 Integrar el helper en `lib/jingle-ai.ts` y `lib/capsule-ai-audio.ts` manteniendo duraciones, textos y llamadas actuales; verificar que el jingle y la cápsula se generan y que el frame final no tiene clipping.
- [x] 3.3 Verificar que la mezcla no ejecuta llamadas adicionales a ElevenLabs ni consume música/caracteres extra; cubrirlo con mocks de las llamadas y los contadores.

## 4. Panel y configuración de usuario

- [x] 4.1 Agregar selector de preset global y campos de diccionario en `/admin/settings` → Locución; verificar que guarda/carga y que el panel compila.
- [x] 4.2 Agregar selector de preset por cliente en `/dashboard/streaming/locutor-ia` y mostrarlo en la UI de jingles; verificar que el cliente sin preset hereda el global.
- [x] 4.3 Documentar presets, diccionario, cache, formatos y garantía de créditos; verificar que la documentación coincide con los defaults y campos reales.
- [x] 4.4 No agregar previews automáticos que consuman créditos; verificar que generar una locución sigue siendo una acción explícita.

## 5. Verificación y despliegue

- [x] 5.1 Ejecutar `npx tsc --noEmit`, `npm test` y `npm run build`; corregir errores.
- [x] 5.2 Comparar el consumo de caracteres/música para un mismo texto y duración antes/después del cambio; verificar que no aumenta y que un cache hit deja los contadores iguales.
- [ ] 5.3 Desplegar el panel y verificar en producción que una locución nueva usa el preset, que un texto cacheado no dispara una llamada nueva y que el resultado no tiene clipping.
- [x] 5.4 Confirmar que no se toca el agente ni se requiere "Actualizar nodo", porque el agente solo recibe el archivo final.
