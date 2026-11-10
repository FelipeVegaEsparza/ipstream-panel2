# Proposal

## Why

Las radios necesitan publicar noticias con voz propia sin grabar manualmente cada cápsula. Hoy las cápsulas informativas existentes son audio subido o pregenerado y solo se programan cada N temas; no permiten partir de una noticia externa, ni generar intro/cuerpo/cierre, ni programar por horas, y no ofrecen preview ni control de colisiones. Una sección dedicada permite mantener el AutoDJ actualizado sin interrumpir la música y sin trabajo manual recurrente.

## What Changes

- Nueva sección **Cápsulas de Noticias** dentro del grupo Radio.
- Crear una cápsula desde una **fuente RSS/URL** (o texto de respaldo) y generar un resumen con IA.
- Generar la locución con el **Locutor IA** de la radio en tres partes: **intro, contenido y cierre**, unidas en un único audio reproducible.
- **Música de fondo opcional por cápsula**, elegida desde la misma biblioteca de música de los jingles (pistas globales del admin y pistas propias del cliente). El audio final mezcla la locución con la cama; cambiarla invalida la aprobación.
- **Preview obligatorio**: la cápsula se genera, se escucha y se edita/regenera antes de programarse.
- Programación por cápsula:
  - cada **X temas**,
  - **horas específicas** o **cada N horas**,
  - **ventana horaria y rango de fechas**,
  - zona horaria del cliente.
- El agente evalúa las reglas **al terminar cada tema**. Si la hora objetivo pasó mientras sonaba una canción, reproduce la cápsula al finalizar el tema dentro de una tolerancia configurable; si expira, la salta y registra el motivo.
- Frecuencia mínima/cooldown, prioridad y detección de colisiones con especiales, jingles y cápsulas informativas.
- Historial de emisiones y **próxima emisión** estimada.
- Estimación de cuota IA (intro + resumen + cierre) antes de generar.
- Reutiliza la infraestructura existente de `InfoCapsule`, TTS premium, cuotas y biblioteca de audio; no crea un motor de voz paralelo.

## Capabilities

### New Capabilities
- `radio/news-capsules`: creación, edición, preview, programación y emisión sin cortes de cápsulas de noticias generadas con IA en el AutoDJ.

### Modified Capabilities
- (ninguna)

## Impact

- **Base de datos**: nuevos modelos/campos para fuentes, guiones, segmentos de audio, música de fondo opcional, reglas de programación, ejecuciones y estado de aprobación.
- **Panel**: nueva página `/dashboard/streaming/news-capsules`, APIs CRUD/generación/preview, i18n y menú Radio.
- **Agente**: scheduler de noticias en tiempo de ejecución, integración con el generador de `.liq`/Liquidsoap y reporte de emisiones.
- **Dependencias**: parser RSS/XML y extracción de contenido de URLs.
- **IA**: consumo de caracteres del plan; cache de intro/cierre y del cuerpo por cápsula.
- **Operación**: no requiere cambios de infraestructura; sí requiere “Actualizar nodo” porque toca `streaming/agent/*`.
