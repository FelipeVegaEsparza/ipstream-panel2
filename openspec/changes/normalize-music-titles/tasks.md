# Tasks

## 1. Normalizador compartido en el agente

- [x] 1.1 Crear `streaming/agent/lib/title-normalizer.js` con `normalizeTrackMetadata({ title, artist })`, aplicando las reglas del design (numeración inicial, `_`, sufijos técnicos/versiones entre paréntesis o corchetes, años, URLs y separadores sobrantes), y verificar que exporta `{ title, artist, changed }`.
- [x] 1.2 Agregar `streaming/agent/test/title-normalizer.test.js` con casos de: tag con `(Official Video) [HD]`, archivo `03_Mi_Banda_-_Otra_Canción.mp3`, versión `(Remix) (2021)`, texto ya limpio, valor que quedaría vacío y segunda pasada idempotente; verificar con `cd streaming/agent && npm test`.
- [x] 1.3 Documentar las reglas y ejemplos en un comentario de cabecera del módulo; verificar que `cd streaming/agent && npm test` sigue pasando.

## 2. Normalización automática en el upload

- [x] 2.1 Integrar `normalizeTrackMetadata` en `streaming/agent/routes/library.js` después de `readMetadata()`, guardando y devolviendo `title`/`artist` normalizados sin tocar `fileName` ni `album`.
- [x] 2.2 Extender las pruebas del agente para cubrir que el upload guarda el título normalizado y que `fileName` permanece igual; verificar con `cd streaming/agent && npm test`.

## 3. Endpoint de normalización por lote en el agente

- [x] 3.1 Implementar `POST /api/streams/:clientId/library/normalize` en `streaming/agent/routes/library.js` con `trackIds` opcional, universo `capsuleId IS NULL`, actualización solo de filas cambiadas, conteos `scanned/normalized/unchanged/failed` y auditoría `tracks_normalize`.
- [x] 3.2 Agregar pruebas del endpoint para selección explícita, biblioteca completa sin `trackIds`, idempotencia y aislamiento de un track fallido; verificar con `cd streaming/agent && npm test`.
- [x] 3.3 Verificar manualmente contra el agente local que `POST /api/streams/<clientId>/library/normalize` sin body procesa la biblioteca y devuelve los cuatro conteos.

## 4. Proxy del panel

- [x] 4.1 Agregar `streamingClient.normalizeTitles(clientId, trackIds?)` en `lib/streaming-client.ts` apuntando al endpoint del agente.
- [x] 4.2 Crear `app/api/dashboard/streaming/library/normalize/route.ts` con `requireStreamingClient`, chequeo de `hasRadioStream` y el mismo manejo de errores que las rutas de biblioteca existentes; verificar con `npx tsc --noEmit`.
- [x] 4.3 Probar la ruta del panel contra el agente local y confirmar que responde el resumen o un error mapeado (`no_radio_stream`, `agent_error`).

## 5. Botón "Normalizar título" en la biblioteca

- [x] 5.1 Agregar los textos `streaming.library.normalize`, `normalizing`, `normalizeConfirm`, `normalizeResult` y `normalizeError` en `lib/dashboard-i18n.ts` para español e inglés.
- [x] 5.2 Implementar el botón junto a "Buscar carátulas" en `app/dashboard/streaming/library/page.tsx`: usa `selectedTrackIds`, pide confirmación solo cuando procesará toda la biblioteca, muestra el resumen y recarga la lista.
- [ ] 5.3 Verificar en la UI que con selección procesa solo esos temas, sin selección procesa todos, y que el resumen muestra normalizados/sin cambios/fallidos.

## 6. Verificación de integración y deploy

- [x] 6.1 Ejecutar `npx tsc --noEmit` y `npm test` en la raíz; verificar que pasan sin errores.
- [x] 6.2 Ejecutar `cd streaming/agent && npm test`; verificar que toda la suite del agente pasa.
- [ ] 6.3 Probar el flujo completo en staging: subir un MP3 con sufijos, comprobar la limpieza automática, pulsar "Normalizar título" y confirmar que el locutor IA usa el nombre limpio.
- [x] 6.4 Recordar en el resumen del deploy que, por tocar `streaming/agent/*`, hay que pulsar **"Actualizar nodo"** en cada nodo remoto.

## 7. Corrección tras prueba en producción

- [x] 7.1 Ampliar las anotaciones parentéticas reconocidas (`Remasterizado`, `Con letra`, `En Directo`, `Gira`, `Audio`, `Extended`, `Mix`, `Videoclip`, etc.) y quitar tokens sueltos como `HD`, `1080`, `320kbps`; verificar con `cd streaming/agent && npm test`.
- [x] 7.2 Quitar el nombre del artista del título en formatos `Artista - Tema`, `Tema - Artista` y `Artista ft. Invitado - Tema`; verificar con casos reales de la biblioteca en los tests.
- [x] 7.3 Conservar subtítulos legítimos entre paréntesis que no son anotaciones (`(Tu Forma De Ser)`, `(I Just)`); verificar con `cd streaming/agent && npm test`.
- [ ] 7.4 Redeployar el agente, verificar en el servidor y pedir al cliente que pulse "Normalizar título" para reprocesar el catálogo existente.
