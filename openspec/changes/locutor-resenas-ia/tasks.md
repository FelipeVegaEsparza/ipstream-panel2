# Tasks

## 1. Modelo de datos

- [x] 1.1 Agregar `AiReview` (`clientId`, `kind`, `artistKey`, `titleKey`, `style`, `text`, `active`, `createdAt`, `updatedAt`, índice único por cliente+clave+estilo) y los campos `aiReviewEveryTracks`, `aiReviewStyle`, `aiReviewAdminEnabled` en `RadioStream` al `schema.prisma` — verificar con `npx prisma generate` y `npx prisma migrate dev --name ai_reviews` sin errores
- [x] 1.2 Revisar la migración generada para confirmar que es aditiva (sin `DROP`) y que los defaults dejan la función apagada — verificar leyendo el SQL de `prisma/migrations/*_ai_reviews/migration.sql`

## 2. Generación con DeepSeek

- [x] 2.1 Extraer en `lib/deepseek.ts` una función genérica de chat JSON reutilizable, dejando `generateNewsForCategory` usándola — verificar que los tests de noticias y `npx tsc --noEmit` pasan
- [x] 2.2 Crear `lib/ai-reviews.ts` con la normalización de claves (artista/título sin acentos, minúsculas, sin puntuación) — verificar con tests unitarios que "Soda Stereo" y "soda  stereo" producen la misma clave
- [x] 2.3 Implementar los prompts por estilo (dato curioso, detrás de la canción, contexto histórico, biografía) con la política descriptiva primero, la lista negra de temas y las dos aperturas (con intro / sin intro) — verificar con tests que arman el prompt esperado por estilo y por variante de apertura
- [x] 2.4 Implementar el parseo y la validación de `{ texto, tipo, seguro }`, con descarte de contenido prohibido y reintento en modo descriptivo — verificar con tests de respuesta válida, `seguro=false`, tipo histórico sin confianza, JSON inválido y texto con fecha/cifra
- [x] 2.5 Implementar el recorte por oración al límite de caracteres — verificar con tests de texto corto (sin cambios), texto largo con punto útil y texto sin puntos (corte duro)

## 3. Banco y API del panel

- [x] 3.1 Implementar el alta/consulta de reseña en el banco por cliente + clave + estilo, con reutilización de filas existentes y respeto de `active` — verificar con tests de creación, reutilización y reseña desactivada
- [x] 3.2 Extender `GET/PUT /api/dashboard/streaming/ai/config` con `reviewsEnabled`, `reviewEvery` y `reviewStyle`, validando rango y estilo permitido — verificar con tests de ruta para valores válidos, fuera de rango y estilo desconocido
- [x] 3.3 Crear `GET /api/dashboard/streaming/ai/reviews` (lista con tema y estado) y `PATCH /api/dashboard/streaming/ai/reviews/:id` (activar/desactivar) con control de pertenencia al cliente — verificar con tests de listado, desactivación y acceso a una reseña de otro cliente
- [x] 3.4 Crear `POST /api/dashboard/streaming/ai/reviews/:id/regenerate` que pide texto nuevo a DeepSeek y reemplaza el anterior — verificar con test que el texto cambia y el audio viejo se invalida
- [x] 3.5 Crear `POST /api/dashboard/streaming/ai/reviews/lookup` que recibe `{ artist, title }`, devuelve el texto del banco (generándolo si falta) y funciona sin id de track para la consola — verificar con tests de hit, miss y tema sin artista o título
- [x] 3.6 Ajustar el manejo de cuota para que solo cuente caracteres de TTS, con pre-chequeo de las reseñas nuevas e informe de faltante — verificar con tests de cuota suficiente, insuficiente y reseña cacheada sin consumo

## 4. AutoDJ y panel del cliente

- [x] 4.1 Extender `POST /api/dashboard/streaming/ai/autodj` para seleccionar los temas con reseña (`i % every === 0`, `i > 0`), generarlas, subirlas y limpiar las anteriores cuando corresponda — verificar con tests de selección de posiciones, frecuencia 0, admin apagado y playlist más corta que la frecuencia
- [x] 4.2 Implementar la síntesis de reseña con tope de 20 s: TTS, medición con `probeAudioBufferDuration`, recorte de texto y un reintento — verificar con tests de audio dentro del tope, audio excedido y audio que sigue excediendo (descarte)
- [x] 4.3 Garantizar que un fallo de DeepSeek o del TTS de un tema no aborte la preparación y que la respuesta informe `generatedIntros` y `generatedReviews` — verificar con test de fallo parcial
- [x] 4.4 Agregar la sección **Reseñas IA** en `components/dashboard/streaming/locutor-ia/LocutorIaSettings.tsx` (activación, cada X temas, selector de estilo, lista con tema/texto, reproducir, regenerar, desactivar) usando los tokens de marca — verificar manualmente en claro y oscuro que no hay colores crudos y que las acciones llaman a las rutas correctas
- [x] 4.5 Agregar las claves de i18n en español e inglés para la sección y sus mensajes de error — verificar que `dashboardT` resuelve todas las claves nuevas en ambos idiomas
- [x] 4.6 Documentar la sección Reseñas IA en `README.md` (qué hace, frecuencia, estilos, tope de 20 s, cuota) — verificar leyendo la sección y comprobando que coincide con la UI

## 5. Agente de streaming

- [x] 5.1 Agregar el directorio de reseñas y el listado de archivos `rv-*` en `streaming/agent/lib/files.js` — verificar con test unitario de parseo del nombre y orden
- [x] 5.2 Crear `streaming/agent/routes/ai-reviews.js` (listar, subir, borrar) y registrarlo en `server.js`, espejando las rutas de intros — verificar con tests de ruta de subida, listado y borrado
- [x] 5.3 Insertar las reseñas en `regenerateM3u` después de la intro y antes del tema, ancladas por `trackId`, y omitirlas si la frecuencia es 0 o el admin las apagó — verificar con test del m3u generado para los casos: solo reseña, intro+reseña, y sin reseña
- [x] 5.4 Limpiar los archivos `rv-*` al desactivar la función o al volver a aplicar — verificar con test de limpieza y con `npm test` del agente en verde
- [x] 5.5 Actualizar `AGENTS.md` con la nota de que tocar el agente por reseñas obliga a **"Actualizar nodo"** en los nodos remotos — verificar leyendo la sección de Streaming / Nodos

## 6. Consola en vivo

- [x] 6.1 Pasar `reviewEnabled`, `reviewEvery` y `reviewStyle` desde la página de la consola a `LiveConsole` y `use-live-console` — verificar con test de que los props llegan y que un valor 0 mantiene la función apagada
- [x] 6.2 Implementar el contador independiente `tracksSinceReview` y el prefetch de la reseña del próximo tema vía lookup — verificar con tests de que el contador de presentación no se altera y de que el prefetch se dispara una sola vez por tema
- [x] 6.3 Reproducir la reseña con `generateSpeech` + `playAnnouncement(buffer, 0, 20)` y registrarla en el historial — verificar con test de que el tope de 20 s se aplica y de que el historial recibe la entrada
- [x] 6.4 Mostrar en la consola el estado de la próxima reseña (indicador discreto con los temas restantes) — verificar manualmente que se actualiza al avanzar la cola

## 7. Control del administrador

- [x] 7.1 Agregar el interruptor de reseñas por radio en `/admin/streaming` con su API de actualización — verificar manualmente que persiste y que se refleja al recargar
- [x] 7.2 Hacer que el interruptor apagado bloquee la configuración del cliente, la generación y la inserción en el m3u — verificar con tests de ruta (403 al configurar) y de agente (m3u sin reseñas)
- [x] 7.3 Verificar que al volver a habilitar se respeta la configuración previa del cliente — verificar con test de ida y vuelta del interruptor

## 8. Integración y despliegue

- [x] 8.1 Correr el gate completo: `npx tsc --noEmit`, tests del panel y `cd streaming/agent && npm test` — verificar que todo pasa sin warnings nuevos
- [ ] 8.2 Probar en staging el flujo completo con frecuencia 5: aplicar, confirmar archivos `rv-*` en el agente, orden `[intro][reseña][tema]` en el m3u y escucha de una reseña real de ≤20 s — verificar con la salida del contenedor y una escucha del stream
- [ ] 8.3 Probar el apagado: frecuencia 0 y kill switch del admin, confirmar que no suena ninguna reseña y que las intros siguen — verificar con dos reinicios del AutoDJ
- [ ] 8.4 Verificar en `/admin/servers` la marca de nodo desactualizado y documentar el paso de **"Actualizar nodo"** para los remotos — verificar que el estado cambia después de actualizar un nodo
