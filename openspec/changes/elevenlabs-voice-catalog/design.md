# Design

## Context

Ver `proposal.md` — Why. `elevenLabsVoices` ya vive como JSON en `app_config` y `RadioStream.aiVoiceId` guarda la selección. Fish tiene un catálogo con `gender` y preview; ElevenLabs tiene catálogo sin género y un `<select>` sin muestras. El endpoint de preview actual solo soporta Fish.

## Goals / Non-Goals

**Goals:**

- Catálogo ElevenLabs con 4 femeninas + 4 masculinas.
- Misma experiencia de selección y preview que Fish.
- Compatibilidad con voces existentes sin género.

**Non-Goals:**

- Clonar voces nuevas desde el panel.
- Cambiar la estructura de base de datos.
- Eliminar Fish; queda como fallback.

## Decisions

### 1. Extender el JSON existente con `gender`

`elevenLabsVoices` pasa de `{ id, name, description? }` a `{ id, name, description?, gender? }`. No hay migración SQL. `parseVoiceCatalog` conserva entradas antiguas sin género para que el admin las clasifique.

### 2. Límite 4 + 4 en API y UI

La API valida máximo 4 femeninas y 4 masculinas. Las voces sin género no cuentan para esos límites, pero el admin debe clasificarlas para que aparezcan al cliente.

### 3. UI de admin por grupos

`ElevenLabsSettings` muestra dos secciones con botón “Agregar voz” y un contador `n/4`. Las voces antiguas sin género aparecen en “Sin clasificar” con un selector de género. Al guardar se envía el array completo.

### 4. UI de cliente compartida

`LocutorIaSettings` deja de usar un `<select>` para ElevenLabs y usa el mismo patrón de tarjetas que Fish: predeterminada, femeninas, masculinas, radio de selección y preview. Los controles de expresividad y preset de calidad se mantienen solo para ElevenLabs.

### 5. Preview por proveedor

El endpoint `voice-preview` consulta `getTtsProvider()`. Si es `elevenlabs`, valida el voice ID contra el catálogo y usa `synthesizeElevenLabs` con la configuración global y la calidad/estilo del cliente. Si es `fish`, conserva la lógica actual.

### 6. Activación en producción

Después del deploy se actualiza `app_config.ttsProvider = 'elevenlabs'` y se clasifican las cuatro voces existentes (George/Pedro masculinas, Fernanda/Isabela femeninas). El admin puede agregar las 4 restantes.

## Risks / Trade-offs

- [Voces antiguas sin género no aparecen al cliente] → Se muestran en “Sin clasificar” y se clasifican en la misma pantalla.
- [El preview ElevenLabs puede consumir cuota] → No llama a `consumeAiCharacters`; usa el mismo cache de TTS.
- [Cambiar proveedor afecta a todos los clientes] → Fish queda como fallback y la selección de voz se conserva por ID.
- [IDs de voz inválidos] → La API valida contra el catálogo y el preview devuelve 404 para una voz desconocida.

## Migration Plan

1. Deploy del panel.
2. Clasificar las 4 voces existentes en producción.
3. Activar `ttsProvider=elevenlabs`.
4. Verificar preview y locución con una voz femenina y una masculina.
