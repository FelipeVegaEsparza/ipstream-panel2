# Cápsulas de Noticias

Sección de Radio para crear cápsulas locutadas con IA a partir de noticias RSS/URL, con intro, contenido, cierre, música de fondo opcional y programación por temas u horas. La emisión espera al final del tema actual y nunca corta la música.

## Flujo de usuario

1. **Nueva cápsula**: pegá una URL de RSS/Atom o de un artículo. Al pegar una URL el panel consulta la fuente y completa el título y el texto extraído; **Generar guion** crea la cápsula y la reinterpreta con IA.
2. Elegí una o más noticias encontradas o escribí el texto de respaldo.
3. **Generar guion**: se crea `intro`, `body`, `closing` y un resumen con atribución. Todo es editable.
4. **Música de fondo**: opcional, desde la misma biblioteca de jingles (globales del admin + pistas del cliente). “Sin música” es válido.
5. **Generar audio**: se sintetiza con el Locutor IA y se mezcla la música. El audio queda como un MP3 único.
6. **Escuchar** el audio (marca `previewedAt`) y **Aprobar**. Sin preview no se puede aprobar; sin aprobación no se puede programar.
7. **Programación**: cada X temas, horas específicas (`HH:mm`) y/o cada N horas, con ventana horaria, fechas, prioridad, frecuencia mínima y tolerancia.

Cualquier cambio de guion, texto o música invalida la aprobación y borra el audio anterior. Volver a aprobar exige generar y escuchar de nuevo.

## Ingesta de fuentes

- Se aceptan URLs `http`/`https` públicas. Se bloquean loopback, rangos privados, link-local y metadatos cloud.
- Límites: 8 s de timeout, 2 MB, 3 redirecciones.
- RSS 2.0 y Atom. Se normalizan título, fecha, GUID, medio, enlace y extracto.
- Para una URL de artículo se extrae título, medio, fecha y párrafos; el artículo completo no se persiste.
- Si la fuente falla, se conserva el texto manual.

## Datos y APIs

Modelos: `NewsCapsule`, `NewsCapsuleSource`, `NewsCapsuleRule`, `NewsCapsuleRun`. La música se referencia con `NewsCapsule.musicTrackId` (opcional).

| Método | Ruta | Uso |
|---|---|---|
| GET/POST | `/api/dashboard/streaming/news-capsules` | Listar / crear |
| GET/PATCH/DELETE | `/api/dashboard/streaming/news-capsules/:id` | Detalle / editar / eliminar (soft delete) |
| POST | `/api/dashboard/streaming/news-capsules/sources` | Consultar RSS/URL |
| POST | `.../:id/script` | Generar guion |
| POST | `.../:id/audio` | Generar audio |
| POST | `.../:id/preview` | Marcar preview escuchado |
| POST | `.../:id/approve` | Aprobar |
| PUT | `.../:id/rules` | Guardar programación |
| POST | `.../:id/pause` | Pausar / reactivar |
| GET | `.../:id/runs` | Historial |

## Cuota y cache

- El guion se genera con DeepSeek; no consume cuota de TTS.
- El audio usa `synthesizePremiumTts` y descuenta caracteres solo en cache miss.
- Intro/cierre se reutilizan por cliente; el cuerpo se cachea por texto/voz.
- Si la cuota no alcanza, la generación se bloquea antes de sintetizar.

## Emisión en el agente

El `.liq` expone:

```
news_queue = request.queue(id="news-queue")
... = fallback(track_sensitive=true, [news_queue, baseSource])
```

El agente evalúa reglas cada 15 s y empuja la cápsula a `news_queue`; `track_sensitive=true` espera el final del track. Si la tolerancia expira, retira la solicitud y registra `expired`. Si hay un DJ en vivo, no empuja. La cola tiene prioridad sobre jingles y cápsulas del m3u; una noticia por corte.

El audio se sube al agente en `data/radio/<clientId>/news-capsules/<capsuleId>.mp3`. **Tocar `streaming/agent/*` obliga a “Actualizar nodo” en cada nodo remoto.**

## Derechos y atribución

El resumen muestra el medio/URL de origen. La música de fondo es responsabilidad del cliente: CasterFly no licencia ni posee la música. Ver `/legal/licencias`.

## Rollback

Pausar las cápsulas (`/pause`) o vaciar la cola de noticias; las cápsulas informativas y el m3u existente no se modifican. El feature no altera la programación en curso.

## Pruebas

- `npx vitest run lib/news-capsules-*.test.ts components/dashboard/streaming/news-capsules`
- `cd streaming/agent && npm test`
- `npx tsc --noEmit && npm test && npm run build`
