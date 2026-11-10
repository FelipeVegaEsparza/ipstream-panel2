# Tasks

## 1. Modelo de datos y migración

- [x] 1.1 Agregar `NewsCapsule`, `NewsCapsuleSource`, `NewsCapsuleRule` y `NewsCapsuleRun` a `prisma/schema.prisma`, con `NewsCapsule.musicTrackId` opcional hacia `MusicTrack` e índices por cliente/estado; validar con `npx prisma validate`.
- [x] 1.2 Generar Prisma Client y aplicar el esquema en staging con `npx prisma db push --skip-generate`; verificar columnas e índices con `SHOW COLUMNS`/`SHOW INDEX`.
- [x] 1.3 Documentar en `AGENTS.md` el nuevo modelo, la sección y la obligación de “Actualizar nodo”.

## 2. Ingesta de fuentes RSS y URLs

- [x] 2.1 Agregar `fast-xml-parser` y `cheerio` y verificar que `npm install`, `tsc --noEmit` y `npm run build` pasen.
- [x] 2.2 Implementar validación de URLs (HTTP/HTTPS, bloqueo de loopback/privadas/link-local, límite de redirecciones, timeout y tamaño) con tests unitarios para URL válida, privada y con timeout.
- [x] 2.3 Implementar parser RSS/Atom que normalice título, fecha, GUID, medio y enlace; tests con fixtures de RSS y Atom, incluyendo feed vacío e ítem sin fecha.
- [x] 2.4 Implementar extracción de artículo desde URL (título, fecha, medio y párrafos con tope de caracteres); tests con HTML fixture y página sin contenido útil.
- [x] 2.5 Implementar deduplicación por URL/GUID/hash de resumen con ventana configurable y tests de repetición.
- [x] 2.6 Exponer `POST /api/dashboard/streaming/news-capsules/sources` autenticado, con rate limit y errores claros; tests de autorización, fuente inválida y éxito.
- [x] 2.7 Documentar formatos soportados, límites y fallback manual en `docs/news-capsules.md`.

## 3. Resumen, guion y audio con Locutor IA

- [x] 3.1 Implementar el resumen con `lib/deepseek.ts` (neutral, 500–700 caracteres, atribución y sin copia extensa) con tests de prompt y salida mockeada.
- [x] 3.2 Implementar composición `intro/body/closing` y edición del guion; tests de longitudes, atribución y validación de texto vacío.
- [x] 3.3 Implementar generación de audio reutilizando `synthesizePremiumTts` y el mixer existente, con cache de intro/cierre, música de fondo opcional y concatenación FFmpeg; tests con TTS/FFmpeg mockeados para audio con música, sin música y duración máxima.
- [x] 3.4 Implementar estimación y consumo de cuota (`getAiLiveAccess`/`consumeAiCharacters`) con tests de cuota suficiente, insuficiente y cache hit.
- [x] 3.5 Exponer endpoints de generar guion y generar audio con estados `draft/ready`, y tests de autorización, cuota y audio vigente.
- [x] 3.6 Implementar resolución y validación de la música elegida (activa, global o del cliente) y tests de pista inexistente, inactiva, de otro cliente, “sin música” y cambio de pista.
- [x] 3.7 Documentar el flujo de generación, música de fondo, cache y límites en `docs/news-capsules.md`.

## 4. Aprobación, programación y APIs del panel

- [x] 4.1 Implementar CRUD de cápsulas con estados `draft`, `approved`, `paused` y `error`, invalidando aprobación al editar; tests de transiciones.
- [x] 4.2 Implementar reglas `tracks`, `times` e `interval_hours` con ventana horaria, fechas, días, zona horaria, prioridad y cooldown; tests de validación y reglas superpuestas.
- [x] 4.3 Implementar aprobación obligatoria (audio vigente + preview) y pausa/reactivación; tests de intento sin audio, sin preview, cambio de guion/música posterior y nueva aprobación.
- [x] 4.4 Implementar cálculo de próxima emisión e historial de ejecuciones; tests con reloj simulado y zonas horarias.
- [x] 4.5 Crear `/dashboard/streaming/news-capsules` con lista, editor por pasos, fuente, guion, selector de música de fondo (misma biblioteca de jingles, con escucha y “sin música”), preview, aprobación y programación; tests de componentes para estados, elección de música y errores.
- [x] 4.6 Agregar el ítem al menú Radio e i18n es/en; test de navegación y textos.
- [x] 4.7 Documentar flujo de usuario y permisos en `docs/news-capsules.md`.

## 5. Agente: cola y emisión sin cortes

- [x] 5.1 Agregar `news_queue = request.queue(...)` y `fallback(track_sensitive=true, [news_queue, ...])` al generador `.liq`; test de que el script generado contiene la cola y conserva jingles/especiales.
- [x] 5.2 Implementar subida de audio de noticias del panel al agente y almacenamiento en `data/radio/<clientId>/news-capsules`; tests de ruta, archivo faltante y aislamiento por cliente.
- [x] 5.3 Implementar evaluador puro de reglas (temas, horas, intervalo, gracia, ventana, cooldown y prioridad) con tests de reloj simulado y cambios de hora.
- [x] 5.4 Implementar scheduler que empuja/retira solicitudes por telnet, omite si hay DJ en vivo y es idempotente tras reinicio; tests con agente y telnet mockeados.
- [x] 5.5 Reportar `played/skipped/expired` al panel y persistir `NewsCapsuleRun`; tests de callback y reintento sin duplicados.
- [x] 5.6 Actualizar documentación de nodos y el recordatorio de “Actualizar nodo” en `AGENTS.md` y `docs/news-capsules.md`.

## 6. Integración y verificación

- [ ] 6.1 Probar el flujo completo en staging: fuente RSS falsa → guion → música de fondo de la biblioteca → audio → aprobación → regla por temas y por hora → cola del agente → emisión al terminar el tema; documento de resultados.
- [x] 6.2 Verificar que cápsulas informativas, especiales y jingles existentes no cambian de comportamiento; correr tests del agente y del panel.
- [ ] 6.3 Verificar el comportamiento con DJ en vivo, tolerancia vencida, colisión de dos cápsulas y reinicio del agente; registrar resultados.
- [x] 6.4 Ejecutar `npm test`, `tsc --noEmit` y `npm run build`; documentar el plan de rollback (pausar cápsulas y vaciar la cola).
