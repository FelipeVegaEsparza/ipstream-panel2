# Design

## Context

Ver `proposal.md - Why`. El proyecto ya tiene:

- `InfoCapsule` y `ClientInfoCapsule` para cápsulas informativas subidas/pregeneradas, con `capsulePlayEvery`/`capsulePlayCount` insertadas de forma estática en el `playlist.m3u`.
- `synthesizePremiumTts` (ElevenLabs/Fish), cuotas `AiTtsUsage`, cache TTS y `addCapsuleIntro`/`mixMusicAndVoice` para agregar cama musical.
- `lib/deepseek.ts` para generación de texto y `lib/specials.ts` como precedente de guiones + audio + programación.
- Agente con Liquidsoap (`script-generator.js`), callbacks `track-started`, cola de eventos y scheduler de locuciones (`ai-announcement-scheduler.js`).
- Los nodos remotos no se actualizan solos: el agente nuevo exige “Actualizar nodo”.

La programación actual de cápsulas se hornea en el m3u y no puede cumplir reglas por hora. La nueva sección necesita una cola en tiempo de ejecución y no puede reutilizar el contador estático sin cambios.

## Goals / Non-Goals

**Goals:**

- Crear cápsulas desde RSS/URL o noticias manuales, con intro y cierre fijos editables, una o varias noticias separadas, resumen IA de hasta 300 caracteres por noticia y audio único, con música de fondo opcional de la biblioteca de jingles.
- Programar por temas, horas exactas y cada N horas, con zona horaria, ventana y fechas.
- Emitir solo entre canciones, con tolerancia, prioridad, cooldown y sin interrumpir DJ en vivo.
- Preview y aprobación obligatorios, historial y próxima emisión.
- Reutilizar TTS/cuotas/mixer existentes.

**Non-Goals:**

- No reemplaza las cápsulas informativas existentes ni su selector en la consola en vivo.
- No lee ni reproduce artículos completos; solo resumen breve con atribución.
- No agenda cortes duros ni interrumpe canciones.
- No agrega un segundo proveedor de voz ni un editor de audio multipista.
- No implementa RSS en el agente: la ingesta es del panel.

## Decisions

### 1. Modelo separado, motor compartido

Crear `NewsCapsule`, `NewsCapsuleSource`, `NewsCapsuleRule` y `NewsCapsuleRun`. No reutilizar `InfoCapsule` como tabla principal para evitar que las noticias aparezcan en la biblioteca de cápsulas viejas o se inserten dos veces por el m3u estático.

El audio final se guarda como archivo MP3 y se sube al agente con un endpoint nuevo de noticias (mismo patrón que especiales/jingles). Se reutilizan `synthesizePremiumTts`, `mixMusicAndVoice`/`addCapsuleIntro`, cuotas y cache.

**Alternativa considerada:** extender `InfoCapsule` con `source='news'`. Se descarta porque mezcla semánticas de programación estática y dinámica y complica la migración.

### 2. Ingesta RSS/URL en el panel

- `fast-xml-parser` para RSS/Atom y `cheerio` para extraer título, fecha, medio y párrafos de una URL.
- Guardar solo metadatos, extracto corto y resumen; no persistir el artículo completo.
- Deduplicar por URL/GUID/hash de resumen durante una ventana configurable.
- Límites: 8 s de timeout, 2 MB de descarga, 3 redirecciones.
- SSRF: solo HTTP/HTTPS, resolver DNS y bloquear loopback, privadas, link-local y metadatos cloud.
- Si falla, el editor permite texto manual.

**Alternativa considerada:** scraping con un servicio externo. Se descarta para no agregar dependencia operativa ni enviar contenido a terceros.

### 3. Resumen y guion

- `lib/deepseek.ts` genera un resumen neutral de hasta 300 caracteres con atribución y sin copiar párrafos extensos.
- El guion se compone de `intro`, `body`, `closing` editables. Intro y cierre usan frases de la emisora; el cuerpo incluye el resumen y la fuente.
- El cliente puede editar cualquier parte. Editar invalida `approvedAt` y pausa las reglas.

### 4. Audio y música de fondo

- `intro` y `closing` se generan con la voz del Locutor IA y se cachean por cliente/versión de frase.
- cada noticia se sintetiza por separado y se cachea por hash de texto/voz; el orden es intro → noticias → cierre.
- La cápsula puede referenciar una `MusicTrack` activa de la misma biblioteca que usan los jingles (globales del admin + pistas del cliente). La selección es opcional.
- La música elegida se mezcla con la locución en el panel con `mixMusicAndVoice` (cama baja, ducking y carve de voz) y queda incorporada al MP3 final. La emisión reproduce el audio ya mezclado y no consulta la biblioteca en el agente.
- Se concatenan intro/cuerpo/cierre, se mezcla la música si existe y se normaliza a un MP3 único (objetivo 45–90 s; máximo 120 s).
- Cambiar la pista elegida invalida `approvedAt` y el audio anterior. Si la pista está inactiva o no pertenece al cliente, la generación falla antes de sintetizar con un error accionable.
- La cuota se estima con la longitud de los tres textos antes de generar; se descuenta solo en cache miss. La música no consume cuota de IA.

### 5. Emisión con `request.queue` y `fallback(track_sensitive=true)`

El `.liq` del AutoDJ expone una fuente `news_queue = request.queue(...)` y la coloca por encima de la música:

```
news_queue = request.queue(id="news-queue")
autoDj = fallback(track_sensitive=true, [news_queue, baseSource])
```

El agente inserta una solicitud con `news-queue.push file:///.../<capsuleId>.mp3` (orden telnet registrada con el `id` de la cola) cuando una regla está lista. La evaluación se filtra por `radio_streams.serverId` para que cada nodo empuje solo sus propios streams. `track_sensitive=true` hace que Liquidsoap espere al final del track actual; no corta la canción. Si la cola queda vacía, sigue la música normal.

- El agente evalúa reglas cada 10–15 s y en cada `track-started`.
- Para reglas por temas, cuenta tracks desde la última emisión usando `play_history`/estado persistido.
- Para horas y cada N horas, calcula la próxima marca en la zona horaria del cliente.
- Si el DJ en vivo está activo, no empuja; la cápsula se omite o se reevalúa dentro de la tolerancia.
- Al expirar la tolerancia, el agente retira la solicitud pendiente y registra `skipped` con motivo.
- `NewsCapsuleRun` guarda `scheduledFor`, `pushedAt`, `playedAt`, `status`, `reason` y `trackId`; se usa para idempotencia tras reinicios.

**Alternativa considerada:** insertar las cápsulas en el m3u como las informativas. Se descarta porque no permite horas ni intervalos y obliga a regenerar/reiniciar.

**Alternativa considerada:** cortar el track al llegar la hora. Se descarta por requisito explícito de no interrumpir.

### 6. Prioridad y colisiones

- La cola de noticias tiene prioridad sobre jingles y cápsulas del m3u en el mismo corte, pero solo se empuja si no hay otra noticia ya encolada.
- `priority` (1–10) y `minGapMinutes` deciden entre cápsulas; una por corte.
- Si el corte ya trae un especial o cápsula informativa, la noticia puede sonar antes; el especial continúa después. Si la regla exige exclusividad, se omite y se registra.
- Reglas superpuestas de la misma cápsula se deduplican por ventana de ejecución.

### 7. API y UI

Nueva página `/dashboard/streaming/news-capsules` en el grupo Radio:

- Lista con estado (borrador, aprobada, programada, pausada, error), próxima emisión y última emisión.
- Editor en pasos: fuente → resumen/guion → música de fondo opcional → audio/preview → aprobar → programación.
- El selector de música reutiliza `GET /api/dashboard/streaming/jingles/music` para listar globales + propias y muestra un botón de escucha por pista; “Sin música” es una opción explícita.
- APIs: CRUD, fetch de fuentes, generar guion, generar audio, aprobar, pausar, historial y “próxima emisión”.
- El botón Aprobar exige `audioUrl` vigente y `previewedAt`; cambios posteriores invalidan.
- Toda la UI usa tokens de marca y no modifica la consola en vivo.

**Alternativa considerada:** pestaña dentro de `/dashboard/info-capsules`. Se descarta porque el usuario pidió una sección propia y los flujos son distintos.

### 8. Datos propuestos

- `NewsCapsule`: cliente, título, estado, fuente, intro/cierre, `musicTrackId` opcional, audio, duración, versión, `approvedAt`, prioridad, cooldown, ventana/fechas, zona horaria.
- `NewsCapsuleItem`: noticia ordenada con título, URL/medio, texto de trabajo y resumen de hasta 300 caracteres.
- `NewsCapsuleSource`: URL, medio, título, fecha, GUID y extracto usado.
- `NewsCapsuleRule`: `tracks | times | interval_hours`, configuración JSON, días, activa.
- `NewsCapsuleRun`: programación, empuje, reproducción, estado, motivo, track.

## Risks / Trade-offs

- **Scraping/RSS frágil** → fallback a texto manual, errores claros y pruebas con feeds reales.
- **Derechos de autor** → solo resumen corto, atribución visible y responsabilidad del cliente (ya cubierta por la declaración legal).
- **Alucinaciones de IA** → preview y aprobación obligatorios; el cliente edita antes de programar.
- **Cola de Liquidsoap y reinicios** → `NewsCapsuleRun` idempotente, reaper de solicitudes vencidas y deduplicación por ventana.
- **Costo de IA** → estimación previa, cache de intro/cierre/cuerpo y límites de plan.
- **Música con voces o sin licencia** → recomendación de pista instrumental, aviso de derechos y responsabilidad del cliente; la música se mezcla baja para no tapar la locución.
- **Nodos remotos** → el cambio toca `streaming/agent/*`; cada nodo requiere “Actualizar nodo”.
- **Complejidad de reglas** → empezar con tres tipos simples y validar combinaciones; el evaluador se prueba con reloj simulado.

## Migration Plan

1. Agregar modelos y APIs del panel; `prisma db push` en deploy.
2. Implementar UI y generación; feature apagada por defecto (sin reglas activas).
3. Implementar cola y scheduler del agente; publicar junto con el panel.
4. “Actualizar nodo” en cada nodo remoto; sin eso, las cápsulas no se emiten.
5. Rollback: desactivar/pausar cápsulas y vaciar la cola; las cápsulas informativas y el m3u existente no cambian.

## Open Questions

Ninguna que cambie el alcance. El largo exacto del resumen y la tolerancia por defecto se fijan en implementación (300 caracteres y 10 minutos), configurables por cápsula/cliente.
